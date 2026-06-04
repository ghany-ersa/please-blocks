/**
 * flattenDataTree.js
 * Ubah nested data object menjadi array path datar (flat).
 *
 * Input:
 *   { URL: { login: { url: '...', title: '...' } }, ACCOUNT: { valid: { username: '...' } } }
 *
 * Output:
 *   [
 *     { path: 'URL',                 type: 'object', group: 'URL',     value: {...} },
 *     { path: 'URL.login',           type: 'object', group: 'URL',     value: { url, title } },
 *     { path: 'URL.login.url',       type: 'string', group: 'URL',     value: 'https://...' },
 *     { path: 'URL.login.title',     type: 'string', group: 'URL',     value: 'Test Login...' },
 *     { path: 'ACCOUNT',             type: 'object', group: 'ACCOUNT', value: {...} },
 *     { path: 'ACCOUNT.valid',       type: 'object', group: 'ACCOUNT', value: { username, password } },
 *     { path: 'ACCOUNT.valid.username', type: 'string', group: 'ACCOUNT', value: 'student' },
 *     ...
 *   ]
 */

/**
 * @param {Object} obj   - data object mentah
 * @param {string} prefix - prefix path saat ini (rekursif)
 * @param {string} group  - nama group level pertama (URL, ACCOUNT, dll)
 * @param {Array}  result - akumulator hasil
 */
export function flattenDataTree(obj, prefix = '', group = '', result = []) {
  for (const [key, value] of Object.entries(obj)) {
    const path     = prefix ? `${prefix}.${key}` : key
    const rootGroup = group || key
    const isObj    = value !== null && typeof value === 'object' && !Array.isArray(value)
    const type     = isObj ? 'object' : typeof value

    result.push({
      path,
      type,
      group: rootGroup,
      value,
      label: path,
      icon:  isObj ? '📦' : '📝',
      compatibleWith: resolveCompatibility(type)
    })

    if (isObj) {
      flattenDataTree(value, path, rootGroup, result)
    }
  }
  return result
}

/**
 * Tentukan tipe input mana yang kompatibel dengan DataRef entry ini.
 * - 'object' → cocok untuk input dataref (dilempar sebagai satu objek ke component method)
 * - 'string' | 'number' → cocok untuk value, text, selector
 */
function resolveCompatibility(type) {
  if (type === 'object') return ['dataref']
  return ['value', 'text', 'selector', 'dataref']
}
