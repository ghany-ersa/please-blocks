<script setup>
import { ref } from 'vue'
import { useRunnerStore } from '@/model/stores/runnerStore.js'

const runner = useRunnerStore()
const open   = ref(false)

const BROWSERS = [
  { id: 'chrome',  label: 'Chrome',  icon: '🟡', available: true  },
  { id: 'firefox', label: 'Firefox', icon: '🟠', available: true  },
  { id: 'edge',    label: 'Edge',    icon: '🔵', available: true  },
  { id: 'safari',  label: 'Safari',  icon: '🩵', available: false },
]

const current = () => BROWSERS.find(b => b.id === runner.browserTarget) || BROWSERS[0]

function select(browser) {
  if (!browser.available) return
  runner.setBrowserTarget(browser.id)
  open.value = false
}

function toggle() {
  if (runner.isRunning) return
  open.value = !open.value
}

function onClickOutside() {
  open.value = false
}
</script>

<template>
  <div class="browser-picker" v-click-outside="onClickOutside">
    <button
      class="picker-btn"
      :class="{ open, disabled: runner.isRunning }"
      @click="toggle"
      :title="runner.isRunning ? 'Tidak bisa ganti browser saat running' : 'Pilih browser'"
    >
      <span class="browser-icon">{{ current().icon }}</span>
      <span class="browser-label">{{ current().label }}</span>
      <span class="picker-arrow" :class="{ open }">▾</span>
    </button>

    <div v-if="open" class="picker-dropdown">
      <div class="picker-header">Pilih Browser</div>
      <button
        v-for="b in BROWSERS"
        :key="b.id"
        class="picker-option"
        :class="{ active: b.id === runner.browserTarget, unavailable: !b.available }"
        @click="select(b)"
        :title="!b.available ? 'Belum tersedia' : ''"
      >
        <span class="opt-icon">{{ b.icon }}</span>
        <span class="opt-label">{{ b.label }}</span>
        <span v-if="b.id === runner.browserTarget" class="opt-check">✓</span>
        <span v-if="!b.available" class="opt-soon">segera</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.browser-picker {
  position: relative;
}

.picker-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 5px;
  font-size: 10px;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  height: 28px;
}
.picker-btn:hover:not(.disabled) { color: #cbd5e1; border-color: #475569; }
.picker-btn.open   { border-color: #6366f1; color: #a5b4fc; background: rgba(99,102,241,0.1); }
.picker-btn.disabled { opacity: 0.5; cursor: default; }

.browser-icon { font-size: 11px; line-height: 1; }
.browser-label { font-weight: 600; }
.picker-arrow {
  font-size: 9px;
  color: #475569;
  transition: transform 0.15s;
  display: inline-block;
}
.picker-arrow.open { transform: rotate(180deg); }

/* Dropdown */
.picker-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  width: 160px;
  background: #111827;
  border: 1px solid #1e293b;
  border-radius: 7px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  z-index: 500;
  overflow: hidden;
}

.picker-header {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #334155;
  padding: 7px 12px 5px;
  border-bottom: 1px solid #1e293b;
}

.picker-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 11px;
  color: #94a3b8;
  text-align: left;
  transition: background 0.1s;
}
.picker-option:hover:not(.unavailable) { background: #1e293b; color: #e2e8f0; }
.picker-option.active  { color: #e2e8f0; }
.picker-option.unavailable { opacity: 0.35; cursor: default; }

.opt-icon  { font-size: 13px; flex-shrink: 0; }
.opt-label { flex: 1; font-weight: 500; }
.opt-check { color: #10b981; font-size: 11px; font-weight: 700; }
.opt-soon  {
  font-size: 8px;
  background: #1e293b;
  color: #475569;
  padding: 1px 5px;
  border-radius: 8px;
  font-weight: 600;
}
</style>
