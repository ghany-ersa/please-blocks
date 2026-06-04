/**
 * DataFactory.js
 * Pipeline: raw data groups → flat DataRef entries → register ke dataRegistry store.
 *
 * Di Sprint 3, data bersumber dari Pinia store (dataRegistry.groups).
 * Di Sprint 5+, akan diganti dengan file reader (chokidar + require() dari data/main.js).
 */

import { flattenDataTree } from './flattenDataTree.js'

/**
 * Proses satu set data groups menjadi array DataRef entries.
 * @param {Object} groups - { URL: { login: {...} }, ACCOUNT: { valid: {...} }, ... }
 * @param {Object} env    - { BASE_URL: 'https://...', ... }
 * @returns {Array} flat DataRef entries
 */
export function processDataGroups(groups, env = {}) {
  const resolvedGroups = resolveEnvRefs(groups, env)
  return flattenDataTree(resolvedGroups)
}

/**
 * Resolve referensi env variable dalam data values.
 * Contoh: value '$BASE_URL/login' → 'https://practicetestautomation.com/login'
 */
function resolveEnvRefs(obj, env) {
  if (typeof obj === 'string') {
    return obj.replace(/\$([A-Z_]+)/g, (_, key) => env[key] || `$${key}`)
  }
  if (obj === null || typeof obj !== 'object') return obj

  const resolved = {}
  for (const [k, v] of Object.entries(obj)) {
    resolved[k] = resolveEnvRefs(v, env)
  }
  return resolved
}

/**
 * Generate kode data/main.js dari groups + env.
 * Dipakai oleh Code Generator (Sprint 4).
 */
export function generateDataFile(groups, env = {}) {
  const lines = [
    `require('dotenv').config()`,
    ``,
    `const base_url = process.env.BASE_URL`,
    ``,
    `module.exports = {`
  ]

  for (const [groupName, entries] of Object.entries(groups)) {
    lines.push(`  ${groupName}: {`)
    for (const [entryName, fields] of Object.entries(entries)) {
      lines.push(`    ${entryName}: {`)
      for (const [fieldName, fieldValue] of Object.entries(fields)) {
        const val = formatFieldValue(fieldName, fieldValue, env)
        lines.push(`      ${fieldName}: ${val},`)
      }
      lines.push(`    },`)
    }
    lines.push(`  },`)
  }

  lines.push(`}`)
  return lines.join('\n')
}

function formatFieldValue(fieldName, value, env) {
  // URL field → gunakan template literal dengan base_url
  if (fieldName === 'url' && typeof value === 'string') {
    const baseUrl = env.BASE_URL || 'https://example.com'
    const path = value.replace(baseUrl, '').replace(/^https?:\/\/[^/]+/, '')
    return path ? `\`\${base_url}${path}\`` : `\`\${base_url}\``
  }
  // Env var reference
  if (typeof value === 'string' && value.startsWith('process.env.')) {
    return value
  }
  return `'${value}'`
}
