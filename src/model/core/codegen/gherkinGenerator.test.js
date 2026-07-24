import { describe, it, expect } from 'vitest'
import { generateGherkin } from './gherkinGenerator.js'
import navigation from '../blocks/definitions/navigation.js'
import actions    from '../blocks/definitions/actions.js'
import assertions from '../blocks/definitions/assertions.js'
import utilities  from '../blocks/definitions/utilities.js'

// ── Fixtures ──────────────────────────────────────────────────────

function makeRegistry(blocks) {
  const map = Object.fromEntries(blocks.map(b => [b.id, b]))
  return { getById: (id) => map[id] ?? null }
}

const registry = makeRegistry([...navigation, ...actions, ...assertions, ...utilities])

function makeFeature(overrides = {}) {
  return { label: 'Login', testCases: [], ...overrides }
}

function makeTestCase(label, steps = []) {
  return { label, steps }
}

function step(blockId, inputs = {}) {
  return { blockId, inputs }
}

// ── generateGherkin — struktur dasar ─────────────────────────────

describe('generateGherkin — tanpa feature', () => {
  it('returns placeholder when feature is null', () => {
    expect(generateGherkin(null, registry)).toBe('# Pilih sebuah Feature di canvas')
  })
})

describe('generateGherkin — struktur dasar', () => {
  it('menghasilkan Feature line', () => {
    const gherkin = generateGherkin(makeFeature(), registry)
    expect(gherkin).toContain('Feature: Login')
  })

  it('placeholder ketika belum ada test case', () => {
    const gherkin = generateGherkin(makeFeature(), registry)
    expect(gherkin).toContain('# Belum ada test case')
  })
})

// ── generateGherkin — skenario login (kasus uji nyata) ───────────

describe('generateGherkin — skenario login', () => {
  const feature = makeFeature({
    label: 'Login',
    testCases: [
      makeTestCase('Positive Login test', [
        step('nav.goto', { url: 'https://practicetestautomation.com/practice-test-login/' }),
        step('action.fill', { label: 'Username field', selector: '#username', value: 'student' }),
        step('action.fill', { label: 'Password field', selector: '#password', value: 'Password123' }),
        step('action.click', { label: 'Submit button', selector: '#submit' }),
        step('assert.verifyPage', { url: 'practicetestautomation.com/logged-in-successfully/' }),
        step('assert.see', { label: 'success message', selector: '.post-title', expected: 'Congratulations' }),
        step('assert.see', { label: 'Log out button', selector: 'text=Log out' })
      ]),
      makeTestCase('Negative username test', [
        step('nav.goto', { url: 'https://practicetestautomation.com/practice-test-login/' }),
        step('action.fill', { label: 'Username field', selector: '#username', value: 'incorrectUser' }),
        step('action.fill', { label: 'Password field', selector: '#password', value: 'Password123' }),
        step('action.click', { label: 'Submit button', selector: '#submit' }),
        step('assert.see', { label: 'error message' }),
        step('assert.see', { label: 'error message', expected: 'Your username is invalid!' })
      ]),
      makeTestCase('Negative password test', [
        step('nav.goto', { url: 'https://practicetestautomation.com/practice-test-login/' }),
        step('action.fill', { label: 'Username field', selector: '#username', value: 'student' }),
        step('action.fill', { label: 'Password field', selector: '#password', value: 'incorrectPassword' }),
        step('action.click', { label: 'Submit button', selector: '#submit' }),
        step('assert.see', { label: 'error message' }),
        step('assert.see', { label: 'error message', expected: 'Your password is invalid!' })
      ])
    ]
  })

  const gherkin = generateGherkin(feature, registry)

  it('menghasilkan Given dari nav.goto pertama', () => {
    expect(gherkin).toContain('Given the user opens "https://practicetestautomation.com/practice-test-login/"')
  })

  it('menghasilkan When untuk action.fill pertama dan And untuk selanjutnya', () => {
    expect(gherkin).toContain('When the user fills "Username field" with "student"')
    expect(gherkin).toContain('And the user fills "Password field" with "Password123"')
    expect(gherkin).toContain('And the user clicks "Submit button"')
  })

  it('menghasilkan Then untuk assertion pertama dan And untuk selanjutnya', () => {
    expect(gherkin).toContain('Then the page URL must be in "practicetestautomation.com/logged-in-successfully/"')
    expect(gherkin).toContain('And "success message" text should be "Congratulations"')
    expect(gherkin).toContain('And "Log out button" should be displayed')
  })

  it('assert.see tanpa expected menghasilkan kalimat "should be displayed"', () => {
    expect(gherkin).toContain('Then "error message" should be displayed')
    expect(gherkin).toContain('And "error message" text should be "Your username is invalid!"')
  })

  it('menghasilkan 3 Scenario', () => {
    expect(gherkin.match(/  Scenario: /g)).toHaveLength(3)
  })
})

