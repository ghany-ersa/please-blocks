import { describe, it, expect } from 'vitest'
import { exportProject } from './projectExporter.js'

// ── Fixtures ──────────────────────────────────────────────────────

function makeCanvas(overrides = {}) {
  return { features: [], ...overrides }
}

function makeBlockRegistry(blocks = []) {
  const map = Object.fromEntries(blocks.map(b => [b.id, b]))
  return { getById: (id) => map[id] ?? null }
}

function makeDataRegistry(overrides = {}) {
  return { files: {}, entries: [], env: {}, ...overrides }
}

function makeComponentStore(components = []) {
  return { components }
}

function getFile(files, path) {
  return files.find(f => f.path === path)
}

// ── gherkin/*.feature ────────────────────────────────────────────

describe('exportProject — gherkin/*.feature', () => {
  const clickBlock = { id: 'action.click', type: 'action', codegen: () => '', gherkinTemplate: ({ label }) => `the user clicks "${label}"` }
  const registry = makeBlockRegistry([clickBlock])

  const canvas = makeCanvas({
    features: [
      {
        label: 'Login',
        enabled: true,
        testCases: [
          { label: 'klik submit', steps: [{ blockId: 'action.click', inputs: { label: 'Submit' } }] }
        ]
      }
    ]
  })

  const files = exportProject(canvas, registry, makeDataRegistry(), makeComponentStore())

  it('menghasilkan gherkin/login.feature berdampingan dengan feature/login.spec.js', () => {
    expect(getFile(files, 'feature/login.spec.js')).toBeTruthy()
    const gherkinFile = getFile(files, 'gherkin/login.feature')
    expect(gherkinFile).toBeTruthy()
    expect(gherkinFile.content).toContain('Feature: Login')
    expect(gherkinFile.content).toContain('Scenario: klik submit')
    expect(gherkinFile.content).toContain('When the user clicks "Submit"')
  })
})

// ── app.js ────────────────────────────────────────────────────────

describe('exportProject — app.js (tanpa component)', () => {
  const files = exportProject(
    makeCanvas(),
    makeBlockRegistry(),
    makeDataRegistry(),
    makeComponentStore()
  )
  const app = getFile(files, 'app.js')

  it('menghasilkan file app.js', () => {
    expect(app).toBeDefined()
  })

  it('require please-test (bukan selenium-webdriver Builder)', () => {
    expect(app.content).toContain("require('please-test')")
    expect(app.content).not.toContain('selenium-webdriver')
    expect(app.content).not.toContain('Builder')
  })

  it('menggunakan pola createApp(page, test) factory', () => {
    expect(app.content).toContain('function createApp(page, test)')
    expect(app.content).toContain('new Please(page, test)')
  })

  it('module.exports menyertakan createApp', () => {
    expect(app.content).toContain('module.exports = { createApp }')
  })
})

describe('exportProject — app.js (dengan component)', () => {
  const components = [
    { name: 'Auth', exportName: 'AUTH', methods: [] },
    { name: 'Checkout', exportName: 'CHECKOUT', methods: [] }
  ]
  const files = exportProject(
    makeCanvas(),
    makeBlockRegistry(),
    makeDataRegistry(),
    makeComponentStore(components)
  )
  const app = getFile(files, 'app.js')

  it('require file component', () => {
    expect(app.content).toContain("require('./components/auth')")
    expect(app.content).toContain("require('./components/checkout')")
  })

  it('instansiasi component dengan please', () => {
    expect(app.content).toContain('AuthComponent(please)')
    expect(app.content).toContain('CheckoutComponent(please)')
    expect(app.content).not.toContain('new AuthComponent')
    expect(app.content).not.toContain('new CheckoutComponent')
  })

  it('export AUTH dan CHECKOUT', () => {
    expect(app.content).toContain('AUTH:')
    expect(app.content).toContain('CHECKOUT:')
  })
})

// ── package.json ──────────────────────────────────────────────────

describe('exportProject — package.json', () => {
  const files = exportProject(
    makeCanvas(),
    makeBlockRegistry(),
    makeDataRegistry(),
    makeComponentStore(),
    'my-project'
  )
  const pkg = getFile(files, 'package.json')
  let parsed

  it('menghasilkan JSON yang valid', () => {
    expect(() => { parsed = JSON.parse(pkg.content) }).not.toThrow()
  })

  it('menyertakan dependency please-test', () => {
    parsed = JSON.parse(pkg.content)
    expect(parsed.dependencies['please-test']).toBeDefined()
  })

  it('menyertakan @playwright/test sebagai devDependency', () => {
    parsed = JSON.parse(pkg.content)
    expect(parsed.devDependencies['@playwright/test']).toBeDefined()
  })

  it('script test menggunakan playwright test', () => {
    parsed = JSON.parse(pkg.content)
    expect(parsed.scripts.test).toBe('playwright test')
  })

  it('menggunakan nama project yang diberikan', () => {
    parsed = JSON.parse(pkg.content)
    expect(parsed.name).toBe('my-project')
  })
})

// ── .gitignore ────────────────────────────────────────────────────

describe('exportProject — .gitignore', () => {
  it('menghasilkan .gitignore dengan node_modules dan .env', () => {
    const files = exportProject(makeCanvas(), makeBlockRegistry(), makeDataRegistry(), makeComponentStore())
    const gi = getFile(files, '.gitignore')
    expect(gi.content).toContain('node_modules')
    expect(gi.content).toContain('.env')
  })
})

// ── .env ──────────────────────────────────────────────────────────

describe('exportProject — .env', () => {
  it('menghasilkan .env dari dataRegistry.env', () => {
    const dataReg = makeDataRegistry({ env: { BASE_URL: 'https://app.com', USER: 'admin' } })
    const files = exportProject(makeCanvas(), makeBlockRegistry(), dataReg, makeComponentStore())
    const env = getFile(files, '.env')
    expect(env.content).toContain('BASE_URL=https://app.com')
    expect(env.content).toContain('USER=admin')
  })
})

// ── kategori file ──────────────────────────────────────────────────

describe('exportProject — kategori file', () => {
  it('setiap file memiliki category', () => {
    const files = exportProject(makeCanvas(), makeBlockRegistry(), makeDataRegistry(), makeComponentStore())
    for (const f of files) {
      expect(f.category, `file ${f.path} tidak punya category`).toBeDefined()
    }
  })
})
