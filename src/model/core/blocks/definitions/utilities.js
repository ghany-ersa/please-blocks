// Definisi blok kategori Utilities
// Mapping ke: please.wait(), untilShow(), screenshot(), switchTab(), acceptDialog(), dismissDialog()

import { gherkinText } from './gherkinHelpers.js'

const UTIL = { type: 'utility', color: '#6b7280', colorBg: 'rgba(107,114,128,0.1)', output: null }

export default [
  {
    ...UTIL,
    id: 'util.wait',
    label: 'Wait',
    icon: '⏳',
    description: 'Tunggu selama N detik',
    inputs: [
      {
        name: 'duration',
        type: 'number',
        label: 'Durasi (s)',
        placeholder: '2',
        required: false
      }
    ],
    codegen(inputs) {
      // duration disimpan dalam detik (UI) — please.wait() butuh ms
      return inputs.duration
        ? `await please.wait(${inputs.duration * 1000})`
        : `await please.wait()`
    },
    gherkinTemplate(inputs) {
      if (!inputs.duration) return 'the user waits'
      return `the user waits for ${inputs.duration} second${inputs.duration === 1 ? '' : 's'}`
    },
    validate(_inputs) {
      return null
    }
  },
  
  {
    ...UTIL,
    id: 'util.untilShow',
    label: 'Until Show',
    icon: '👁️',
    description: 'Tunggu elemen muncul di halaman (default 20 detik)',
    inputs: [
      { name: 'label', type: 'text', label: 'Label', placeholder: 'loading spinner', required: true },
      { name: 'selector', type: 'selector', label: 'Selector', placeholder: 'role=progressbar', required: true },
      { name: 'time', type: 'number', label: 'Timeout (s)', placeholder: '20', required: false }
    ],
    codegen(inputs) {
      // time disimpan dalam detik (UI) — please.untilShow() butuh ms
      const label = inputs.label ? `'${inputs.label}'` : "'elemen'"
      const selector = inputs.selector ? `'${inputs.selector}'` : "''"
      return inputs.time
        ? `await please.untilShow(${label}, ${selector}, ${inputs.time * 1000})`
        : `await please.untilShow(${label}, ${selector})`
    },
    gherkinTemplate(inputs, dataEntries) {
      return `the user waits for "${gherkinText(inputs.label, dataEntries)}" to appear`
    },
    validate(inputs) {
      if (!inputs.selector) return 'Selector wajib diisi'
      return null
    }
  },

  {
    id: 'util.rawCode',
    type: 'utility',
    label: 'Raw Code',
    icon: '📝',
    color: '#6b7280',
    colorBg: 'rgba(107,114,128,0.1)',
    description: 'Baris kode JS mentah hasil import .spec.js yang belum dipetakan ke blok',
    inputs: [
      {
        name: 'code',
        type: 'text',
        label: 'Kode',
        placeholder: 'await please.customMethod()',
        required: true
      }
    ],
    output: null,
    codegen(inputs) {
      return inputs.code || '// (kode kosong)'
    },
    validate(inputs) {
      return inputs.code ? null : 'Kode tidak boleh kosong'
    }
  },

  {
    ...UTIL,
    id: 'util.screenshot',
    label: 'Screenshot',
    icon: '📸',
    description: 'Ambil screenshot, simpan ke folder screenshots/',
    inputs: [
      { name: 'label', type: 'text', label: 'Label (opsional)', placeholder: 'halaman login', required: false }
    ],
    codegen(inputs) {
      return inputs.label
        ? `await please.screenshot('${inputs.label}')`
        : `await please.screenshot()`
    },
    gherkinTemplate() {
      return 'a screenshot is captured'
    },
    validate(_inputs) { return null }
  },
  /*
    {
      ...UTIL,
      id: 'util.switchTab',
      label: 'Switch Tab',
      icon: '🔀',
      description: 'Pindah active page ke tab tertentu',
      inputs: [
        { name: 'tab', type: 'varref', label: 'Variabel tab', placeholder: '$tab2', required: true }
      ],
      codegen(inputs) {
        const ref = inputs.tab && typeof inputs.tab === 'object' && inputs.tab.type === 'varref'
          ? inputs.tab.varName
          : inputs.tab || 'tab'
        return `await please.switchTab(${ref})`
      },
      validate(inputs) {
        if (!inputs.tab) return 'Variabel tab wajib diisi'
        return null
      }
    },

    {
      ...UTIL,
      id: 'util.acceptDialog',
      label: 'Accept Dialog',
      icon: '✅',
      description: 'Accept alert/confirm/prompt berikutnya; isi teks untuk prompt',
      inputs: [
        { name: 'text', type: 'text', label: 'Teks prompt (opsional)', placeholder: 'teks untuk prompt', required: false }
      ],
      codegen(inputs) {
        return inputs.text
          ? `await please.acceptDialog('${inputs.text}')`
          : `await please.acceptDialog()`
      },
      validate(_inputs) { return null }
    },
  
    {
      ...UTIL,
      id: 'util.dismissDialog',
      label: 'Dismiss Dialog',
      icon: '❌',
      description: 'Dismiss/cancel dialog berikutnya',
      inputs: [],
      codegen(_inputs) {
        return `await please.dismissDialog()`
      },
      validate(_inputs) { return null }
    },
  */
]
