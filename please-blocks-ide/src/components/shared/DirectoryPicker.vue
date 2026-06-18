<script setup>
/**
 * DirectoryPicker.vue
 * Modal browser direktori — navigasi folder via service browseDirectory().
 * Emit 'select' dengan absolute path folder yang dipilih.
 */
import { ref, onMounted } from 'vue'
import { browseDirectory } from '@/model/services/runnerService.js'

const emit = defineEmits(['select', 'close'])

const currentPath = ref('')
const crumbs      = ref([])
const items       = ref([])
const loading     = ref(false)
const error       = ref('')
const selected    = ref('')   // path yang sedang di-highlight

async function browse(path = '') {
  loading.value = true
  error.value   = ''
  const res = await browseDirectory(path)
  loading.value = false
  if (!res.ok) { error.value = res.error; return }
  currentPath.value = res.data.path
  crumbs.value      = res.data.crumbs
  items.value       = res.data.items
  selected.value    = res.data.path   // default pilih folder saat ini
}

function enter(item) {
  if (!item.isDir) return
  selected.value = item.path
  browse(item.path)
}

function highlight(item) {
  if (!item.isDir) return
  selected.value = item.path
}

function confirmSelect() {
  if (selected.value) emit('select', selected.value)
}

onMounted(() => browse())
</script>

<template>
  <div class="picker-overlay" @click.self="emit('close')">
    <div class="picker-modal">

      <!-- Header -->
      <div class="picker-header">
        <span class="picker-title">📁 Pilih Folder Project</span>
        <button class="btn-x" @click="emit('close')">×</button>
      </div>

      <!-- Breadcrumb -->
      <div class="breadcrumb">
        <button
          v-for="(crumb, i) in crumbs"
          :key="crumb.path"
          class="crumb-btn"
          @click="browse(crumb.path)"
        >
          {{ crumb.name }}
          <span v-if="i < crumbs.length - 1" class="crumb-sep">›</span>
        </button>
      </div>

      <!-- Current path display -->
      <div class="current-path">
        <span class="path-label">Path:</span>
        <span class="path-value">{{ currentPath }}</span>
      </div>

      <!-- Error -->
      <div v-if="error" class="picker-error">⚠ {{ error }}</div>

      <!-- Directory listing -->
      <div class="dir-list" v-if="!loading">
        <!-- Tombol ke parent dir -->
        <button
          v-if="crumbs.length > 1"
          class="dir-item parent"
          @click="browse(crumbs[crumbs.length - 2].path)"
        >
          <span class="item-icon">↑</span>
          <span class="item-name">..</span>
        </button>

        <button
          v-for="item in items"
          :key="item.path"
          class="dir-item"
          :class="{
            selected:  selected === item.path,
            project:   item.isProject,
            'is-file': !item.isDir
          }"
          @click="highlight(item)"
          @dblclick="enter(item)"
        >
          <span class="item-icon">
            {{ item.isProject ? '🧪' : item.isDir ? '📁' : '📄' }}
          </span>
          <span class="item-name">{{ item.name }}</span>
          <span v-if="item.isProject" class="project-badge">project</span>
          <span v-if="item.isDir" class="enter-hint">double-click untuk masuk</span>
        </button>

        <div v-if="items.length === 0" class="dir-empty">
          Folder kosong
        </div>
      </div>

      <div v-else class="dir-loading">
        <span class="spin">⏳</span> Memuat...
      </div>

      <!-- Selected preview -->
      <div class="selected-preview" :class="{ active: !!selected }">
        <span class="sel-label">Dipilih:</span>
        <span class="sel-path">{{ selected || '—' }}</span>
      </div>

      <!-- Footer actions -->
      <div class="picker-footer">
        <button class="btn-cancel" @click="emit('close')">Batal</button>
        <button
          class="btn-select"
          :disabled="!selected"
          @click="confirmSelect"
        >
          Pilih Folder Ini
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.picker-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.65);
  display: flex; align-items: center; justify-content: center;
  z-index: 300;
  backdrop-filter: blur(2px);
}

.picker-modal {
  width: 560px;
  max-width: 95vw;
  max-height: 82vh;
  background: #111827;
  border: 1px solid #1e293b;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 70px rgba(0,0,0,0.55);
}