// ── generateGherkin — DataRef diresolve ke nilai literal ─────────

describe('generateGherkin — DataRef → nilai literal', () => {
  const dataEntries = [
    { path: 'URL.login', type: 'string', value: 'https://practicetestautomation.com/practice-test-login/' },
    { path: 'ACCOUNT.valid.username', type: 'string', value: 'student' },
    { path: 'ACCOUNT.valid', type: 'object', value: { username: 'student', password: 'Password123' } }
  ]

  it('nav.goto dengan DataRef url menampilkan nilai literal, bukan path', () => {
    const feature = makeFeature({
      testCases: [
        makeTestCase('login', [
          step('nav.goto', { url: { type: 'dataref', path: 'URL.login' } })
        ])
      ]
    })
    const gherkin = generateGherkin(feature, registry, dataEntries)
    expect(gherkin).toContain('Given the user opens "https://practicetestautomation.com/practice-test-login/"')
    expect(gherkin).not.toContain('"URL.login"')
  })

  it('action.fill dengan DataRef value menampilkan nilai literal', () => {
    const feature = makeFeature({
      testCases: [
        makeTestCase('login', [
          step('action.fill', { label: 'Username', selector: '#u', value: { type: 'dataref', path: 'ACCOUNT.valid.username' } })
        ])
      ]
    })
    const gherkin = generateGherkin(feature, registry, dataEntries)
    expect(gherkin).toContain('When the user fills "Username" with "student"')
  })

  it('DataRef ke object (bukan primitif) fallback ke path', () => {
    const feature = makeFeature({
      testCases: [
        makeTestCase('login', [
          step('nav.goto', { url: { type: 'dataref', path: 'ACCOUNT.valid' } })
        ])
      ]
    })
    const gherkin = generateGherkin(feature, registry, dataEntries)
    expect(gherkin).toContain('Given the user opens "ACCOUNT.valid"')
  })

  it('DataRef yang tidak ditemukan di dataEntries fallback ke path', () => {
    const feature = makeFeature({
      testCases: [
        makeTestCase('login', [
          step('nav.goto', { url: { type: 'dataref', path: 'UNKNOWN.path' } })
        ])
      ]
    })
    const gherkin = generateGherkin(feature, registry, dataEntries)
    expect(gherkin).toContain('Given the user opens "UNKNOWN.path"')
  })
})

// ── generateGherkin — block tambahan (clear, scrollTo, notEqual) ─

