import { describe, it, expect } from 'vitest'
import { generateSpec } from './specGenerator.js'

// ── Fixtures ──────────────────────────────────────────────────────

function makeRegistry(blocks = []) {
  const map = Object.fromEntries(blocks.map(b => [b.id, b]))
  return { getById: (id) => map[id] ?? null }
}

function makeFeature(overrides = {}) {
  return {
    label: 'Login',
    testCases: [],
    ...overrides
  }
}

function makeTestCase(label, steps = []) {
  return { label, steps }
}

function makeStep(blockId, inputs = {}, note = '') {
  return { blockId, inputs, note }
}

// ── generateSpec ──────────────────────────────────────────────────

describe('generateSpec — tanpa feature', () => {
  it('returns placeholder when feature is null', () => {
    expect(generateSpec(null, makeRegistry())).toBe('// Pilih sebuah Feature di canvas')
  })
})

describe('generateSpec — struktur dasar', () => {
  it('menghasilkan require app dan test.describe', () => {
    const feature = makeFeature()
    const code = generateSpec(feature, makeRegistry())

    expect(code).toContain("const { test, expect } = require('@playwright/test')")
    expect(code).toContain("const { createApp }    = require('../app')")
    expect(code).toContain("test.describe('Login', () => {")
    expect(code).toContain('})')
  })

  it('menambahkan placeholder ketika belum ada test case', () => {
    const code = generateSpec(makeFeature(), makeRegistry())
    expect(code).toContain('// Belum ada test case')
  })
})

describe('generateSpec — dengan test case dan steps', () => {
  const clickBlock = {
    id: 'action.click',
    codegen: ({ label, selector }) => `await please.click('${label}', '${selector}')`
  }

  const registry = makeRegistry([clickBlock])

  const feature = makeFeature({
    label: 'Login Flow',
    testCases: [
      makeTestCase('login berhasil', [
        makeStep('action.click', { label: 'tombol', selector: '#btn' })
      ])
    ]
  })

  it('menghasilkan test() block dengan page fixture', () => {
    const code = generateSpec(feature, registry)
    expect(code).toContain("test('login berhasil', async ({ page }) => {")
    expect(code).toContain('createApp(page)')
  })

  it('menghasilkan kode step di dalam it()', () => {
    const code = generateSpec(feature, registry)
    expect(code).toContain("await please.click('tombol', '#btn')")
  })

  it('placeholder ketika test case kosong (tanpa steps)', () => {
    const f = makeFeature({ testCases: [makeTestCase('kosong')] })
    const code = generateSpec(f, makeRegistry())
    expect(code).toContain('// Belum ada step')
  })
})

describe('generateSpec — note pada step', () => {
  const registry = makeRegistry([{
    id: 'action.click',
    codegen: () => "await please.click('x', '#x')"
  }])

  it('menyertakan note sebagai komentar di atas kode', () => {
    const feature = makeFeature({
      testCases: [makeTestCase('tes', [
        makeStep('action.click', {}, 'klik tombol login')
      ])]
    })
    const code = generateSpec(feature, registry)
    expect(code).toContain('// klik tombol login')
  })

  it('note multi-baris menjadi beberapa komentar', () => {
    const feature = makeFeature({
      testCases: [makeTestCase('tes', [
        makeStep('action.click', {}, 'baris pertama\nbaris kedua')
      ])]
    })
    const code = generateSpec(feature, registry)
    expect(code).toContain('// baris pertama')
    expect(code).toContain('// baris kedua')
  })
})

describe('generateSpec — block tidak ditemukan', () => {
  it('menghasilkan komentar error untuk block yang tidak ada', () => {
    const feature = makeFeature({
      testCases: [makeTestCase('tes', [makeStep('block.tidakada')])]
    })
    const code = generateSpec(feature, makeRegistry())
    expect(code).toContain('// [!] Block tidak ditemukan: block.tidakada')
  })
})

describe('generateSpec — require data', () => {
  it('menambahkan require data ketika ada dataref', () => {
    const registry = makeRegistry([{
      id: 'action.fill',
      codegen: () => "await please.fill('x', '#x', ACCOUNT.valid)"
    }])

    const dataEntries = [
      { path: 'ACCOUNT.valid', fileId: 'main', filePath: 'data/main.js', group: 'ACCOUNT' }
    ]

    const feature = makeFeature({
      testCases: [makeTestCase('tes', [
        makeStep('action.fill', { value: { type: 'dataref', path: 'ACCOUNT.valid' } })
      ])]
    })

    const code = generateSpec(feature, registry, dataEntries)
    expect(code).toContain("const { ACCOUNT } = require('../data/main')")
  })
})

describe('generateSpec — dengan component', () => {
  it('menyertakan nama component di require app', () => {
    const registry = makeRegistry([{
      id: 'comp.auth.login',
      type: 'component',
      codegen: () => 'await AUTH.login()'
    }])

    const feature = makeFeature({
      testCases: [makeTestCase('tes', [makeStep('comp.auth.login')])]
    })

    const code = generateSpec(feature, registry)
    expect(code).toContain('AUTH')
    expect(code).toContain("require('../app')")
  })
})

// ── Skip (test.describe.skip / test.skip) ──────────────────────────

describe('generateSpec — skip', () => {
  it('feature aktif menghasilkan test.describe biasa', () => {
    const feature = makeFeature({ enabled: true, testCases: [] })
    expect(generateSpec(feature, makeRegistry())).toContain("test.describe('Login', () => {")
  })

  it('feature enabled=false menghasilkan test.describe.skip', () => {
    const feature = makeFeature({ enabled: false, testCases: [] })
    expect(generateSpec(feature, makeRegistry())).toContain("test.describe.skip('Login', () => {")
  })

  it('feature tanpa field enabled dianggap aktif', () => {
    const feature = makeFeature({ testCases: [] })
    expect(generateSpec(feature, makeRegistry())).toContain("test.describe('Login', () => {")
  })

  it('test case enabled=false menghasilkan test.skip', () => {
    const feature = makeFeature({
      testCases: [{ label: 'tc gagal', enabled: false, steps: [] }]
    })
    expect(generateSpec(feature, makeRegistry())).toContain("test.skip('tc gagal', async ({ page }) => {")
  })

  it('test case aktif menghasilkan test biasa', () => {
    const feature = makeFeature({
      testCases: [{ label: 'tc jalan', enabled: true, steps: [] }]
    })
    const code = generateSpec(feature, makeRegistry())
    expect(code).toContain("test('tc jalan', async ({ page }) => {")
    expect(code).not.toContain("test.skip('tc jalan'")
  })
})
