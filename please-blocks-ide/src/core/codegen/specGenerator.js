/**
 * specGenerator.js
 * Mengubah satu Feature dari canvas state menjadi string kode JS
 * yang valid dan siap dijalankan oleh mocha + please-test.
 *
 * Output contoh:
 *   // feature/login.spec.js
 *   const { please, AUTH } = require('../app')
 *   const { URL, ACCOUNT }  = require('../data/main')
 *
 *   describe('Login', () => {
 *     it('login berhasil', async () => {
 *       await please.goTo(URL.login)
 *       await AUTH.login(ACCOUNT.valid)
 *       ...
 *     })
 *   })
 */

import { collectDataGroups, collectComponents } from './dataResolver.js'

/**
 * Generate kode spec untuk satu Feature.
 * @param {Object} feature     - feature object dari canvasStore
 * @param {Object} blockRegistry - instance Pinia blockRegistry store
 * @returns {string}           - kode JS lengkap sebagai string
 */
export function generateSpec(feature, blockRegistry) {
  if (!feature) return '// Pilih sebuah Feature di canvas'

  const dataGroups = collectDataGroups(feature)
  const components = collectComponents(feature, blockRegistry)

  // ── Baris import ──────────────────────────────────────────────
  const compList = ['please', ...components].join(', ')
  const lines = [
    `// feature/${slugify(feature.label)}.spec.js`,
    `// Auto-generated oleh Please Blocks IDE`,
    `// Jangan edit manual — ubah melalui canvas`,
    '',
    `const { ${compList} } = require('../app')`,
  ]

  if (dataGroups.length) {
    lines.push(`const { ${dataGroups.join(', ')} } = require('../data/main')`)
  }

  lines.push('', `describe('${feature.label}', () => {`)

  // ── Test cases ────────────────────────────────────────────────
  const testCaseBlocks = feature.testCases.map(tc =>
    generateTestCase(tc, blockRegistry)
  )

  if (testCaseBlocks.length === 0) {
    lines.push('  // Belum ada test case')
  } else {
    lines.push(...testCaseBlocks)
  }

  lines.push('})')

  return lines.join('\n')
}

/**
 * Generate satu blok it() dari sebuah TestCase.
 */
function generateTestCase(tc, blockRegistry) {
  const stepLines = tc.steps.map(step =>
    generateStep(step, blockRegistry)
  )

  const body = stepLines.length
    ? stepLines.map(l => `    ${l}`).join('\n')
    : '    // Belum ada step'

  return [
    '',
    `  it('${tc.label}', async () => {`,
    body,
    `  })`,
  ].join('\n')
}

/**
 * Generate satu baris kode dari sebuah Step.
 */
function generateStep(step, blockRegistry) {
  const block = blockRegistry.getById(step.blockId)

  if (!block) {
    return `// [!] Block tidak ditemukan: ${step.blockId}`
  }

  try {
    return block.codegen(step.inputs || {})
  } catch (err) {
    return `// [!] Error generate '${step.blockId}': ${err.message}`
  }
}

/**
 * Generate semua features sekaligus (untuk index.js preview).
 */
export function generateIndex(features) {
  if (!features.length) return '// Belum ada feature'
  return [
    '// index.js — aktifkan atau nonaktifkan spec yang ingin dijalankan',
    '',
    ...features.map(f => `require('./feature/${slugify(f.label)}.spec')`),
  ].join('\n')
}

// ── Helper ────────────────────────────────────────────────────────

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || 'feature'
}