describe('generateGherkin — action.clear, action.scrollTo, assert.notEqual', () => {
  it('action.clear menghasilkan kalimat "the user clears"', () => {
    const feature = makeFeature({
      testCases: [
        makeTestCase('clear input', [
          step('nav.goto', { url: 'https://example.com' }),
          step('action.clear', { label: 'Username field', selector: '#username' })
        ])
      ]
    })
    const gherkin = generateGherkin(feature, registry)
    expect(gherkin).toContain('When the user clears "Username field"')
  })

  it('action.scrollTo menghasilkan kalimat "the user scrolls to"', () => {
    const feature = makeFeature({
      testCases: [
        makeTestCase('scroll', [
          step('nav.goto', { url: 'https://example.com' }),
          step('action.scrollTo', { label: 'footer', selector: '#footer' })
        ])
      ]
    })
    const gherkin = generateGherkin(feature, registry)
    expect(gherkin).toContain('When the user scrolls to "footer"')
  })

  it('util.untilShow menghasilkan kalimat "waits for ... to appear"', () => {
    const feature = makeFeature({
      testCases: [
        makeTestCase('wait for spinner', [
          step('nav.goto', { url: 'https://example.com' }),
          step('util.untilShow', { label: 'loading spinner', selector: 'role=progressbar' }),
          step('action.click', { label: 'tombol', selector: '#btn' })
        ])
      ]
    })
    const gherkin = generateGherkin(feature, registry)
    expect(gherkin).toContain('When the user waits for "loading spinner" to appear')
    expect(gherkin).toContain('And the user clicks "tombol"')
  })

  it('util.wait dengan durasi menghasilkan kalimat "waits for N seconds"', () => {
    const feature = makeFeature({
      testCases: [
        makeTestCase('wait', [
          step('nav.goto', { url: 'https://example.com' }),
          step('util.wait', { duration: 2 })
        ])
      ]
    })
    const gherkin = generateGherkin(feature, registry)
    expect(gherkin).toContain('When the user waits for 2 seconds')
  })

  it('util.wait tanpa durasi menghasilkan kalimat "the user waits"', () => {
    const feature = makeFeature({
      testCases: [
        makeTestCase('wait', [
          step('nav.goto', { url: 'https://example.com' }),
          step('util.wait', {})
        ])
      ]
    })
    const gherkin = generateGherkin(feature, registry)
    expect(gherkin).toContain('When the user waits')
    expect(gherkin).not.toContain('the user waits for')
  })

  it('util.screenshot menghasilkan kalimat "a screenshot is captured"', () => {
    const feature = makeFeature({
      testCases: [
        makeTestCase('screenshot', [
          step('nav.goto', { url: 'https://example.com' }),
          step('util.screenshot', { label: 'halaman login' })
        ])
      ]
    })
    const gherkin = generateGherkin(feature, registry)
    expect(gherkin).toContain('When a screenshot is captured')
  })

  it('assert.notEqual menghasilkan kalimat "should not equal"', () => {
    const feature = makeFeature({
      testCases: [
        makeTestCase('notEqual', [
          step('nav.goto', { url: 'https://example.com' }),
          step('assert.notEqual', { actual: { type: 'varref', varName: 'result' }, expected: 'error' })
        ])
      ]
    })
    const gherkin = generateGherkin(feature, registry)
    expect(gherkin).toContain('Then "result" should not equal "error"')
  })
})

// ── generateGherkin — block tanpa gherkinTemplate dilewati ───────

describe('generateGherkin — block plumbing dilewati', () => {
  it('util.rawCode tidak menghasilkan baris (tidak punya gherkinTemplate)', () => {
    const feature = makeFeature({
      testCases: [
        makeTestCase('with raw code', [
          step('nav.goto', { url: 'https://example.com' }),
          step('util.rawCode', { code: 'const x = 1' }),
          step('action.click', { label: 'tombol', selector: '#btn' })
        ])
      ]
    })
    const gherkin = generateGherkin(feature, registry)
    expect(gherkin).not.toContain('const x = 1')
    expect(gherkin.match(/^\s*(Given|When|Then|And) /gm)).toHaveLength(2)
    expect(gherkin).toContain('Given the user opens "https://example.com"')
    expect(gherkin).toContain('When the user clicks "tombol"')
  })

  it('step dengan blockId tidak dikenal dilewati tanpa error', () => {
    const feature = makeFeature({
      testCases: [makeTestCase('unknown block', [step('block.tidak.ada', {})])]
    })
    expect(() => generateGherkin(feature, registry)).not.toThrow()
  })
})
