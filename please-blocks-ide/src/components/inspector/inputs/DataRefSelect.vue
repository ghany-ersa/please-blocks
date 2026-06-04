<script setup>
/**
 * DataRefSelect — dropdown reaktif dari dataRegistry.
 * Menggantikan DataRefInput text box untuk tipe 'dataref', 'value', 'varref'.
 *
 * - Tipe 'dataref': tampilkan semua entries dari dataRegistry (objects + primitives)
 * - Tipe 'value':   tampilkan data primitives + opsi inline (ketik langsung)
 * - Tipe 'varref':  tampilkan canvas variables (hasil Get Text/Value)
 */
import { ref, computed, watch } from 'vue'
import { useDataRegistry } from '@/stores/dataRegistry.js'
import { useCanvasStore }  from '@/stores/canvasStore.js'

const props = defineProps({
  modelValue:  { default: '' },
  label:       { type: String,  default: '' },
  placeholder: { type: String,  default: 'Pilih atau ketik...' },
  required:    { type: Boolean, default: false },
  error:       { type: String,  default: '' },
  inputType:   { type: String,  default: 'dataref' }   // 'dataref' | 'value' | 'varref'
})

const emit = defineEmits(['update:modelValue'])

const dataReg = useDataRegistry()
const canvas  = useCanvasStore()

const open      = ref(false)
const searchQ   = ref('')
const inputRef  = ref(null)

// Nilai yang tampil di trigger button
const displayValue = computed(() => {
  const v = props.modelValue
  if (!v) return ''
  if (typeof v === 'object' && v.type === 'dataref') return v.path
  if (typeof v === 'object' && v.type === 'varref')  return `$${v.varName}`
  return String(v)
})

// Warna berdasarkan input type
const colorMap = { dataref: '#0ea5e9', value: '#94a3b8', varref: '#c084fc' }
const color    = computed(() => colorMap[props.inputType] || '#94a3b8')

// ── Opsi dropdown ─────────────────────────────────────────────────

// DataRef entries dari registry (untuk tipe dataref dan value)
const dataOptions = computed(() => {
  const entries = dataReg.entries.filter(e =>
    e.compatibleWith.includes(props.inputType)
  )
  if (!searchQ.value) return entries
  const q = searchQ.value.toLowerCase()
  return entries.filter(e => e.path.toLowerCase().includes(q))
})

// Canvas variables dari Get Text / Get Value steps
const varOptions = computed(() => {
  const vars = []
  for (const f of canvas.features) {
    for (const tc of f.testCases) {
      for (const step of tc.steps) {
        if (step.inputs?.varName) {
          vars.push({ varName: step.inputs.varName, blockId: step.blockId })
        }
      }
    }
  }
  return vars.filter(v =>
    !searchQ.value || v.varName.toLowerCase().includes(searchQ.value.toLowerCase())
  )
})

// Apakah ada opsi inline (ketik nilai langsung)
const inlineValue = computed(() =>
  searchQ.value && props.inputType !== 'dataref'
    ? searchQ.value
    : null
)

// ── Pilih opsi ────────────────────────────────────────────────────

function selectData(entry) {
  emit('update:modelValue', { type: 'dataref', path: entry.path })
  close()
}

function selectVar(v) {
  emit('update:modelValue', { type: 'varref', varName: v.varName })
  close()
}

function selectInline(value) {
  emit('update:modelValue', value)
  close()
}

function clearValue() {
  emit('update:modelValue', '')
}

// ── Open / close ──────────────────────────────────────────────────

function toggle() {
  open.value = !open.value
  if (open.value) {
    searchQ.value = ''
    // Focus search input setelah render
    setTimeout(() => inputRef.value?.focus(), 50)
  }
}

function close() {
  open.value    = false
  searchQ.value = ''
}

// Tutup saat klik di luar
function onOutsideClick(e) {
  if (!e.target.closest('.drs-wrap')) close()
}

watch(open, (val) => {
  if (val) document.addEventListener('click', onOutsideClick)
  else     document.removeEventListener('click', onOutsideClick)
})
</script>

