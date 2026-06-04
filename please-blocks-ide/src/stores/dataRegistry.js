/**
 * dataRegistry.js — Pinia store
 *
 * Menyimpan semua data test (URL, Account, dll.) yang didefinisikan QA
 * melalui Data Manager. Data di-flatten menjadi DataRef entries yang
 * dipakai oleh DataRefSelect dropdown di Block Inspector.
 *
 * Persistence: localStorage (Sprint 3), file system via Electron (Sprint 5+)
 */

import { defineStore } from 'pinia'
import { processDataGroups } from '@/core/factory/DataFactory.js'

const STORAGE_KEY = 'please-blocks:dataRegistry'

// Data default (sesuai template create-please-test)
const DEFAULT_GROUPS = {
  URL: {
    login: {
      url:   'https://practicetestautomation.com/practice-test-login/',
      title: 'Test Login | Practice Test Automation'
    },
    dashboard: {
      url:   'https://practicetestautomation.com/logged-in-successfully/',
      title: 'Logged In Successfully | Practice Test Automation'
    }
  },
  ACCOUNT: {
    valid: {
      username: 'process.env.ACCOUNT_USERNAME',
      password: 'process.env.ACCOUNT_PASSWORD'
    },
    wrongPassword: {
      username: 'process.env.ACCOUNT_USERNAME',
      password: 'wrongpassword'
    },
    wrongUsername: {
      username: 'invaliduser',
      password: 'process.env.ACCOUNT_PASSWORD'
    },
    empty: {
      username: '',
      password: ''
    }
  }
}

const DEFAULT_ENV = {
  BASE_URL:          'https://practicetestautomation.com',
  ACCOUNT_USERNAME:  'student',
  ACCOUNT_PASSWORD:  'Password123'
}

export const useDataRegistry = defineStore('dataRegistry', {
  state: () => {
    // Coba load dari localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        return {
          groups:  parsed.groups  || DEFAULT_GROUPS,
          env:     parsed.env     || DEFAULT_ENV,
          entries: []
        }
      }
    } catch { /* ignore */ }

    return {
      groups:  structuredClone(DEFAULT_GROUPS),
      env:     structuredClone(DEFAULT_ENV),
      entries: []   // diisi oleh processAndRegister()
    }
  },

  getters: {
    // Semua entries yang kompatibel dengan satu input type tertentu
    getByCompatibility: (state) => (inputType) =>
      state.entries.filter(e => e.compatibleWith.includes(inputType)),

    // Hanya entries level atas (group names)
    groupNames: (state) => Object.keys(state.groups),

    // Entries untuk satu group tertentu
    entriesForGroup: (state) => (groupName) =>
      state.entries.filter(e => e.group === groupName && e.path !== groupName)
  },

  actions: {
    // ── Core: process data → entries ──────────────────────────────

    processAndRegister() {
      this.entries = processDataGroups(this.groups, this.env)
      this.persist()
    },

    // ── Group management ──────────────────────────────────────────

    addGroup(name) {
      if (!name || this.groups[name]) return
      this.groups[name] = {}
      this.processAndRegister()
    },

    renameGroup(oldName, newName) {
      if (!newName || oldName === newName || this.groups[newName]) return
      this.groups[newName] = this.groups[oldName]
      delete this.groups[oldName]
      this.processAndRegister()
    },

    removeGroup(name) {
      delete this.groups[name]
      this.processAndRegister()
    },

    // ── Entry management ──────────────────────────────────────────

    addEntry(groupName, entryName, fields = {}) {
      if (!this.groups[groupName]) return
      this.groups[groupName][entryName] = fields
      this.processAndRegister()
    },

    updateEntry(groupName, entryName, fields) {
      if (!this.groups[groupName]) return
      this.groups[groupName][entryName] = { ...fields }
      this.processAndRegister()
    },

    renameEntry(groupName, oldName, newName) {
      if (!newName || oldName === newName) return
      const g = this.groups[groupName]
      if (!g) return
      g[newName] = g[oldName]
      delete g[oldName]
      this.processAndRegister()
    },

    removeEntry(groupName, entryName) {
      delete this.groups[groupName]?.[entryName]
      this.processAndRegister()
    },

    // ── Field management dalam satu entry ─────────────────────────

    addField(groupName, entryName, fieldName, value = '') {
      if (!this.groups[groupName]?.[entryName]) return
      this.groups[groupName][entryName][fieldName] = value
      this.processAndRegister()
    },

    updateField(groupName, entryName, fieldName, value) {
      if (!this.groups[groupName]?.[entryName]) return
      this.groups[groupName][entryName][fieldName] = value
      this.processAndRegister()
    },

    removeField(groupName, entryName, fieldName) {
      delete this.groups[groupName]?.[entryName]?.[fieldName]
      this.processAndRegister()
    },

    // ── Env variables ─────────────────────────────────────────────

    setEnvVar(key, value) {
      this.env[key] = value
      this.processAndRegister()
    },

    addEnvVar(key) {
      if (!key || this.env[key] !== undefined) return
      this.env[key] = ''
      this.processAndRegister()
    },

    removeEnvVar(key) {
      delete this.env[key]
      this.processAndRegister()
    },

    // ── Persistence ───────────────────────────────────────────────

    persist() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          groups: this.groups,
          env:    this.env
        }))
      } catch { /* quota exceeded etc. */ }
    },

    reset() {
      this.groups  = structuredClone(DEFAULT_GROUPS)
      this.env     = structuredClone(DEFAULT_ENV)
      this.processAndRegister()
    }
  }
})
