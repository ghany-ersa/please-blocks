/**
 * gherkinGenerator.js
 * Canvas state (Feature) → dokumen Gherkin (.feature).
 *
 * Aturan mapping:
 *   - Step navigasi/setup pertama pada tiap test case → Given
 *   - Step 'action' berikutnya → When (pertama) / And (selanjutnya)
 *   - Step 'assertion' → Then (pertama) / And (selanjutnya)
 *   - Block tanpa gherkinTemplate (mis. util.*) → dilewati (bukan business behavior)
 *
 * Contoh output:
 *
 *   Feature: Login
 *
 *     Scenario: login berhasil
 *       Given the user opens "https://example.com/login"
 *       When the user fills "Username" with "student"
 *       And the user clicks "Submit"
 *       Then the page URL must be in "dashboard"
 */

const KEYWORD_BY_PHASE = { given: 'Given', when: 'When', then: 'Then' }

/**
 * Generate dokumen Gherkin lengkap untuk satu Feature.
 *
 * @param {Object} feature       - feature dari canvasStore
 * @param {Object} blockRegistry - instance Pinia blockRegistry store
 * @param {Array}  [dataEntries] - dataRegistry.entries, untuk resolve DataRef → nilai literal
 * @returns {string}
 */
export function generateGherkin(feature, blockRegistry, dataEntries = []) {
  if (!feature) return '# Pilih sebuah Feature di canvas'

  const lines = [`Feature: ${feature.label}`]

  if (!feature.testCases.length) {
    lines.push('', '  # Belum ada test case')
    return lines.join('\n')
  }

  for (const tc of feature.testCases) {
    lines.push('', ...generateScenario(tc, blockRegistry, dataEntries))
  }

  return lines.join('\n')
}

/**
 * Generate baris-baris Scenario dari satu TestCase.
 */
function generateScenario(tc, blockRegistry, dataEntries) {
  const lines = [`  Scenario: ${tc.label}`]
  const stepLines = buildStepLines(tc.steps, blockRegistry, dataEntries)

  if (!stepLines.length) {
    lines.push('    # Belum ada step yang dapat dipetakan ke Gherkin')
  } else {
    lines.push(...stepLines)
  }

  return lines
}

/**
 * Susun baris step dengan keyword Given/When/Then/And berdasarkan
 * urutan dan tipe block. Step tanpa gherkinTemplate dilewati.
 */
function buildStepLines(steps, blockRegistry, dataEntries) {
  const lines = []
  let phase = 'given'     // fase saat ini: 'given' | 'when' | 'then'
  let isFirstInPhase = true

  for (const step of steps) {
    const block = blockRegistry.getById(step.blockId)
    if (!block || typeof block.gherkinTemplate !== 'function') continue

    const nextPhase = phaseForBlock(block, phase)
    if (nextPhase !== phase) {
      phase = nextPhase
      isFirstInPhase = true
    }

    let text
    try {
      text = block.gherkinTemplate(step.inputs || {}, dataEntries)
    } catch {
      continue
    }

    const keyword = isFirstInPhase ? KEYWORD_BY_PHASE[phase] : 'And'
    lines.push(`    ${keyword} ${text}`)
    isFirstInPhase = false
  }

  return lines
}

/**
 * Tentukan fase (given/when/then) berdasarkan tipe block dan fase saat ini.
 * navigation di awal test case dianggap Given; setelah fase pindah ke
 * when/then, navigation berikutnya (jika ada) tetap ikut fase 'when'.
 */
function phaseForBlock(block, currentPhase) {
  if (block.type === 'assertion') return 'then'
  if (block.type === 'navigation') return currentPhase === 'given' ? 'given' : 'when'
  // action, component, dll → when (kecuali masih fase given & belum ada action lain)
  return currentPhase === 'then' ? 'then' : 'when'
}
