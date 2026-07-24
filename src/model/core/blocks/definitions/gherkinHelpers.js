/**
 * gherkinHelpers.js — utility untuk block gherkinTemplate functions.
 *
 * gherkinText() menangani tiga format input (sama seperti resolveString di helpers.js)
 * tapi mengembalikan teks polos untuk disisipkan ke kalimat Given/When/Then,
 * bukan ekspresi JS.
 *
 * Untuk DataRef, teks yang disisipkan adalah nilai literal asli dari Data Manager
 * (mis. 'student', bukan 'ACCOUNT.valid.username') — Gherkin dibaca oleh
 * stakeholder non-teknis, jadi nama variabel/path tidak berguna bagi mereka.
 * Kalau DataRef menunjuk ke object (bukan primitif) atau tidak ditemukan di
 * dataEntries, fallback ke path sebagai penanda.
 */

/**
 * @param {any}   val         - nilai dari step.inputs[fieldName]
 * @param {Array} [dataEntries] - dataRegistry.entries, untuk resolve DataRef → nilai literal
 * @returns {string} teks polos siap disisipkan ke kalimat Gherkin
 */
export function gherkinText(val, dataEntries = []) {
  if (val === null || val === undefined || val === '') return ''

  // DataRef: { type: 'dataref', path: 'ACCOUNT.valid.username' }
  if (typeof val === 'object' && val.type === 'dataref') {
    const entry = dataEntries.find(e => e.path === val.path)
    if (entry && entry.type !== 'object') return String(entry.value)
    return val.path
  }

  // VarRef: { type: 'varref', varName: 'headerText' }
  if (typeof val === 'object' && val.type === 'varref') return val.varName

  return String(val)
}
