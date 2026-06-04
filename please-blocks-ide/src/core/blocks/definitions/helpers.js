/**
 * helpers.js — utility untuk block codegen functions.
 *
 * resolveValue() menangani tiga format input 'value':
 *   1. Plain string/number  → "'some text'"  atau  42
 *   2. DataRef object       → 'ACCOUNT.valid.username'  (JS identifier)
 *   3. VarRef object        → 'headerText'              (canvas variable)
 */

/**
 * @param {any} val - nilai dari step.inputs[fieldName]
 * @returns {string} ekspresi JS siap tulis ke kode
 */
export function resolveValue(val) {
  if (val === null || val === undefined || val === '') return "''"

  // DataRef: { type: 'dataref', path: 'ACCOUNT.valid.username' }
  if (typeof val === 'object' && val.type === 'dataref') {
    return val.path
  }

  // VarRef: { type: 'varref', varName: 'headerText' }
  if (typeof val === 'object' && val.type === 'varref') {
    return val.varName
  }

  // Number literal — tanpa quotes
  if (typeof val === 'number') return String(val)

  // String biasa — wrap dengan single quotes + escape
  const escaped = String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  return `'${escaped}'`
}
