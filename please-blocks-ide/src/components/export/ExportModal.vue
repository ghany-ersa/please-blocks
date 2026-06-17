<script setup>
/**
 * ExportModal.vue — Sprint 4
 * Menampilkan semua file yang di-generate dalam satu modal.
 * Tiap file punya tab sendiri + tombol copy.
 * Juga menyediakan "Download Semua" sebagai ZIP via browser API.
 */
import { ref, computed } from 'vue'
import JSZip              from 'jszip'
import { useCanvasStore }     from '@/model/stores/canvasStore.js'
import { useBlockRegistry }   from '@/model/stores/blockRegistry.js'
import { useDataRegistry }    from '@/model/stores/dataRegistry.js'
import { useComponentStore }  from '@/model/stores/componentStore.js'
import { useRunnerStore }     from '@/model/stores/runnerStore.js'
import { exportProject }      from '@/model/core/codegen/projectExporter.js'
import { useCodeHighlight }   from '@/composables/useCodeHighlight.js'

const emit = defineEmits(['close'])

const canvas    = useCanvasStore()
const registry  = useBlockRegistry()
const dataReg   = useDataRegistry()
const compStore = useComponentStore()
const runner    = useRunnerStore()

// Generate semua file
const files = computed(() => exportProject(canvas, registry, dataReg, compStore, runner.projectName))

// Navigasi tab
const activeFile = ref(null)
const activeIdx  = computed(() =>
  activeFile.value !== null ? activeFile.value : 0
)
const current = computed(() => files.value[activeIdx.value] || null)

// Category color
const catColor = {
  spec:      '#818cf8',
  index:     '#a855f7',
  data:      '#0ea5e9',
  component: '#ec4899',
  config:    '#64748b',
  readme:    '#10b981'
}
const catIcon = {
  spec:      '🧪',
  index:     '📋',
  data:      '📊',
  component: '📦',
  config:    '⚙️',
  readme:    '📖'
}

// Copy
const copied = ref(false)
async function copyFile() {
  if (!current.value) return
  await navigator.clipboard.writeText(current.value.content).catch(() => {})
  copied.value = true
  setTimeout(() => { copied.value = false }, 1800)
}

const projectName = computed(() => runner.projectName)
const { highlight } = useCodeHighlight()

// Download semua sebagai ZIP dengan struktur folder lengkap
const downloading = ref(false)
async function downloadAll() {
  downloading.value = true
  try {
    const zip    = new JSZip()
    const folder = zip.folder(projectName.value)

    for (const f of files.value) {
      folder.file(f.path, f.content)
    }

    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
    triggerDownload(blob, `${projectName.value}.zip`)
  } finally {
    downloading.value = false
  }
}

// Download file tunggal
function downloadSingle(file) {
  const mime = file.path.endsWith('.json') ? 'application/json'
             : file.path.endsWith('.md')   ? 'text/markdown'
             : 'text/plain'
  const blob = new Blob([file.content], { type: mime })
  triggerDownload(blob, file.path.split('/').pop())
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal">

      <!-- Header -->
      <div class="modal-header">
        <span class="modal-title">📦 Project Export</span>
        <span class="file-count">{{ files.length }} file</span>
        <div class="modal-actions">
          <button class="btn-dl" @click="downloadAll" :disabled="downloading">
            {{ downloading ? '⏳ Membuat ZIP...' : '⬇ Download ZIP' }}
          </button>
        </div>
        <button class="modal-close" @click="emit('close')">×</button>
      </div>

      <!-- File tabs -->
      <div class="file-tabs-bar">
        <button
          v-for="(f, idx) in files"
          :key="f.path"
          :class="['file-tab', { active: activeIdx === idx }]"
          :style="{ '--cat': catColor[f.category] }"
          @click="activeFile = idx"
        >
          <span class="tab-icon">{{ catIcon[f.category] }}</span>
          <span class="tab-name">{{ f.path.split('/').pop() }}</span>
          <span v-if="f.enabled === false" class="tab-disabled">⏸</span>
        </button>
      </div>

      <!-- File content -->
      <div class="file-body" v-if="current">
        <div class="file-toolbar">
          <span class="file-path">
            <span class="cat-badge" :style="{ background: catColor[current.category] + '22', color: catColor[current.category] }">
              {{ current.category }}
            </span>
            {{ current.path }}
          </span>
          <span v-if="current.enabled === false" class="disabled-badge">⏸ Dinonaktifkan di index.js</span>
          <div class="toolbar-right">
            <button class="btn-copy" :class="{ done: copied }" @click="copyFile">
              {{ copied ? '✓ Copied' : '⎘ Copy' }}
            </button>
            <button class="btn-dl-single" @click="downloadSingle(current)">⬇</button>
          </div>
        </div>

        <div class="code-wrap">
          <pre class="code" v-html="highlight(current.content)"></pre>
        </div>
      </div>

      <!-- Footer stats -->
      <div class="modal-footer">
        <span>{{ canvas.features.length }} feature</span>
        <span>·</span>
        <span>{{ canvas.totalTestCases }} test case</span>
        <span>·</span>
        <span>{{ canvas.totalSteps }} step</span>
        <span>·</span>
        <span>{{ canvas.features.filter(f => f.enabled !== false).length }} aktif</span>
      </div>

    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.65);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
}
.modal {
  width: 900px; max-width: 96vw;
  height: 640px; max-height: 92vh;
  background: #111827; border: 1px solid #1e293b;
  border-radius: 12px; display: flex; flex-direction: column;
  overflow: hidden; box-shadow: 0 24px 60px rgba(0,0,0,0.5);
}

