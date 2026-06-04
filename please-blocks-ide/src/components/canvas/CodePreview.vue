<script setup>
/**
 * CodePreview — panel kanan bawah.
 * Menampilkan kode JS yang di-generate dari Feature yang sedang aktif.
 * Update reaktif setiap kali canvas berubah.
 */
import { computed, ref } from 'vue'
import { useCanvasStore }   from '@/stores/canvasStore.js'
import { useBlockRegistry } from '@/stores/blockRegistry.js'
import { useDataRegistry }  from '@/stores/dataRegistry.js'
import { generateSpec, generateIndex } from '@/core/codegen/specGenerator.js'

const canvas   = useCanvasStore()
const registry = useBlockRegistry()
const dataReg  = useDataRegistry()
const mode     = ref('spec')  // 'spec' | 'index'

// Feature yang sedang aktif
const activeFeature = computed(() =>
  canvas.features.find(f => f.id === canvas.activeFeatureId) || canvas.features[0] || null
)

// Generate kode setiap kali state berubah (computed otomatis reaktif)
const generatedCode = computed(() => {
  if (mode.value === 'index') return generateIndex(canvas.features)
  return generateSpec(activeFeature.value, registry, dataReg.entries)
})

// Syntax highlighting sederhana — cukup untuk preview tanpa dependency eksternal
function highlight(code) {
  if (!code) return ''

  // Escape HTML terlebih dulu
  let h = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Urutan penting: comments dulu, lalu strings, lalu keywords
  // Comments // ...
  h = h.replace(/(\/\/[^\n]*)/g,
    '<span class="cm">$1</span>')

  // Template literals `...`
  h = h.replace(/(`[^`\n]*`)/g,
    '<span class="str">$1</span>')

  // Single-quote strings '...' (tidak kena yang sudah di-span)
  h = h.replace(/'([^'<]*)'/g,
    "'<span class=\"str\">$1</span>'")

  // Keywords JS
  h = h.replace(
    /\b(const|let|var|await|async|function|return|if|else|for|of|new|this|require|module)\b/g,
    '<span class="kw">$1</span>'
  )

  // please.method() dan COMP.method()
  h = h.replace(
    /\b(please|AUTH|CHECKOUT|[A-Z]{2,})\.([\w]+)/g,
    '<span class="obj">$1</span>.<span class="fn">$2</span>'
  )

  // describe / it
  h = h.replace(
    /\b(describe|it)\b(?=\()/g,
    '<span class="flow">$1</span>'
  )

  // Data references: URL.xxx, ACCOUNT.xxx
  h = h.replace(
    /\b([A-Z][A-Z_]*)\.([a-zA-Z.]+)/g,
    '<span class="data">$1</span>.<span class="data-key">$2</span>'
  )

  return h
}

const highlightedCode = computed(() => highlight(generatedCode.value))

// Copy to clipboard
const copied = ref(false)
async function copyCode() {
  try {
    await navigator.clipboard.writeText(generatedCode.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1800)
  } catch {
    // fallback silently
  }
}

function slugLabel(label) {
  return label
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 20) || 'feature'
}
</script>

<template>
  <div class="code-preview">
    <!-- Header -->
    <div class="cp-header">
      <div class="cp-tabs">
        <button
          class="cp-tab"
          :class="{ active: mode === 'spec' }"
          @click="mode = 'spec'"
        >
          {{ activeFeature ? slugLabel(activeFeature.label) + '.spec.js' : 'spec.js' }}
        </button>
        <button
          class="cp-tab"
          :class="{ active: mode === 'index' }"
          @click="mode = 'index'"
        >
          index.js
        </button>
      </div>
      <button class="cp-copy" @click="copyCode" :class="{ done: copied }">
        {{ copied ? '✓ Copied' : '⎘ Copy' }}
      </button>
    </div>

    <!-- Code area -->
    <div class="cp-body">
      <pre
        class="code"
        v-html="highlightedCode"
      ></pre>
    </div>
  </div>
</template>

<style scoped>
.code-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-top: 1px solid #1e293b;
  background: #0a0d14;
  min-height: 0;
}

/* Header */
.cp-header {
  display: flex;
  align-items: center;
  padding: 0 8px;
  background: #111827;
  border-bottom: 1px solid #1e293b;
  flex-shrink: 0;
  gap: 4px;
}
.cp-tabs { display: flex; flex: 1; }
.cp-tab {
  padding: 6px 10px;
  font-size: 9.5px;
  font-family: monospace;
  background: none;
  border: none;
  color: #475569;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;
  white-space: nowrap;
}
.cp-tab.active {
  color: #6366f1;
  border-bottom-color: #6366f1;
}
.cp-tab:hover:not(.active) { color: #64748b; }
.cp-copy {
  padding: 3px 8px;
  font-size: 9.5px;
  background: rgba(99,102,241,0.1);
  border: 1px solid rgba(99,102,241,0.25);
  border-radius: 4px;
  color: #6366f1;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}
.cp-copy.done { background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.3); color: #10b981; }
.cp-copy:hover:not(.done) { background: rgba(99,102,241,0.2); }

/* Code body */
.cp-body {
  flex: 1;
  overflow: auto;
  padding: 10px 12px;
}
.code {
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 10px;
  line-height: 1.75;
  color: #94a3b8;
  white-space: pre;
  margin: 0;
}

/* Syntax token colors */
.code :deep(.cm)       { color: #334155; font-style: italic; }
.code :deep(.kw)       { color: #c084fc; }
.code :deep(.str)      { color: #fbbf24; }
.code :deep(.fn)       { color: #6ee7b7; }
.code :deep(.obj)      { color: #6ee7b7; }
.code :deep(.flow)     { color: #818cf8; }
.code :deep(.data)     { color: #38bdf8; }
.code :deep(.data-key) { color: #7dd3fc; }
</style>
