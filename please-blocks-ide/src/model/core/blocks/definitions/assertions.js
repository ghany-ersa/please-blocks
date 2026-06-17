// Definisi blok kategori Assertions
// Mapping ke: please.see(), equal(), notEqual(), getText(), getValue(), fail()

import { t }                         from './inputTemplates.js'
import { v, createValidator }        from './validationHelpers.js'
import { codegenGetVar, codegenAssert } from './codegenHelpers.js'
import { resolveString, resolveValue }  from './helpers.js'

const ASSERTION = { type: 'assertion', color: '#f59e0b', colorBg: 'rgba(245,158,11,0.1)', output: null }

export default [
  {
    ...ASSERTION,
    id: 'assert.seeText',
    label: 'See Text',
    icon: '👁️',
    description: 'Assert teks tertentu muncul pada element',
    inputs: [
      t.label('pesan error'),
      t.selector('//div[@id="error"]'),
      t.expected('Your username is invalid!', 'Teks yang diharapkan')
    ],
    codegen: (inputs) => {
      const label    = resolveString(inputs.label)
      const selector = resolveString(inputs.selector)
      const expected = resolveValue(inputs.expected)
      return `await please.equal(await please.see(${label}, ${selector}), ${expected})`
    },
    validate: createValidator(v.selector(), v.expected('Teks yang diharapkan wajib diisi'))
  },

  {
    ...ASSERTION,
    id: 'assert.getText',
    label: 'Get Text',
    icon: '📖',
    description: 'Ambil teks dari element, simpan ke variabel',
    output: 'text',
    inputs: [t.label('header halaman'), t.selector('//h1'), t.varName('headerText')],
    codegen: codegenGetVar('getText'),
    validate: createValidator(v.selector(), v.varName())
  },

  {
    ...ASSERTION,
    id: 'assert.getValue',
    label: 'Get Value',
    icon: '💾',
    description: 'Ambil nilai dari input field, simpan ke variabel',
    output: 'value',
    inputs: [t.label('input username'), t.selector('#username'), t.varName('usernameVal')],
    codegen: codegenGetVar('getValue'),
    validate: createValidator(v.selector(), v.varName())
  },

  {
    ...ASSERTION,
    id: 'assert.equal',
    label: 'Assert Equal',
    icon: '✅',
    description: 'Assert nilai aktual === nilai yang diharapkan',
    inputs: [t.actual('$headerText'), t.expected('Logged In Successfully'), t.message()],
    codegen: codegenAssert('equal'),
    validate: createValidator(v.actual(), v.expected())
  },

  {
    ...ASSERTION,
    id: 'assert.notEqual',
    label: 'Assert Not Equal',
    icon: '❌',
    description: 'Assert nilai aktual !== nilai yang diharapkan',
    inputs: [t.actual('$result'), t.expected('error', 'Nilai yang tidak diharapkan'), t.message()],
    codegen: codegenAssert('notEqual'),
    validate: createValidator(v.actual(), v.expected('Nilai yang tidak diharapkan wajib diisi'))
  },

  {
    ...ASSERTION,
    id: 'assert.fail',
    label: 'Force Fail',
    icon: '💥',
    description: 'Gagalkan test secara eksplisit dengan custom message',
    inputs: [
      { name: 'message', type: 'text', label: 'Pesan kegagalan', placeholder: 'Test digagalkan karena...', required: false }
    ],
    codegen: (inputs) => inputs.message ? `await please.fail('${inputs.message}')` : `await please.fail()`,
    validate: (_inputs) => null
  }
]
