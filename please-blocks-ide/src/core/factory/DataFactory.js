/**
 * DataFactory.js
 * Pipeline: struktur files (multi-file) → flat DataRef entries.
 *
 * Mendukung banyak file data (main.js, users.js, products.js, dll.)
 * setiap file bisa punya banyak group (URL, ACCOUNT, PRODUCT, dll.)
 */

import { flattenAllFiles } from './flattenDataTree.js'

/**
 * Proses semua file data menjadi flat DataRef entries.
 *
 * @param {Object} files - { fileId: { filename, label, groups } }
 * @param {Object} env   - { BASE_URL: '...', ... }
 * @returns {Array} flat DataRef entries dengan fileId dan filePath
 */
export function processDataFiles(files, env = {}) {
  // Resolve env variable references dalam values sebelum flatten
  const resolvedFiles = {}
  for (const [fileId, fileDef] of Object.entries(files)) {
    resolvedFiles[fileId] = {
      ...fileDef,
      groups: resolveEnvRefs(fileDef.groups, env)
    }
  }
  return flattenAllFiles(resolvedFiles)
}

/**
 * Generate kode JS untuk satu file data.
 *
 * @param {Object} fileDef - { filename, label, groups }
 * @param {Object} env     - { BASE_URL: '...', ... }
 * @returns {string} kode data/xxx.js
 */
export function generateDataFile(fileDef, env = {}) {
  const lines = [
    `// data/${fileDef.filename}.js`,
    `// Auto-generated oleh Please Blocks IDE`,
    `require('dotenv').config()`,
    ``
  ]

  // Hanya include base_url jika ada URL group
  const hasUrl = Object.values(fileDef.groups).some(group =>
    Object.values(group).some(entry =>
      typeof entry === 'object' && 'url' in entry
    )
  )
  if (hasUrl) {
    lines.push(`const base_url = process.env.BASE_URL`, ``)
  }

  lines.push(`module.exports = {`)

  for (const [groupName, entries] of Object.entries(fileDef.groups)) {
    lines.push(`  ${groupName}: {`)
    for (const [entryName, fields] of Object.entries(entries)) {
      if (typeof fields === 'object' && fields !== null) {
        lines.push(`    ${entryName}: {`)
        for (const [fieldName, value] of Object.entries(fields)) {
          const val = formatFieldValue(fieldName, value, env)
          lines.push(`      ${fieldName}: ${val},`)
        }
        lines.push(`    },`)
      } else {
        const val = formatFieldValue(entryName, fields, env)
        lines.push(`    ${entryName}: ${val},`)
      }
    }
    lines.push(`  },`)
  }

  lines.push(`}`)
  return lines.join('\n')
}

/**
 * Generate semua file data sekaligus.
 * @returns {Object} { fileId: codeString }
 */
export function generateAllDataFiles(files, env = {}) {
  const result = {}
  for (const [fileId, fileDef] of Object.entries(files)) {
    result[fileId] = generateDataFile(fileDef, env)
  }
  return result
}

// ── Helpers ──────────────────────────────────────────────────────

/**
 * Resolve referensi env variable dalam data values.
 * Contoh: '$BASE_URL/login' → 'https://practicetestautomation.com/login'
 */
function resolveEnvRefs(obj, env) {
  if (typeof obj === 'string') {
    return obj.replace(/\$([A-Z_]+)/g, (_, k) => env[k] ?? `$${k}`)
  }
  if (obj === null || typeof obj !== 'object') return obj
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    out[k] = resolveEnvRefs(v, env)
  }
  return out
}

function formatFieldValue(fieldName, value, env) {
  if (typeof value === 'string' && value.startsWith('process.env.')) return value
  if (fieldName === 'url' && typeof value === 'string') {
    const base  = env.BASE_URL || ''
    const path  = base ? value.replace(base, '') : value
    return path !== value ? `\`\${base_url}${path}\`` : `'${value}'`
  }
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return String(value)
  return `'${String(value).replace(/'/g, "\\'")}'`
}