/* Header */
.modal-header {
  display: flex; align-items: center; gap: 10px;
  padding: 0 16px; height: 46px;
  background: #0f1117; border-bottom: 1px solid #1e293b; flex-shrink: 0;
}
.modal-title  { font-size: 13px; font-weight: 700; color: #e2e8f0; }
.file-count   { font-size: 10px; color: #475569; background: #1e293b; padding: 2px 8px; border-radius: 10px; }
.modal-actions{ flex: 1; display: flex; justify-content: flex-end; gap: 8px; }
.btn-dl {
  padding: 5px 14px; border-radius: 5px; border: none; cursor: pointer;
  background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3);
  color: #818cf8; font-size: 11px; font-weight: 600;
  transition: all 0.15s;
}
.btn-dl:hover:not(:disabled) { background: rgba(99,102,241,0.25); }
.btn-dl:disabled { opacity: 0.5; cursor: default; }
.modal-close {
  background: none; border: none; cursor: pointer;
  color: #475569; font-size: 20px; line-height: 1; padding: 0;
}
.modal-close:hover { color: #e2e8f0; }

/* File tabs bar */
.file-tabs-bar {
  display: flex; gap: 2px; padding: 6px 12px;
  overflow-x: auto; flex-shrink: 0;
  background: #0f1117; border-bottom: 1px solid #1e293b;
}
.file-tab {
  display: flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: 5px; border: 1px solid transparent;
  font-size: 10px; font-family: monospace; cursor: pointer;
  color: #475569; background: transparent; white-space: nowrap;
  transition: all 0.12s;
}
.file-tab:hover  { background: rgba(255,255,255,0.03); color: #94a3b8; }
.file-tab.active {
  background: color-mix(in srgb, var(--cat) 15%, transparent);
  border-color: color-mix(in srgb, var(--cat) 40%, transparent);
  color: var(--cat);
}
.tab-icon     { font-size: 11px; }
.tab-name     { font-weight: 600; }
.tab-disabled { font-size: 9px; color: #4b5563; }

/* File body */
.file-body { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.file-toolbar {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 14px; background: #0f1117;
  border-bottom: 1px solid #1e293b; flex-shrink: 0;
}
.file-path  { font-size: 10px; font-family: monospace; color: #64748b; flex: 1; display: flex; align-items: center; gap: 6px; }
.cat-badge  { font-size: 8.5px; padding: 1px 6px; border-radius: 3px; font-weight: 700; }
.disabled-badge {
  font-size: 9px; color: #4b5563; background: rgba(75,85,99,0.1);
  border-radius: 4px; padding: 2px 7px;
}
.toolbar-right { display: flex; gap: 6px; }
.btn-copy {
  padding: 3px 10px; font-size: 10px;
  background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.25);
  border-radius: 4px; color: #6366f1; cursor: pointer; transition: all 0.15s;
}
.btn-copy.done { background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.3); color: #10b981; }
.btn-dl-single {
  padding: 3px 8px; font-size: 11px;
  background: rgba(255,255,255,0.04); border: 1px solid #1e293b;
  border-radius: 4px; color: #475569; cursor: pointer;
}
.btn-dl-single:hover { color: #94a3b8; border-color: #334155; }

.code-wrap { flex: 1; overflow: auto; background: #0a0d14; }
.code {
  margin: 0; padding: 14px 16px;
  font-family: 'SF Mono','Fira Code',monospace; font-size: 10px;
  line-height: 1.75; color: #94a3b8; white-space: pre;
}
.code :deep(.cm)       { color: #334155; font-style: italic; }
.code :deep(.kw)       { color: #c084fc; }
.code :deep(.str)      { color: #fbbf24; }
.code :deep(.fn)       { color: #6ee7b7; }
.code :deep(.obj)      { color: #6ee7b7; }
.code :deep(.flow)     { color: #818cf8; }
.code :deep(.data)     { color: #38bdf8; }
.code :deep(.data-key) { color: #7dd3fc; }

/* Footer */
.modal-footer {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 16px; background: #0a0d14;
  border-top: 1px solid #1e293b; flex-shrink: 0;
  font-size: 10px; color: #334155;
}
</style>
