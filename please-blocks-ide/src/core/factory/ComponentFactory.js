/**
 * ComponentFactory.js
 * Mengubah definisi component (dari componentStore) menjadi block definitions
 * yang siap didaftarkan ke blockRegistry.
 *
 * Setiap method dalam satu component → satu block definition.
 *
 * Contoh input (component def):
 *   {
 *     id: 'comp-auth',
 *     name: 'Auth',
 *     exportName: 'AUTH',
 *     methods: [
 *       { name: 'login',  params: ['user'], steps: [...] },
 *       { name: 'logout', params: [],       steps: [...] }
 *     ]
 *   }
 *
 * Output (block definitions):
 *   [
 *     { id: 'comp.auth.login',  type: 'component', label: 'AUTH.login',  inputs: [...], codegen: fn },
 *     { id: 'comp.auth.logout', type: 'component', label: 'AUTH.logout', inputs: [],    codegen: fn }
 *   ]
 */

/**
 * Buat block definitions dari satu component definition.
 * @param {Object} compDef - component definition dari componentStore
 * @returns {Array} array of block definition objects
 */
export function buildComponentBlocks(compDef) {
  return compDef.methods.map(method =>
    buildMethodBlock(compDef, method)
  )
}

/**
 * Buat satu block definition dari satu method.
 */
function buildMethodBlock(compDef, method) {
  const compKey  = compDef.name.toLowerCase()
  const blockId  = `comp.${compKey}.${method.name}`
  const label    = `${compDef.exportName}.${method.name}`

  // Inputs: satu input per parameter method
  const inputs = method.params.map(paramName => ({
    name:        paramName,
    type:        guessInputType(paramName),
    label:       formatParamLabel(paramName),
    placeholder: guessPlaceholder(paramName, compDef),
    required:    true
  }))

  return {
    id:          blockId,
    type:        'component',
    label,
    icon:        '📦',
    color:       '#ec4899',
    colorBg:     'rgba(236,72,153,0.1)',
    description: `Jalankan ${label}()`,
    componentId: compDef.id,
    methodName:  method.name,
    inputs,
    output:      null,

    codegen(inp) {
      const args = method.params
        .map(p => {
          const val = inp[p]
          if (!val && val !== 0) return p
          if (typeof val === 'object' && val.type === 'dataref') return val.path
          if (typeof val === 'object' && val.type === 'varref')  return val.varName
          return `'${val}'`
        })
        .join(', ')
      return `await ${compDef.exportName}.${method.name}(${args})`
    },

    validate(inp) {
      for (const inputDef of inputs) {
        if (inputDef.required && !inp[inputDef.name] && inp[inputDef.name] !== 0) {
          return `${inputDef.label} wajib diisi`
        }
      }
      return null
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────

function guessInputType(paramName) {
  const lower = paramName.toLowerCase()
  if (lower === 'user' || lower === 'account' || lower === 'data' || lower === 'payload') {
    return 'dataref'
  }
  if (lower === 'url' || lower === 'page') return 'dataref'
  return 'value'
}

function formatParamLabel(paramName) {
  return paramName.charAt(0).toUpperCase() + paramName.slice(1).replace(/([A-Z])/g, ' $1')
}

function guessPlaceholder(paramName, compDef) {
  const lower = paramName.toLowerCase()
  if (lower === 'user' || lower === 'account')  return 'ACCOUNT.valid'
  if (lower === 'url'  || lower === 'page')     return 'URL.login'
  if (lower === 'data' || lower === 'payload')  return 'DATA.entry'
  return `${compDef.exportName.toLowerCase()}.${paramName}`
}

/**
 * Generate kode file components/[name].js dari satu component definition.
 * Dipakai oleh Code Generator (Sprint 5).
 */
export function generateComponentFile(compDef) {
  const lines = [
    `let please`,
    ``,
    `class ${compDef.name} {`,
    `  constructor(master) {`,
    `    please = master`,
    `  }`,
  ]

  for (const method of compDef.methods) {
    const params = method.params.join(', ')
    lines.push(``, `  async ${method.name}(${params}) {`)

    // Generate steps
    // (steps adalah array {blockId, inputs} — akan di-resolve oleh specGenerator)
    if (method.steps?.length) {
      lines.push(`    // ${method.steps.length} step(s)`)
      lines.push(`    // (Implementasi di-generate dari Component Builder)`)
    } else {
      lines.push(`    // Belum ada step`)
    }

    lines.push(`  }`)
  }

  lines.push(`}`, ``, `module.exports = ${compDef.name}`)
  return lines.join('\n')
}
