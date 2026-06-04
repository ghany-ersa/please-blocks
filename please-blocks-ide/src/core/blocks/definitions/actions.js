// Definisi blok kategori Actions
// Mapping ke: please.click(), fill(), fillAndEnter(), clear(), datepicker(), uploadFile(), scrollTo()

import { t }                          from './inputTemplates.js'
import { v, createValidator }         from './validationHelpers.js'
import { codegenLabelSelector, codegenLabelSelectorValue } from './codegenHelpers.js'

const ACTION = { type: 'action', color: '#10b981', colorBg: 'rgba(16,185,129,0.1)', output: null }

export default [
  {
    ...ACTION,
    id: 'action.click',
    label: 'Click',
    icon: '🖱️',
    description: 'Klik element di halaman',
    inputs: [t.label('button submit'), t.selector('#submit'), t.wait()],
    codegen: codegenLabelSelector('click', 'wait'),
    validate: createValidator(v.selector())
  },

  {
    ...ACTION,
    id: 'action.fill',
    label: 'Fill Input',
    icon: '⌨️',
    description: 'Isi field dengan nilai tertentu',
    inputs: [t.label('input username'), t.selector('#username'), t.value('student')],
    codegen: codegenLabelSelectorValue('fill'),
    validate: createValidator(v.selector(), v.value())
  },

  {
    ...ACTION,
    id: 'action.fillAndEnter',
    label: 'Fill & Enter',
    icon: '⏎',
    description: 'Isi field lalu tekan Enter',
    inputs: [t.label('input search'), t.selector('#search'), t.value('kata kunci')],
    codegen: codegenLabelSelectorValue('fillAndEnter'),
    validate: createValidator(v.selector(), v.value())
  },

  {
    ...ACTION,
    id: 'action.clear',
    label: 'Clear Input',
    icon: '🗑️',
    description: 'Kosongkan nilai dari sebuah input field',
    inputs: [t.label('input username'), t.selector('#username')],
    codegen: codegenLabelSelector('clear'),
    validate: createValidator(v.selector())
  },

  {
    ...ACTION,
    id: 'action.datepicker',
    label: 'Date Picker',
    icon: '📅',
    description: 'Isi input date picker dengan format tanggal',
    inputs: [t.label('input tanggal lahir'), t.selector('#birthdate'), t.value('2000-01-01', 'Tanggal')],
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
      t.selector('input[type=file]'),
      { name: 'path', type: 'value', label: 'Path file', placeholder: '/path/to/file.jpg', required: true }
    ],
    codegen: codegenLabelSelectorValue('uploadFile', 'path'),
    validate: createValidator(v.selector(), v.path())
  },

  {
    ...ACTION,
    id: 'action.scrollTo',
    label: 'Scroll To',
    icon: '📜',
    description: 'Scroll halaman ke posisi element',
    inputs: [t.label('tombol submit'), t.selector('#submit')],
    codegen: codegenLabelSelector('scrollTo'),
    validate: createValidator(v.selector())
  }
]
