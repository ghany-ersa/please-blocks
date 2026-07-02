// Definisi blok kategori Navigation
// Mapping ke: please.goto(url, title?), please.newTab(), please.closeTab()

import { resolveValue } from './helpers.js'

const NAV = { type: 'navigation', color: '#6366f1', colorBg: 'rgba(99,102,241,0.1)', output: null }

export default [
  {
    ...NAV,
    id:          'nav.goto',
    label:       'Go To',
    icon:        '🧭',
    description: 'Buka URL + opsional assert title halaman',
    inputs: [
      {
        name:        'url',
        type:        'value',
        label:       'URL',
        placeholder: 'PAGE.login.url',
        required:    true
      },
      {
        name:        'title',
        type:        'value',
        label:       'Title (opsional)',
        placeholder: 'PAGE.login.title',
        required:    false
      }
    ],
    codegen(inputs) {
      const args = [resolveValue(inputs.url)]
      if (inputs.title) args.push(resolveValue(inputs.title))
      return `await please.goto(${args.join(', ')})`
    },
    validate(inputs) {
      if (!inputs.url) return 'URL wajib diisi'
      return null
    }
  },

  {
    ...NAV,
    id:          'nav.newTab',
    label:       'New Tab',
    icon:        '🪟',
    description: 'Buka tab baru, simpan referensinya ke variabel',
    output:      'tab',
    inputs: [
      { name: 'varName', type: 'text', label: 'Simpan ke variabel', placeholder: 'tab2', required: true }
    ],
    codegen(inputs) {
      const v = inputs.varName || 'tab'
      return `const ${v} = await please.newTab()`
    },
    validate(inputs) {
      if (!inputs.varName) return 'Nama variabel wajib diisi'
      return null
    }
  },

  {
    ...NAV,
    id:          'nav.closeTab',
    label:       'Close Tab',
    icon:        '✖️',
    description: 'Tutup tab tertentu',
    inputs: [
      { name: 'tab', type: 'varref', label: 'Variabel tab', placeholder: '$tab2', required: true }
    ],
    codegen(inputs) {
      const ref = inputs.tab && typeof inputs.tab === 'object' && inputs.tab.type === 'varref'
        ? inputs.tab.varName
        : inputs.tab || 'tab'
      return `await please.closeTab(${ref})`
    },
    validate(inputs) {
      if (!inputs.tab) return 'Variabel tab wajib diisi'
      return null
    }
  }
]