<template>
  <div class="field">
    <label class="field-label">
      {{ label }}
      <span v-if="required" class="required">*</span>
      <span class="type-badge" :style="{ color, borderColor: color }">
        {{ inputType === 'dataref' ? 'data ref' : inputType === 'varref' ? 'var' : 'value' }}
      </span>
    </label>

    <div class="drs-wrap" :class="{ open }">
      <!-- Trigger -->
      <div class="drs-trigger" :class="{ 'has-error': error, 'has-value': displayValue }" @click="toggle">
        <span v-if="displayValue" class="drs-current" :style="{ color }">{{ displayValue }}</span>
        <span v-else class="drs-placeholder">{{ placeholder }}</span>
        <button v-if="displayValue" class="drs-clear" @click.stop="clearValue">×</button>
        <span class="drs-arrow" :class="{ rotated: open }">›</span>
      </div>

      <!-- Dropdown -->
      <div v-if="open" class="drs-dropdown">
        <div class="drs-search-wrap">
          <input
            ref="inputRef"
            v-model="searchQ"
            class="drs-search"
            placeholder="Cari atau ketik..."
            @keyup.escape="close"
          />
        </div>

        <div class="drs-list">
          <!-- DataRef entries -->
          <template v-if="dataOptions.length">
            <div class="drs-group-label">📊 Data Registry</div>
            <div
              v-for="entry in dataOptions"
              :key="entry.path"
              class="drs-option"
              @click="selectData(entry)"
            >
              <span class="opt-icon">{{ entry.icon }}</span>
              <span class="opt-path">{{ entry.path }}</span>
              <span class="opt-type">{{ entry.type }}</span>
            </div>
          </template>

          <!-- Canvas variables (varref) -->
          <template v-if="(inputType === 'varref' || inputType === 'value') && varOptions.length">
            <div class="drs-group-label">📌 Canvas Variables</div>
            <div
              v-for="v in varOptions"
              :key="v.varName"
              class="drs-option var-opt"
              @click="selectVar(v)"
            >
              <span class="opt-icon">📌</span>
              <span class="opt-path" style="color:#c084fc">${{ v.varName }}</span>
            </div>
          </template>

          <!-- Inline value (ketik langsung) -->
          <template v-if="inlineValue && inputType !== 'dataref'">
            <div class="drs-group-label">✏️ Nilai Inline</div>
            <div class="drs-option inline-opt" @click="selectInline(inlineValue)">
              <span class="opt-icon">✏️</span>
              <span class="opt-path" style="color:#fbbf24">'{{ inlineValue }}'</span>
            </div>
          </template>

          <!-- Empty -->
          <div v-if="!dataOptions.length && !varOptions.length && !inlineValue" class="drs-empty">
            {{ searchQ ? `Tidak ada hasil untuk "${searchQ}"` : 'Belum ada data. Buka Data Manager.' }}
          </div>
        </div>
      </div>
    </div>

    <span v-if="error" class="field-error">{{ error }}</span>
  </div>
</template>

<style scoped>
.field       { margin-bottom: 10px; position: relative; }
.field-label {
  display: flex; align-items: center; gap: 5px;
  font-size: 9.5px; font-weight: 600; color: #64748b;
  margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em;
}
.required  { color: #ef4444; }
.type-badge {
  font-size: 8px; padding: 1px 5px; border-radius: 3px;
  border: 1px solid; font-weight: 700; margin-left: auto;
}

/* Trigger */
.drs-wrap    { position: relative; }
.drs-trigger {
  display: flex; align-items: center; gap: 6px;
  width: 100%; background: #0f1117; border: 1px solid #334155;
  border-radius: 5px; padding: 5px 8px; cursor: pointer;
  transition: border-color 0.15s; min-height: 30px;
}
.drs-trigger.has-error { border-color: #ef4444; }
.drs-wrap.open .drs-trigger { border-color: #6366f1; border-bottom-color: transparent; border-radius: 5px 5px 0 0; }
.drs-current     { font-size: 10.5px; font-family: monospace; flex: 1; }
.drs-placeholder { font-size: 10.5px; color: #334155; flex: 1; }
.drs-clear {
  background: none; border: none; cursor: pointer;
  color: #475569; font-size: 14px; line-height: 1; padding: 0;
  flex-shrink: 0; transition: color 0.1s;
}
.drs-clear:hover { color: #ef4444; }
.drs-arrow {
  color: #475569; font-size: 14px; flex-shrink: 0;
  transition: transform 0.2s; display: inline-block;
}
.drs-arrow.rotated { transform: rotate(90deg); }

/* Dropdown */
.drs-dropdown {
  position: absolute; left: 0; right: 0; top: 100%; z-index: 50;
  background: #0f1117; border: 1px solid #6366f1;
  border-top: none; border-radius: 0 0 5px 5px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  max-height: 220px; display: flex; flex-direction: column;
}
.drs-search-wrap { padding: 6px; border-bottom: 1px solid #1e293b; flex-shrink: 0; }
.drs-search {
  width: 100%; background: #1e293b; border: 1px solid #334155;
  border-radius: 4px; padding: 4px 8px; font-size: 10.5px;
  color: #e2e8f0; outline: none;
}
.drs-search:focus { border-color: #6366f1; }

.drs-list { overflow-y: auto; flex: 1; }
.drs-group-label {
  font-size: 9px; font-weight: 700; color: #334155;
  padding: 6px 10px 3px; text-transform: uppercase; letter-spacing: 0.06em;
}
.drs-option {
  display: flex; align-items: center; gap: 6px;
  padding: 5px 10px; cursor: pointer;
  transition: background 0.1s;
}
.drs-option:hover { background: rgba(255,255,255,0.04); }
.opt-icon { font-size: 10px; flex-shrink: 0; }
.opt-path { font-size: 10.5px; font-family: monospace; color: #38bdf8; flex: 1; }
.opt-type {
  font-size: 8.5px; color: #334155;
  background: rgba(255,255,255,0.04); border-radius: 3px; padding: 1px 4px;
}
.drs-empty { font-size: 10px; color: #334155; padding: 12px 10px; text-align: center; }
.field-error { font-size: 9px; color: #ef4444; margin-top: 3px; display: block; }
</style>
