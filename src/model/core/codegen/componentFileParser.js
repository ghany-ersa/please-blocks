/**
 * componentFileParser.js — Reverse Codegen (components/*.js)
 *
 * Kebalikan dari ComponentFactory.generateComponentFile(). Parse
 * `function X(please) { return { async method(params){...} } }` via AST
 * menjadi component def: { name, exportName, methods: [{ name, params, steps }] }.
 * Bentuk class lama (`class X { constructor(please){...} async method(){...} }`)
 * tetap didukung untuk kompatibilitas mundur saat mengimpor file lama.
 *
 * Body method diparse memakai statementParser bersama (sama vocabulary dengan
 * body it()): please.*, seeText, getText/getValue, component call, rawCode.
 */

import {
  parseModule,
  parseBodyStatements,
  buildComponentIndex,
  indexLeadingComments,
  mapArgNInputs
} from './statementParser.js'

/**
 * @param {string} source
 * @param {Object} [opts]
 * @param {Object} [opts.blockRegistry]  - resolve nested component call
 * @param {Map}    [opts.componentIndex] - override index (preview)
 * @returns {{ component: Object|null, warnings: string[] }}
 */
export function parseComponentFile(source, { blockRegistry = null, componentIndex = null } = {}) {
  const warnings = []
  let ast
  try {
    ast = parseModule(source)
  } catch (err) {
    return { component: null, warnings: [`Gagal parse component: ${err.message}`] }
  }

  const classes = ast.program.body.filter(n => n.type === 'ClassDeclaration')
  const functions = ast.program.body.filter(n => n.type === 'FunctionDeclaration')

  if (classes.length) {
    if (classes.length > 1) {
      warnings.push(`Ditemukan ${classes.length} class — hanya class pertama yang diimpor.`)
    }
    return parseClassComponent(classes[0], { warnings, blockRegistry, componentIndex, source, ast })
  }

  if (functions.length) {
    if (functions.length > 1) {
      warnings.push(`Ditemukan ${functions.length} function — hanya function pertama yang diimpor.`)
    }
    const parsed = parseFunctionComponent(functions[0], { warnings, blockRegistry, componentIndex, source, ast })
    if (parsed) return { component: parsed, warnings }
    return { component: null, warnings: [...warnings, 'Tidak ada class atau function component di file component.'] }
  }

  return { component: null, warnings: ['Tidak ada class atau function component di file component.'] }
}

function parseClassComponent(classNode, { warnings, blockRegistry, componentIndex, source, ast }) {
  const name = classNode.id?.name || 'Component'
  const exportName = name.toUpperCase()

  const ctx = {
    warnings,
    commentsByLine: indexLeadingComments(ast?.comments || []),
    componentIndex: componentIndex || (blockRegistry ? buildComponentIndex(blockRegistry) : new Map()),
    selfPrefix: `comp.${name.toLowerCase()}`,   // resolusi this.method() → component ini
    source
  }

  const methods = []
  for (const member of classNode.body.body) {
    if (member.type !== 'ClassMethod') continue
    if (member.kind === 'constructor') continue
    const methodName = member.key?.name || member.key?.value
    if (!methodName) continue
    if (methodName === '_bind') continue   // wiring nested component, bukan method user

    const params = (member.params || []).map(p => paramName(p, warnings))
    const body = member.body?.type === 'BlockStatement' ? member.body.body : []
    let steps = parseBodyStatements(body, { ...ctx, scopeVars: new Set() })
    if (blockRegistry) {
      steps = steps.map(s => ({ ...s, inputs: mapArgNInputs(s, blockRegistry) }))
    }

    methods.push({ name: methodName, params, steps })
  }

  return { component: { name, exportName, methods }, warnings }
}

/**
 * Parse `function X(please) { return { async method(){...} } }`.
 * Method-nya adalah ObjectMethod di dalam ReturnStatement pertama pada body function.
 */
function parseFunctionComponent(fnNode, { warnings, blockRegistry, componentIndex, source, ast }) {
  const name = fnNode.id?.name || 'Component'
  const exportName = name.toUpperCase()

  const fnBody = fnNode.body?.type === 'BlockStatement' ? fnNode.body.body : []
  const returnStmt = fnBody.find(n => n.type === 'ReturnStatement')
  const objExpr = returnStmt?.argument
  if (!objExpr || objExpr.type !== 'ObjectExpression') return null

  const selfMethodNames = new Set(
    objExpr.properties
      .filter(p => p.type === 'ObjectMethod')
      .map(p => p.key?.name || p.key?.value)
      .filter(Boolean)
  )

  const ctx = {
    warnings,
    commentsByLine: indexLeadingComments(ast?.comments || []),
    componentIndex: componentIndex || (blockRegistry ? buildComponentIndex(blockRegistry) : new Map()),
    selfPrefix: `comp.${name.toLowerCase()}`,   // resolusi method sekelas dipanggil langsung
    selfMethodNames,
    source
  }

  const methods = []
  for (const prop of objExpr.properties) {
    if (prop.type !== 'ObjectMethod') continue
    const methodName = prop.key?.name || prop.key?.value
    if (!methodName) continue

    const params = (prop.params || []).map(p => paramName(p, warnings))
    const body = prop.body?.type === 'BlockStatement' ? prop.body.body : []
    let steps = parseBodyStatements(body, { ...ctx, scopeVars: new Set() })
    if (blockRegistry) {
      steps = steps.map(s => ({ ...s, inputs: mapArgNInputs(s, blockRegistry) }))
    }

    methods.push({ name: methodName, params, steps })
  }

  return { name, exportName, methods }
}

/** Ambil nama parameter dari berbagai bentuk (Identifier, default, rest). */
function paramName(p, warnings) {
  if (p.type === 'Identifier') return p.name
  if (p.type === 'AssignmentPattern' && p.left?.type === 'Identifier') return p.left.name
  if (p.type === 'RestElement' && p.argument?.type === 'Identifier') return p.argument.name
  warnings.push(`Parameter bertipe ${p.type} tidak dikenali, dilewati.`)
  return p.name || '_param'
}
