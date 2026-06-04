/**
 * projectExporter.js
 * Generate semua file project sekaligus dari state IDE.
 *
 * Output: { 'feature/login.spec.js': '...', 'data/main.js': '...', ... }
 */

import { generateSpec, generateIndex } from './specGenerator.js'
import { generateAllDataFiles }        from '../factory/DataFactory.js'
import { generateComponentFile }       from '../factory/ComponentFactory.js'

/**
 * Generate semua file project.
 * @param {Object} canvas       - canvasStore
 * @param {Object} blockRegistry- blockRegistry store
 * @param {Object} dataRegistry - dataRegistry store
 * @param {Object} componentStore - componentStore
 * @returns {Array<{ path, content, category }>}
 */
export function exportProject(canvas, blockRegistry, dataRegistry, componentStore, projectName = 'my-automation-tests') {
  const files = []

  // ── Feature specs ──────────────────────────────────────────────
  for (const feature of canvas.features) {
    const slug    = slugify(feature.label)
    const content = generateSpec(feature, blockRegistry, dataRegistry.entries)
    files.push({
      path:     `feature/${slug}.spec.js`,
      content,
      category: 'spec',
      enabled:  feature.enabled !== false
    })
  }

  // ── index.js ──────────────────────────────────────────────────
  files.push({
    path:     'index.js',
    content:  generateIndex(canvas.features),
    category: 'index'
  })

  // ── Data files ────────────────────────────────────────────────
  const dataFiles = generateAllDataFiles(dataRegistry.files, dataRegistry.env)
  for (const [fileId, content] of Object.entries(dataFiles)) {
    const filename = dataRegistry.files[fileId]?.filename || fileId
    files.push({
      path:     `data/${filename}.js`,
      content,
      category: 'data'
    })
  }

  // ── .env.example ─────────────────────────────────────────────
  const envLines = [
    '# Salin file ini menjadi .env dan isi dengan nilai yang sesuai',
    '# cp .env.example .env',
    ''
  ]
  for (const [key, val] of Object.entries(dataRegistry.env)) {
    envLines.push(`${key}=${val}`)
  }
  files.push({ path: '.env.example', content: envLines.join('\n'), category: 'config' })

  // ── Component files ───────────────────────────────────────────
  for (const comp of componentStore.components) {
    const content = generateComponentFile(comp, blockRegistry)
    files.push({
      path:     `components/${comp.name.toLowerCase()}.js`,
      content,
      category: 'component'
    })
  }

  // ── app.js (template) ─────────────────────────────────────────
  const compNames   = componentStore.components.map(c => c.name)
  const compExports = componentStore.components.map(c => c.exportName)
  files.push({
    path:     'app.js',
    content:  generateAppFile(compNames, compExports),
    category: 'config'
  })

  // ── package.json ──────────────────────────────────────────────
  files.push({
    path:     'package.json',
    content:  generatePackageJson(projectName),
    category: 'config'
  })

  // ── .gitignore ────────────────────────────────────────────────
  files.push({
    path:     '.gitignore',
    content:  generateGitignore(),
    category: 'config'
  })

  return files
}

// ── Helpers ──────────────────────────────────────────────────────

function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'feature'
}

function generateAppFile(compNames, compExports) {
  const lines = [
    `const { Builder } = require('selenium-webdriver')`,
    `const pleaseClass = require('please-test')`,
  ]

  for (const name of compNames) {
    lines.push(`const ${name}Component = require('./components/${name.toLowerCase()}')`)
  }

  lines.push(
    ``,
    `const driver = new Builder().forBrowser('chrome').build()`,
    `driver.manage().window().maximize()`,
    ``,
    `const please = new pleaseClass(driver)`,
    ``
  )

  if (compNames.length === 0) {
    lines.push(`module.exports = {`)
    lines.push(`    please`)
    lines.push(`}`)
  } else {
    lines.push(`module.exports = {`)
    lines.push(`    please,`)
    for (let i = 0; i < compNames.length; i++) {
      const comma = i < compNames.length - 1 ? ',' : ''
      lines.push(`    ${compExports[i]}: new ${compNames[i]}Component(please)${comma}`)
    }
    lines.push(`}`)
  }

  return lines.join('\n')
}

function generatePackageJson(name = 'my-automation-tests') {
  return JSON.stringify({
    name,
    version: '1.0.0',
    description: 'Automation test project using please.js',
    scripts: {
      test:   'mocha --recursive --timeout 100000 index.js',
      report: 'mocha --recursive --timeout 100000 index.js --reporter mochawesome --reporter-options code=false,charts=true,assetsDir=report/assets,reportDir=report,reportFilename=index,reportPageTitle=Test Report'
    },
    dependencies: {
      'please-test':         '^1.0.0',
      'selenium-webdriver':  '^4.0.0'
    },
    devDependencies: {
      'dotenv':       '^16.0.0',
      'mocha':        '^11.0.0',
      'mochawesome':  '^7.1.4'
    }
  }, null, 4)
}

function generateGitignore() {
  return [
    'node_modules/',
    '.env',
    'report/',
    '*.log',
  ].join('\n')
}
