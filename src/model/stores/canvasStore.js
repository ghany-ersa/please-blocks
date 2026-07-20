import { defineStore } from 'pinia'
import { mapArgNInputs } from '@/model/core/codegen/statementParser.js'

// Helper — generate ID unik sederhana
const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
const CANVAS_KEY = 'please-blocks:canvas-v1'

export const useCanvasStore = defineStore('canvas', {
  state: () => {
    // Restore canvas dari localStorage saat boot
    try {
      const saved = localStorage.getItem(CANVAS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.features?.length) {
          return {
            features:         parsed.features,
            activeFeatureId:  parsed.features[0]?.id || null,
            activeTestCaseId: null,
            activeStepId:     null,
            selectedStepIds:  [],
            draggingBlockId:  null,
            dropTargetId:     null
          }
        }
      }
    } catch { /* ignore */ }
    return {
    // Daftar features di canvas
    features: [],

    // ID yang sedang aktif / dipilih
    activeFeatureId:  null,
    activeTestCaseId: null,
    activeStepId:     null,

    // Multi-select step IDs (Ctrl+click / checkbox), selalu dalam lingkup activeTestCaseId
    selectedStepIds: [],

    // Block ID yang sedang di-drag dari palette (null jika tidak ada)
    draggingBlockId: null,

    // ID target drop yang di-hover saat drag berlangsung
    dropTargetId: null
    }
  },

  getters: {
    // Cari feature by ID
    featureById: (state) => (id) =>
      state.features.find(f => f.id === id) || null,

    // Cari test case by ID (scan semua features)
    testCaseById: (state) => (id) => {
      for (const f of state.features) {
        const tc = f.testCases.find(t => t.id === id)
        if (tc) return { testCase: tc, featureId: f.id }
      }
      return null
    },

    // Feature yang sedang aktif
    activeFeature: (state) =>
      state.features.find(f => f.id === state.activeFeatureId) || null,

    // Test case yang sedang aktif
    activeTestCase: (state) => {
      if (!state.activeTestCaseId) return null
      for (const f of state.features) {
        const tc = f.testCases.find(t => t.id === state.activeTestCaseId)
        if (tc) return tc
      }
      return null
    },

    // Jumlah total test case di semua features
    totalTestCases: (state) =>
      state.features.reduce((sum, f) => sum + f.testCases.length, 0),

    // Jumlah total steps di semua test cases
    totalSteps: (state) =>
      state.features.reduce(
        (sum, f) => sum + f.testCases.reduce((s, tc) => s + tc.steps.length, 0), 0
      )
  },

  actions: {
    // ── Features ──────────────────────────────────────────────────

    // Nama unik (case-insensitive) berdasarkan label dasar, tambahkan " (2)", " (3)", dst. jika bentrok
    uniqueFeatureLabel(baseLabel, excludeFeatureId = null) {
      const taken = new Set(
        this.features
          .filter(f => f.id !== excludeFeatureId)
          .map(f => f.label.trim().toLowerCase())
      )
      if (!taken.has(baseLabel.trim().toLowerCase())) return baseLabel
      let n = 2
      while (taken.has(`${baseLabel.trim()} (${n})`.toLowerCase())) n++
      return `${baseLabel.trim()} (${n})`
    },

    addFeature(label = 'Feature Baru') {
      const feature = {
        id:        uid('feat'),
        label:     this.uniqueFeatureLabel(label),
        testCases: [],
        collapsed: false,
        enabled:   true    // ← toggle untuk test.describe.skip()
      }
      this.features.push(feature)
      this.activeFeatureId = feature.id
        this.persist()
      return feature
    },

    toggleFeatureEnabled(featureId) {
      const f = this.features.find(f => f.id === featureId)
      if (f) { f.enabled = !f.enabled; this.persist() }
    },

    // @returns {{ ok: boolean, error?: string }} — ditolak jika nama sudah dipakai feature lain
    updateFeatureLabel(featureId, label) {
      const f = this.features.find(f => f.id === featureId)
      if (!f) return { ok: false, error: 'Feature tidak ditemukan.' }

      const trimmed = label.trim()
      if (!trimmed) return { ok: false, error: 'Nama feature tidak boleh kosong.' }

      const isDuplicate = this.features.some(
        other => other.id !== featureId && other.label.trim().toLowerCase() === trimmed.toLowerCase()
      )
      if (isDuplicate) return { ok: false, error: `Feature "${trimmed}" sudah ada. Pilih nama lain.` }

      f.label = trimmed
      this.persist()
      return { ok: true }
    },

    removeFeature(featureId) {
      const idx = this.features.findIndex(f => f.id === featureId)
      if (idx !== -1) {
        this.features.splice(idx, 1)
          this.persist()
        if (this.activeFeatureId === featureId) {
          this.activeFeatureId  = this.features[0]?.id || null
          this.activeTestCaseId = null
          this.activeStepId     = null
        }
      }
    },

    toggleFeatureCollapse(featureId) {
      const f = this.features.find(f => f.id === featureId)
      if (f) { f.collapsed = !f.collapsed; this.persist() }
    },

    // ── Test Cases ─────────────────────────────────────────────────

    addTestCase(featureId, label = 'Test Case Baru') {
      const f = this.features.find(f => f.id === featureId)
      if (!f) return null
      const tc = {
        id:       uid('tc'),
        label,
        steps:    [],
        collapsed: false,
        enabled:   true    // ← toggle untuk test.skip()
      }
      f.testCases.push(tc)
          this.persist()
      this.activeFeatureId  = featureId
      this.activeTestCaseId = tc.id
      return tc
    },

    toggleTestCaseEnabled(testCaseId) {
      for (const f of this.features) {
        const tc = f.testCases.find(t => t.id === testCaseId)
        if (tc) { tc.enabled = !tc.enabled; this.persist(); return }
      }
    },

    updateTestCaseLabel(testCaseId, label) {
      for (const f of this.features) {
        const tc = f.testCases.find(t => t.id === testCaseId)
        if (tc) { tc.label = label; this.persist(); return }
      }
    },

    removeTestCase(testCaseId) {
      for (const f of this.features) {
        const idx = f.testCases.findIndex(t => t.id === testCaseId)
        if (idx !== -1) {
          f.testCases.splice(idx, 1)
          this.persist()
          if (this.activeTestCaseId === testCaseId) {
            this.activeTestCaseId = f.testCases[0]?.id || null
            this.activeStepId     = null
            this.selectedStepIds  = []
          }
          return
        }
      }
    },

    toggleTestCaseCollapse(testCaseId) {
      for (const f of this.features) {
        const tc = f.testCases.find(t => t.id === testCaseId)
        if (tc) { tc.collapsed = !tc.collapsed; this.persist(); return }
      }
    },

    // ── Steps ──────────────────────────────────────────────────────

    addStep(testCaseId, blockId, inputs = {}) {
      for (const f of this.features) {
        const tc = f.testCases.find(t => t.id === testCaseId)
        if (tc) {
          const step = {
            id:      uid('step'),
            blockId,
            inputs,
            hasError: false
          }
          tc.steps.push(step)
          this.persist()
          this.activeTestCaseId = testCaseId
          this.activeStepId     = step.id
          return step
        }
      }
      return null
    },

    // Ganti semua referensi blockId lama ke baru (dipakai saat method/component di-rename)
    renameStepBlockId(oldBlockId, newBlockId) {
      let changed = false
      for (const f of this.features) {
        for (const tc of f.testCases) {
          for (const step of tc.steps) {
            if (step.blockId === oldBlockId) {
              step.blockId = newBlockId
              changed = true
            }
          }
        }
      }
      if (changed) this.persist()
    },

    updateStepInputs(stepId, inputs) {
      for (const f of this.features) {
        for (const tc of f.testCases) {
          const step = tc.steps.find(s => s.id === stepId)
          if (step) { step.inputs = { ...step.inputs, ...inputs }; this.persist(); return }
        }
      }
    },

    updateStepNote(stepId, note) {
      for (const f of this.features) {
        for (const tc of f.testCases) {
          const step = tc.steps.find(s => s.id === stepId)
          if (step) { step.note = note; this.persist(); return }
        }
      }
    },

    removeStep(stepId) {
      for (const f of this.features) {
        for (const tc of f.testCases) {
          const idx = tc.steps.findIndex(s => s.id === stepId)
          if (idx !== -1) {
            tc.steps.splice(idx, 1)
          this.persist()
            if (this.activeStepId === stepId) this.activeStepId = null
            return
          }
        }
      }
    },

    // Pindahkan step ke posisi lain dalam satu test case
    moveStep(testCaseId, fromIndex, toIndex) {
      for (const f of this.features) {
        const tc = f.testCases.find(t => t.id === testCaseId)
        if (tc) {
          const [step] = tc.steps.splice(fromIndex, 1)
          this.persist()
          tc.steps.splice(toIndex, 0, step)
          this.persist()
          return
        }
      }
    },

    // Pindahkan test case ke feature lain dan/atau posisi lain (reorder + cross-feature move)
    moveTestCase(testCaseId, fromFeatureId, toFeatureId, toIndex) {
      const fromFeature = this.features.find(f => f.id === fromFeatureId)
      const toFeature   = this.features.find(f => f.id === toFeatureId)
      if (!fromFeature || !toFeature) return

      const fromIndex = fromFeature.testCases.findIndex(t => t.id === testCaseId)
      if (fromIndex === -1) return

      const [tc] = fromFeature.testCases.splice(fromIndex, 1)

      // Jika splice di atas menggeser index tujuan (reorder dalam feature yang sama)
      let insertAt = toIndex
      if (fromFeature === toFeature && fromIndex < toIndex) insertAt -= 1
      insertAt = Math.max(0, Math.min(insertAt, toFeature.testCases.length))

      toFeature.testCases.splice(insertAt, 0, tc)
      this.persist()
    },

    // Ambil salinan step pada indices tertentu (untuk diekstrak jadi component)
    getStepsAt(testCaseId, indices) {
      for (const f of this.features) {
        const tc = f.testCases.find(t => t.id === testCaseId)
        if (!tc) continue
        const sorted = [...indices].sort((a, b) => a - b)
        return sorted.map(i => ({ ...tc.steps[i] }))
      }
      return []
    },

    // Ganti step pada indices dengan satu step component (blockId hasil generate).
    // blockId harus sudah terdaftar di blockRegistry sebelum dipanggil.
    replaceStepsWithComponent(testCaseId, indices, blockId) {
      for (const f of this.features) {
        const tc = f.testCases.find(t => t.id === testCaseId)
        if (!tc) continue

        const sorted = [...indices].sort((a, b) => a - b)
        const groupStep = {
          id:      uid('step'),
          blockId,
          inputs:  {},
          hasError: false
        }

        // Hapus step terpilih dari belakang agar index tidak bergeser
        for (let i = sorted.length - 1; i >= 0; i--) {
          tc.steps.splice(sorted[i], 1)
        }
        tc.steps.splice(sorted[0], 0, groupStep)

        this.activeStepId = groupStep.id
        this.persist()
        return groupStep
      }
      return null
    },

    // ── Drag & Drop State ──────────────────────────────────────────

    setDraggingBlock(blockId) {
      this.draggingBlockId = blockId
    },

    setDropTarget(targetId) {
      this.dropTargetId = targetId
    },

    clearDrag() {
      this.draggingBlockId = null
      this.dropTargetId    = null
    },

    // ── Copy / Paste ─────────────────────────────────────────────
    // Clipboard menyimpan snapshot plain object (testCase/step) di ViewModel
    // (lihat useCanvasClipboard.js). Store hanya bertanggung jawab menyisipkan
    // salinan tsb dengan ID baru ke lokasi yang sedang aktif.

    // Sisipkan salinan testCase (dgn id baru, termasuk semua steps) ke feature
    // yang sedang aktif, tepat setelah testCase aktif (atau di akhir jika tidak ada).
    pasteTestCase(sourceTestCase) {
      const targetFeature = this.features.find(f => f.id === this.activeFeatureId) || this.features[0]
      if (!targetFeature || !sourceTestCase) return null

      const clone = {
        id:        uid('tc'),
        label:     `${sourceTestCase.label} (copy)`,
        collapsed: false,
        enabled:   sourceTestCase.enabled !== false,
        steps:     sourceTestCase.steps.map(s => {
          const step = { id: uid('step'), blockId: s.blockId, inputs: { ...s.inputs }, hasError: false }
          if (s.note) step.note = s.note
          return step
        })
      }

      const insertAfter = targetFeature.testCases.findIndex(t => t.id === this.activeTestCaseId)
      const insertAt = insertAfter !== -1 ? insertAfter + 1 : targetFeature.testCases.length
      targetFeature.testCases.splice(insertAt, 0, clone)

      this.activeFeatureId  = targetFeature.id
      this.activeTestCaseId = clone.id
      this.activeStepId     = null
      this.persist()
      return clone
    },

    // Sisipkan salinan banyak step sekaligus (urutan tetap) ke testCase yang
    // sedang aktif, tepat setelah step aktif (atau di akhir jika tidak ada).
    pasteSteps(sourceSteps) {
      const found = this.testCaseById(this.activeTestCaseId)
      if (!found || !sourceSteps?.length) return []
      const { testCase: tc } = found

      const clones = sourceSteps.map(s => {
        const clone = { id: uid('step'), blockId: s.blockId, inputs: { ...s.inputs }, hasError: false }
        if (s.note) clone.note = s.note
        return clone
      })

      const insertAfter = tc.steps.findIndex(s => s.id === this.activeStepId)
      const insertAt = insertAfter !== -1 ? insertAfter + 1 : tc.steps.length
      tc.steps.splice(insertAt, 0, ...clones)

      this.activeStepId    = clones[clones.length - 1].id
      this.selectedStepIds = []
      this.persist()
      return clones
    },

    // ── Selection ─────────────────────────────────────────────────

    selectFeature(featureId) {
      this.activeFeatureId  = featureId
      this.activeTestCaseId = null
      this.activeStepId     = null
      this.selectedStepIds  = []
    },

    selectTestCase(testCaseId, featureId) {
      this.activeFeatureId  = featureId
      this.activeTestCaseId = testCaseId
      this.activeStepId     = null
      this.selectedStepIds  = []
    },

    selectStep(stepId) {
      this.activeStepId = stepId
    },

    // Sinkronkan multi-select step (ID, bukan index) dari useStepSelection lokal
    // per test case, agar bisa diakses lintas komponen (mis. clipboard shortcut).
    setSelectedStepIds(testCaseId, stepIds) {
      this.activeTestCaseId = testCaseId
      this.selectedStepIds  = [...stepIds]
    },

    // ── Persistence ────────────────────────────────────────────────

    persist() {
      try {
        localStorage.setItem(CANVAS_KEY, JSON.stringify({ features: this.features }))
      } catch { /* quota exceeded etc. */ }
    },

    clearCanvas() {
      this.features         = []
      this.activeFeatureId  = null
      this.activeTestCaseId = null
      this.activeStepId     = null
      localStorage.removeItem(CANVAS_KEY)
    },

    // ── Import (Reverse Codegen) ──────────────────────────────────

    /**
     * Impor hasil parseSpec() ke canvas. Membangun ulang feature/testCase/step
     * dengan ID baru, dan memetakan input component argN → nama field sebenarnya.
     *
     * @param {Array}  features        - dari parseSpec().features
     * @param {Object} [opts]
     * @param {Object} [opts.blockRegistry] - untuk resolve nama field component
     * @param {boolean} [opts.replace]  - true: ganti seluruh canvas; false: append
     * @returns {Object} feature pertama yang diimpor (atau null)
     */
    importFeatures(features, { blockRegistry = null, replace = false } = {}) {
      if (replace) this.features = []
      let firstFeature = null

      for (const pf of features) {
        const feature = {
          id: uid('feat'), label: pf.label || 'Feature', collapsed: false, enabled: pf.enabled !== false,
          testCases: (pf.testCases || []).map(ptc => ({
            id: uid('tc'), label: ptc.label || 'Test Case', collapsed: false, enabled: ptc.enabled !== false,
            steps: (ptc.steps || []).map(ps => {
              const step = { id: uid('step'), blockId: ps.blockId, inputs: mapArgNInputs(ps, blockRegistry), hasError: false }
              if (ps.note) step.note = ps.note
              return step
            })
          }))
        }
        this.features.push(feature)
        if (!firstFeature) firstFeature = feature
      }

      this.activeFeatureId = firstFeature?.id || this.activeFeatureId
      this.activeTestCaseId = null
      this.activeStepId = null
      this.persist()
      return firstFeature
    },

    // ── Seed Data (untuk dev preview) ─────────────────────────────

    seedDemoData() {
      this.features = []
      const f = this.addFeature('Login - practicetestautomation.com')

      const tc1 = this.addTestCase(f.id, 'menampilkan halaman login')
      this.addStep(tc1.id, 'nav.goto', { url: { type: 'dataref', path: 'PAGE.login.url' }, title: { type: 'dataref', path: 'PAGE.login.title' } })
      this.addStep(tc1.id, 'assert.see', { label: 'judul halaman', selector: 'h2', expected: 'Test login' })

      const tc2 = this.addTestCase(f.id, 'login gagal - username salah')
      this.addStep(tc2.id, 'nav.goto',        { url: { type: 'dataref', path: 'PAGE.login.url' }, title: { type: 'dataref', path: 'PAGE.login.title' } })
      this.addStep(tc2.id, 'action.fill',     { label: 'input username', selector: '#username', value: 'wronguser' })
      this.addStep(tc2.id, 'action.fill',     { label: 'input password', selector: '#password', value: 'Password123' })
      this.addStep(tc2.id, 'action.click',    { label: 'button submit',  selector: '#submit' })
      this.addStep(tc2.id, 'assert.see',  { label: 'pesan error', selector: '#error', expected: 'Your username is invalid!' })

      const tc3 = this.addTestCase(f.id, 'login gagal - password salah')
      this.addStep(tc3.id, 'nav.goto',        { url: { type: 'dataref', path: 'PAGE.login.url' }, title: { type: 'dataref', path: 'PAGE.login.title' } })
      this.addStep(tc3.id, 'action.fill',     { label: 'input username', selector: '#username', value: 'student' })
      this.addStep(tc3.id, 'action.fill',     { label: 'input password', selector: '#password', value: 'wrongpass' })
      this.addStep(tc3.id, 'action.click',    { label: 'button submit',  selector: '#submit' })
      this.addStep(tc3.id, 'assert.see',  { label: 'pesan error', selector: '#error', expected: 'Your password is invalid!' })

      const tc4 = this.addTestCase(f.id, 'login gagal - form kosong')
      this.addStep(tc4.id, 'nav.goto',        { url: { type: 'dataref', path: 'PAGE.login.url' }, title: { type: 'dataref', path: 'PAGE.login.title' } })
      this.addStep(tc4.id, 'action.click',    { label: 'button submit', selector: '#submit' })
      this.addStep(tc4.id, 'assert.see',  { label: 'pesan error', selector: '#error', expected: 'Your username is invalid!' })

      const tc5 = this.addTestCase(f.id, 'login berhasil')
      this.addStep(tc5.id, 'nav.goto',        { url: { type: 'dataref', path: 'PAGE.login.url' }, title: { type: 'dataref', path: 'PAGE.login.title' } })
      this.addStep(tc5.id, 'action.fill',     { label: 'input username', selector: '#username', value: 'student' })
      this.addStep(tc5.id, 'action.fill',     { label: 'input password', selector: '#password', value: 'Password123' })
      this.addStep(tc5.id, 'action.click',    { label: 'button submit',  selector: '#submit' })
      this.addStep(tc5.id, 'assert.verifyPage', { url: { type: 'dataref', path: 'PAGE.dashboard.url' }, title: { type: 'dataref', path: 'PAGE.dashboard.title' } })
      this.addStep(tc5.id, 'assert.see',  { label: 'teks sukses', selector: 'h1', expected: 'Logged In Successfully' })
      this.addStep(tc5.id, 'action.click',    { label: 'button logout', selector: 'text=Log out' })

      this.persist()
    }
  }
})
