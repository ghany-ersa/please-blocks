/**
 * specGenerator.js
 * Canvas state (Feature) → kode JS spec Playwright yang valid.
 *
 * Contoh output:
 *
 *   const { test, expect } = require('@playwright/test')
 *   const { createApp }    = require('../app')
 *   const { URL, ACCOUNT } = require('../data/main')
 *
 *   test.describe('Login Flow', () => {
 *     test('login berhasil', async ({ page }) => {
 *       const { please, AUTH } = createApp(page)
 *       await please.goto(URL.login)
 *       await AUTH.login(ACCOUNT.valid)
 *     })
 *   })
 */

import { collectImportsPerFile, collectComponents } from './dataResolver.js'

/**
 * Generate kode spec lengkap untuk satu Feature.
 *
 * @param {Object} feature       - feature dari canvasStore
 * @param {Object} blockRegistry - instance Pinia blockRegistry store
 * @param {Array}  dataEntries   - dataRegistry.entries (dengan fileId + filePath)
 * @returns {string}
 */
export function generateSpec(feature, blockRegistry, dataEntries = []) {
  if (!feature) return '// Pilih sebuah Feature di canvas'

  const components  = collectComponents(feature, blockRegistry)
  const importsMap  = collectImportsPerFile(feature, dataEntries)

  const lines = []

  // Playwright imports
  lines.push(`const { test, expect } = require('@playwright/test')`)
  lines.push(`const { createApp }    = require('../app')`)

  // Import data — satu baris per file yang dipakai
  for (const { filePath, groups } of Object.values(importsMap)) {
    const requirePath = `../${filePath.replace(/\.js$/, '')}`
    lines.push(`const { ${groups.join(', ')} } = require('${requirePath}')`)
  }

  const describeFn = feature.enabled !== false ? 'test.describe' : 'test.describe.skip'
  lines.push('', `${describeFn}('${feature.label}', () => {`)

  // Test cases
  const testCaseBlocks = feature.testCases.map(tc =>
    generateTestCase(tc, blockRegistry, components)
  )

  if (!testCaseBlocks.length) {
    lines.push('    // Belum ada test case')
  } else {
    lines.push(...testCaseBlocks)
  }

  lines.push('})')
  return lines.join('\n')
}

/**
 * Generate blok test() dari satu TestCase.
 */
function generateTestCase(tc, blockRegistry, components) {
  const stepLines = tc.steps.map(step => generateStep(step, blockRegistry))
  const indent = (block) => block.split('\n').map(l => `        ${l}`).join('\n')

  // createApp destructure: { please, AUTH, ... }
  const appVars = ['please', ...components].join(', ')
  const createAppLine = `        const { ${appVars} } = createApp(page, test)`

  const body = stepLines.length
    ? [createAppLine, ...stepLines.map(indent)].join('\n')
    : `${createAppLine}\n        // Belum ada step`

  const testFn = tc.enabled !== false ? 'test' : 'test.skip'

  return [
    '',
    `    ${testFn}('${tc.label}', async ({ page }) => {`,
    body,
    `    })`
  ].join('\n')
}

/**
 * Generate satu baris kode dari satu Step.
 */
function generateStep(step, blockRegistry) {
  const block = blockRegistry.getById(step.blockId)
  if (!block) return `// [!] Block tidak ditemukan: ${step.blockId}`

  let code
  try {
    code = block.codegen(step.inputs || {})
  } catch (err) {
    return `// [!] Error pada '${step.blockId}': ${err.message}`
  }

  return withNote(step.note, code)
}

/**
 * Prepend catatan QA sebagai komentar di atas baris kode.
 */
function withNote(note, code) {
  const text = note?.trim()
  if (!text) return code
  const comment = text.split('\n').map(line => `// ${line.trim()}`).join('\n')
  return `${comment}\n${code}`
}

