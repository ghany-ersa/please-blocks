// Definisi blok kategori Actions
// Mapping ke: please.click(), fill(), fillAndEnter(), clear(), datepicker(), uploadFile(), scrollTo()

import { t } from './inputTemplates.js'
import { v, createValidator } from './validationHelpers.js'
import { codegenLabelSelector, codegenLabelSelectorValue, codegenFill } from './codegenHelpers.js'
import { gherkinText } from './gherkinHelpers.js'

const ACTION = { type: 'action', color: '#10b981', colorBg: 'rgba(16,185,129,0.1)', output: null }

export default [
  {
    ...ACTION,
    id: 'action.click',
    label: 'Click',
    icon: '🖱️',
    description: 'Klik element di halaman',
    inputs: [t.label('button submit'), t.selector('button=Submit'), t.wait()],
    codegen(inputs) {
      // t.wait() disimpan dalam detik (UI) — please.click() butuh ms
      const ms = inputs.wait ? inputs.wait * 1000 : inputs.wait
      return codegenLabelSelector('click', 'wait')({ ...inputs, wait: ms })
    },
    gherkinTemplate(inputs, dataEntries) {
      const base = `the user clicks "${gherkinText(inputs.label, dataEntries)}"`
      return inputs.wait ? `${base} and waits ${inputs.wait} second${inputs.wait === 1 ? '' : 's'}` : base
    },
    validate: createValidator(v.selector())
  },

  {
    ...ACTION,
    id: 'action.fill',
    label: 'Fill',
    icon: '⌨️',
    description: 'Isi field dengan nilai tertentu',
    inputs: [
      t.label('input username'),
      t.selector('label=Username'),
      t.value('student'),
      t.checkbox('enter', 'Tekan Enter setelah isi')
    ],
    codegen: codegenFill,
    gherkinTemplate(inputs, dataEntries) {
      return `the user fills "${gherkinText(inputs.label, dataEntries)}" with "${gherkinText(inputs.value, dataEntries)}"`
    },
    validate: createValidator(v.selector(), v.value())
  },

  {
    ...ACTION,
    id: 'action.clear',
    label: 'Clear Input',
    icon: '🗑️',
    description: 'Kosongkan nilai dari sebuah input field',
    inputs: [t.label('input username'), t.selector('label=Username')],
    codegen: codegenLabelSelector('clear'),
    gherkinTemplate(inputs, dataEntries) {
      return `the user clears "${gherkinText(inputs.label, dataEntries)}"`
    },
    validate: createValidator(v.selector())
  },
  /*
    {
      ...ACTION,
      id: 'action.datepicker',
      label: 'Date Picker',
      icon: '📅',
      description: 'Isi input date picker dengan format tanggal',
      inputs: [t.label('input tanggal lahir'), t.selector('label=Tanggal Lahir'), t.value('2000-01-01', 'Tanggal')],
      codegen: codegenLabelSelectorValue('datepicker'),
      validate: createValidator(v.selector(), (inputs) => inputs.value ? null : 'Tanggal wajib diisi')
    },

    {
      ...ACTION,
      id: 'action.uploadFile',
      label: 'Upload File',
      icon: '📎',
      description: 'Upload file ke input type=file',
      inputs: [
        t.label('input upload foto'),
        t.selector('role=button[name=Upload]'),
        { name: 'path', type: 'value', label: 'Path file', placeholder: '/path/to/file.jpg', required: true }
      ],
      codegen: codegenLabelSelectorValue('uploadFile', 'path'),
      validate: createValidator(v.selector(), v.path())
    },
  */

  {
    ...ACTION,
    id: 'action.scrollTo',
    label: 'Scroll To',
    icon: '📜',
    description: 'Scroll halaman ke posisi element',
    inputs: [t.label('tombol submit'), t.selector('button=Submit')],
    codegen: codegenLabelSelector('scrollTo'),
    gherkinTemplate(inputs, dataEntries) {
      return `the user scrolls to "${gherkinText(inputs.label, dataEntries)}"`
    },
    validate: createValidator(v.selector())
  }
]
