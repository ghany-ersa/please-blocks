// Definisi blok kategori Navigation
// Mapping ke: please.goto(url, title?), please.verifyPage(url, title?)

import { resolveValue } from './helpers.js'

export default [
  {
    id:          'nav.goto',
    type:        'navigation',
    label:       'Go To',
    icon:        '🧭',
    color:       '#6366f1',
    colorBg:     'rgba(99,102,241,0.1)',
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
    output: null,
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
    id:          'nav.verifyPage',
    type:        'navigation',
    label:       'Verify Page',
    icon:        '📍',
    color:       '#6366f1',
    colorBg:     'rgba(99,102,241,0.1)',
    description: 'Assert URL dan/atau title halaman saat ini setelah redirect/navigasi',
    inputs: [
      {
        name:        'url',
        type:        'value',
        label:       'URL (opsional)',
        placeholder: 'PAGE.dashboard.url',
        required:    false
      },
      {
        name:        'title',
        type:        'value',
        label:       'Title (opsional)',
        placeholder: 'PAGE.dashboard.title',
        required:    false
      }
    ],
    output: null,
    codegen(inputs) {
      const args = [inputs.url ? resolveValue(inputs.url) : "''"]
      if (inputs.title) args.push(resolveValue(inputs.title))
      return `await please.verifyPage(${args.join(', ')})`
    },
    validate(inputs) {
      if (!inputs.url && !inputs.title) return 'URL atau title wajib diisi salah satu'
      return null
    }
  }
]
