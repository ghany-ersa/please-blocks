/**
 * dataResolver.js
 * Mengubah nilai input dari canvas node menjadi ekspresi JavaScript yang valid.
 *
 * Empat jenis input yang mungkin datang dari canvas:
 *   dataref  → { type: 'dataref', path: 'ACCOUNT.valid' }  → 'ACCOUNT.valid'
 *   varref   → { type: 'varref',  varName: 'headerText' }  → 'headerText'
 *   inline   → 'some string' / 42                           → "'some string'" / 42
 *   selector → '#submit' / '//div'                          → "'#submit'"
 */

/**
 * Resolve satu nilai input menjadi string ekspresi JS.
 * @param {any} value - nilai dari step.inputs[fieldName]
 * @param {'text'|'selector'|'value'|'number'|'dataref'|'varref'} inputType
 * @returns {string} ekspresi JS yang siap ditulis ke kode
 */
export function resolveInput(value, inputType = 'text') {
  // Null / undefined → string kosong
  if (value === null || value === undefined || value === '') {
    return inputType === 'number' ? '0' : "''"
  }

  // DataRef object { type: 'dataref', path: 'URL.login' }
  if (value && typeof value === 'object' && value.type === 'dataref') {
    return value.path // langsung sebagai JS identifier: URL.login
  }

  // VarRef object { type: 'varref', varName: 'headerText' }
  if (value && typeof value === 'object' && value.type === 'varref') {
    return value.varName
  }

  // Number literal — tanpa quotes
  if (inputType === 'number') {
    const n = Number(value)
    return isNaN(n) ? '0' : String(n)
  }

  // Semua tipe lain (text, selector, value) → string literal dengan escape minimal
  const escaped = String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
  return `'${escaped}'`
}

/**
 * Dari satu feature, kumpulkan semua grup DataRef yang dipakai
 * agar specGenerator bisa generate baris require() yang benar.
 * Contoh hasil: ['URL', 'ACCOUNT']
 */
export function collectDataGroups(feature) {
  const groups = new Set()
  for (const tc of feature.testCases) {
    for (const step of tc.steps) {
      for (const val of Object.values(step.inputs || {})) {
        if (val && typeof val === 'object' && val.type === 'dataref') {
          groups.add(val.path.split('.')[0])
        }
      }
    }
  }
  return [...groups]
}

/**
 * Dari satu feature, kumpulkan semua nama component yang dipakai (AUTH, CHECKOUT, dll.)
 * berdasarkan block type === 'component'.
 */
export function collectComponents(feature, blockRegistry) {
  const comps = new Set()
  for (const tc of feature.testCases) {
    for (const step of tc.steps) {
      const block = blockRegistry.getById(step.blockId)
      if (block?.type === 'component') {
        // 'comp.auth.login' → ambil bagian kedua → 'auth' → uppercase 'AUTH'
        const parts = block.id.split('.')
        if (parts[1]) comps.add(parts[1].toUpperCase())
      }
    }
  }
  return [...comps]
}
