/**
 * componentStore.js — Pinia store
 *
 * Menyimpan definisi component yang dibuat QA via Component Builder.
 * Setiap kali berubah → ComponentFactory di-run → blockRegistry di-update
 * → blok baru muncul di palette.
 *
 * Persistence: localStorage (Sprint 3), file system via Electron (Sprint 5+)
 */

import { defineStore } from 'pinia'
import { buildComponentBlocks } from '@/core/factory/ComponentFactory.js'

const STORAGE_KEY = 'please-blocks:componentStore'

// Component default (Auth sesuai template please-test)
const DEFAULT_COMPONENTS = [
  {
    id:         'comp-auth',
    name:       'Auth',
    exportName: 'AUTH',
    methods: [
      {
        name:   'login',
        params: ['user'],
        steps: [
          { blockId: 'action.fill',  inputs: { label: 'input username', selector: '#username', value: '' } },
          { blockId: 'action.fill',  inputs: { label: 'input password', selector: '#password', value: '' } },
          { blockId: 'action.click', inputs: { label: 'button submit',  selector: '#submit' } }
        ]
      },
      {
        name:   'logout',
        params: [],
        steps: [
          { blockId: 'action.click', inputs: { label: 'button logout', selector: 'link=Log out' } }
        ]
      }
    ]
  }
]

const uid = () => `comp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
const uidM = () => `meth-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

export const useComponentStore = defineStore('componentStore', {
  state: () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        return { components: JSON.parse(saved) }
      }
    } catch { /* ignore */ }
    return { components: structuredClone(DEFAULT_COMPONENTS) }
  },

  getters: {
    getById: (state) => (id) => state.components.find(c => c.id === id) || null
  },

  actions: {
    // ── Process: component defs → block registry ──────────────────

    processAndRegister() {
      // Import blockRegistry secara lazy untuk hindari circular dependency
      import('@/stores/blockRegistry.js').then(({ useBlockRegistry }) => {
        const registry = useBlockRegistry()
        const allBlocks = this.components.flatMap(buildComponentBlocks)
        registry.registerComponentBlocks(allBlocks)
      })
      this.persist()
    },

    // ── Component CRUD ─────────────────────────────────────────────

    addComponent(name = 'NewComponent') {
      const exportName = name.toUpperCase()
      const comp = {
        id: uid(),
        name,
        exportName,
        methods: []
      }
      this.components.push(comp)
      this.processAndRegister()
      return comp
    },

    updateComponent(id, patch) {
      const c = this.components.find(c => c.id === id)
      if (c) Object.assign(c, patch)
      this.processAndRegister()
    },

    removeComponent(id) {
      const idx = this.components.findIndex(c => c.id === id)
      if (idx !== -1) this.components.splice(idx, 1)
      this.processAndRegister()
    },

    // ── Method CRUD ────────────────────────────────────────────────

    addMethod(componentId, name = 'newMethod') {
      const c = this.components.find(c => c.id === componentId)
      if (!c) return null
      const method = { id: uidM(), name, params: [], steps: [] }
      c.methods.push(method)
      this.processAndRegister()
      return method
    },

    updateMethod(componentId, methodId, patch) {
      const c = this.components.find(c => c.id === componentId)
      if (!c) return
      const m = c.methods.find(m => m.id === methodId)
      if (m) Object.assign(m, patch)
      this.processAndRegister()
    },

    removeMethod(componentId, methodId) {
      const c = this.components.find(c => c.id === componentId)
      if (!c) return
      const idx = c.methods.findIndex(m => m.id === methodId)
      if (idx !== -1) c.methods.splice(idx, 1)
      this.processAndRegister()
    },

    // ── Step CRUD dalam method ─────────────────────────────────────

    addMethodStep(componentId, methodId, blockId) {
      const c = this.components.find(c => c.id === componentId)
      const m = c?.methods.find(m => m.id === methodId)
      if (!m) return
      m.steps.push({ blockId, inputs: {} })
      this.processAndRegister()
    },

    removeMethodStep(componentId, methodId, stepIdx) {
      const c = this.components.find(c => c.id === componentId)
      const m = c?.methods.find(m => m.id === methodId)
      if (!m) return
      m.steps.splice(stepIdx, 1)
      this.processAndRegister()
    },

    updateMethodStepInputs(componentId, methodId, stepIdx, inputs) {
      const c = this.components.find(c => c.id === componentId)
      const m = c?.methods.find(m => m.id === methodId)
      if (m?.steps[stepIdx]) {
        m.steps[stepIdx].inputs = { ...m.steps[stepIdx].inputs, ...inputs }
        this.processAndRegister()
      }
    },

    // Tambah / hapus parameter method
    addParam(componentId, methodId, paramName) {
      const c = this.components.find(c => c.id === componentId)
      const m = c?.methods.find(m => m.id === methodId)
      if (m && !m.params.includes(paramName)) {
        m.params.push(paramName)
        this.processAndRegister()
      }
    },

    removeParam(componentId, methodId, paramName) {
      const c = this.components.find(c => c.id === componentId)
      const m = c?.methods.find(m => m.id === methodId)
      if (m) {
        m.params = m.params.filter(p => p !== paramName)
        this.processAndRegister()
      }
    },

    // ── Persistence ───────────────────────────────────────────────

    persist() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.components))
      } catch { /* ignore */ }
    },

    reset() {
      this.components = structuredClone(DEFAULT_COMPONENTS)
      this.processAndRegister()
    }
  }
})