/* Header */
.picker-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 16px; height: 44px;
  background: #0f1117; border-bottom: 1px solid #1e293b; flex-shrink: 0;
}
.picker-title { font-size: 15px; font-weight: 700; color: #e2e8f0; }
.btn-x {
  background: none; border: none; color: #475569;
  font-size: 22px; cursor: pointer; padding: 0; line-height: 1;
}
.btn-x:hover { color: #e2e8f0; }

/* Breadcrumb */
.breadcrumb {
  display: flex; align-items: center; flex-wrap: wrap; gap: 0;
  padding: 6px 14px;
  background: #0d1424; border-bottom: 1px solid #1e293b;
  flex-shrink: 0; min-height: 32px;
}
.crumb-btn {
  display: flex; align-items: center; gap: 4px;
  background: none; border: none; cursor: pointer;
  font-size: 12px; color: #475569; padding: 2px 4px;
  border-radius: 3px; transition: color 0.1s; font-family: monospace;
}
.crumb-btn:hover { color: #94a3b8; background: #1e293b; }
.crumb-btn:last-child { color: #94a3b8; }
.crumb-sep { color: #1e293b; font-size: 14px; }

/* Current path */
.current-path {
  display: flex; align-items: center; gap: 6px;
  padding: 5px 14px;
  background: #080c12; border-bottom: 1px solid #0f172a;
  flex-shrink: 0;
}
.path-label { font-size: 11px; color: #334155; font-weight: 700; text-transform: uppercase; }
.path-value { font-size: 12px; font-family: monospace; color: #475569; word-break: break-all; }

/* Error */
.picker-error {
  padding: 8px 14px; font-size: 13px; color: #ef4444;
  background: rgba(239,68,68,0.05); border-bottom: 1px solid rgba(239,68,68,0.1);
  flex-shrink: 0;
}

/* Directory list */
.dir-list {
  flex: 1; overflow-y: auto; padding: 4px 0;
  min-height: 0;
}
.dir-item {
  display: flex; align-items: center; gap: 8px;
  width: 100%; padding: 7px 16px;
  background: none; border: none; cursor: pointer;
  font-size: 13px; color: #64748b; text-align: left;
  transition: background 0.1s;
  position: relative;
}
.dir-item:hover:not(.is-file) { background: #1a2235; color: #cbd5e1; }
.dir-item.selected { background: rgba(99,102,241,0.1); color: #a5b4fc; }
.dir-item.selected .item-icon { filter: none; }
.dir-item.project { color: #6ee7b7; }
.dir-item.project.selected { background: rgba(16,185,129,0.1); color: #34d399; }
.dir-item.is-file { opacity: 0.35; cursor: default; }
.dir-item.parent { color: #475569; font-style: italic; }
.dir-item.parent:hover { background: #1e293b; color: #94a3b8; }

.item-icon { font-size: 15px; flex-shrink: 0; width: 18px; text-align: center; }
.item-name { flex: 1; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.project-badge {
  font-size: 10px; font-weight: 700;
  background: rgba(16,185,129,0.12); color: #10b981;
  padding: 1px 6px; border-radius: 8px; flex-shrink: 0;
}
.enter-hint {
  font-size: 10px; color: #1e293b; margin-left: auto;
  opacity: 0; transition: opacity 0.15s;
}
.dir-item:hover .enter-hint { opacity: 1; }

.dir-empty {
  padding: 24px 16px; text-align: center;
  color: #1e293b; font-size: 13px;
}
.dir-loading {
  flex: 1; display: flex; align-items: center; justify-content: center;
  color: #334155; font-size: 14px; gap: 8px;
}
.spin { animation: spin 1s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Selected preview */
.selected-preview {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 14px;
  background: #0a0f18; border-top: 1px solid #1e293b;
  flex-shrink: 0; min-height: 32px;
}
.sel-label { font-size: 11px; color: #334155; font-weight: 700; text-transform: uppercase; flex-shrink: 0; }
.sel-path  { font-size: 12px; font-family: monospace; color: #475569; word-break: break-all; }
.selected-preview.active .sel-path { color: #6366f1; }

/* Footer */
.picker-footer {
  display: flex; gap: 8px; justify-content: flex-end;
  padding: 10px 16px;
  background: #0f1117; border-top: 1px solid #1e293b;
  flex-shrink: 0;
}
.btn-cancel {
  padding: 6px 16px; background: #1e293b; border: 1px solid #334155;
  border-radius: 5px; font-size: 13px; color: #64748b; cursor: pointer;
}
.btn-cancel:hover { color: #94a3b8; }
.btn-select {
  padding: 6px 18px;
  background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.35);
  border-radius: 5px; font-size: 13px; color: #818cf8;
  cursor: pointer; font-weight: 600; transition: all 0.15s;
}
.btn-select:hover:not(:disabled) { background: rgba(99,102,241,0.28); color: #a5b4fc; }
.btn-select:disabled { opacity: 0.35; cursor: default; }
</style>
