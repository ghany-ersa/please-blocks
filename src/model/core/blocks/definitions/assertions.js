// Definisi blok kategori Assertions
// Mapping ke: please.see(), please.verifyPage(), expect() Playwright

import { t }                  from './inputTemplates.js'
import { v, createValidator } from './validationHelpers.js'
import { resolveString, resolveValue } from './helpers.js'
import { gherkinText } from './gherkinHelpers.js'

const ASSERTION = { type: 'assertion', color: '#f59e0b', colorBg: 'rgba(245,158,11,0.1)', output: null }

export default [
  {
    ...ASSERTION,
    id: 'assert.verifyPage',
    label: 'Verify Page',
    icon: '📍',
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
    codegen(inputs) {
      const args = [inputs.url ? resolveValue(inputs.url) : "''"]
      if (inputs.title) args.push(resolveValue(inputs.title))
      return `await please.verifyPage(${args.join(', ')})`
    },
    gherkinTemplate(inputs, dataEntries) {
      const parts = []
      if (inputs.url) parts.push(`the page URL must be in "${gherkinText(inputs.url, dataEntries)}"`)
      if (inputs.title) parts.push(`the page title should be "${gherkinText(inputs.title, dataEntries)}"`)
      return parts.join(' and ') || 'the page should match the expected URL/title'
    },
    validate(inputs) {
      if (!inputs.url && !inputs.title) return 'URL atau title wajib diisi salah satu'
      return null
    }
  },

  {
    ...ASSERTION,
    id: 'assert.see',
    label: 'See / Assert',
    icon: '👁️',
    description: 'Baca atau assert teks element. Isi "Simpan ke variabel" dan/atau "Teks yang diharapkan" sesuai kebutuhan.',
    output: null,
    inputs: [
      t.label('pesan'),
      t.selector('h1'),
      { name: 'varName',  type: 'text',  label: 'Simpan ke variabel (opsional)',  placeholder: 'hasilText', required: false },
      { name: 'expected', type: 'value', label: 'Teks yang diharapkan (opsional)', placeholder: 'Berhasil!', required: false }
    ],
    codegen(inputs) {
      const label    = resolveString(inputs.label)
      const selector = resolveString(inputs.selector)
      const args     = inputs.expected ? `, ${resolveValue(inputs.expected)}` : ''
      if (inputs.varName) {
        return `const ${inputs.varName} = await please.see(${label}, ${selector}${args})`
      }
      return `await please.see(${label}, ${selector}${args})`
    },
    gherkinTemplate(inputs, dataEntries) {
      const label = gherkinText(inputs.label, dataEntries)
      return inputs.expected
        ? `"${label}" text should be "${gherkinText(inputs.expected, dataEntries)}"`
        : `"${label}" should be displayed`
    },
    validate: createValidator(v.selector())
  },

/*
  {
    ...ASSERTION,
    id: 'assert.equal',
    label: 'Assert Equal',
    icon: '✅',
    description: 'Assert nilai aktual === nilai yang diharapkan (Playwright expect)',
    inputs: [t.actual('$headerText'), t.expected('Logged In Successfully'), t.message()],
    codegen(inputs) {
      const actual   = inputs.actual && typeof inputs.actual === 'object' && inputs.actual.type === 'varref'
        ? inputs.actual.varName
        : resolveValue(inputs.actual)
      const expected = resolveValue(inputs.expected)
      const msg      = inputs.message ? `, ${resolveString(inputs.message)}` : ''
      return `expect(${actual}${msg}).toBe(${expected})`
    },
    validate: createValidator(v.actual(), v.expected())
  },
*/
  {
    ...ASSERTION,
    id: 'assert.notEqual',
    label: 'Assert Not Equal',
    icon: '❌',
    description: 'Assert nilai aktual !== nilai yang diharapkan (Playwright expect)',
    inputs: [t.actual('$result'), t.expected('error', 'Nilai yang tidak diharapkan'), t.message()],
    codegen(inputs) {
      const actual   = inputs.actual && typeof inputs.actual === 'object' && inputs.actual.type === 'varref'
        ? inputs.actual.varName
        : resolveValue(inputs.actual)
      const expected = resolveValue(inputs.expected)
      const msg      = inputs.message ? `, ${resolveString(inputs.message)}` : ''
      return `expect(${actual}${msg}).not.toBe(${expected})`
    },
    gherkinTemplate(inputs, dataEntries) {
      return `"${gherkinText(inputs.actual, dataEntries)}" should not equal "${gherkinText(inputs.expected, dataEntries)}"`
    },
    validate: createValidator(v.actual(), v.expected('Nilai yang tidak diharapkan wajib diisi'))
  },

]
