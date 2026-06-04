<script setup>
/**
 * HybridValueInput — input untuk tipe 'value'.
 *
 * QA bisa pilih antara dua mode via toggle di pojok kanan label:
 *   [T]  Plain Text  → ketik langsung, hasil: string biasa  e.g. 'Logged In Successfully'
 *   [🔗] Data Ref    → pilih dari Data Factory, hasil: DataRef object { type:'dataref', path:'...' }
 *                      atau Canvas Variable { type:'varref', varName:'...' }
 *
 * Format modelValue:
 *   - Plain text : 'some string'  atau  42  (primitif)
 *   - DataRef    : { type: 'dataref', path: 'ACCOUNT.valid.username' }
 *   - VarRef     : { type: 'varref',  varName: 'headerText' }
 */
import { ref, computed, watch, nextTick } from 'vue'
import { useDataRegistry } from '@/stores/dataRegistry.js'
import { useCanvasStore }  from '@/stores/canvasStore.js'

const props = defineProps({
  modelValue:  { default: '' },
  label:       { type: String,  default: '' },
  placeholder: { type: String,  default: 'Ketik nilai atau pilih dari data...' },
  required:    { type: Boolean, default: false },
  error:       { type: String,  default: '' },
  extraVars:   { type: Array,   default: () => [] }
})

const emit = defineEmits(['update:modelValue'])

const dataReg = useDataRegistry()
const canvas  = useCanvasStore()

// ── Mode toggle ───────────────────────────────────────────────────
// Deteksi mode awal dari modelValue
const mode = ref(isRefValue(props.modelValue) ? 'data' : 'text')

watch(() => props.modelValue, (v) => {
  mode.value = isRefValue(v) ? 'data' : 'text'
}, { immediate: true })

function isRefValue(v) {
  return v && typeof v === 'object' && (v.type === 'dataref' || v.type === 'varref')
}

function switchMode(newMode) {
  if (mode.value === newMode) return
  mode.value = newMode
  // Reset value saat ganti mode
  emit('update:modelValue', '')
}

// ── Plain text mode ───────────────────────────────────────────────
const textValue = computed(() => {
  const v = props.modelValue
  if (!v || typeof v === 'object') return ''
  return String(v)
})

function onTextInput(e) {
  emit('update:modelValue', e.target.value)
}

// ── Data ref mode — dropdown ──────────────────────────────────────
const open       = ref(false)
const searchQ    = ref('')
const searchRef  = ref(null)
const triggerRef = ref(null)
const dropStyle  = ref({})

// Display string untuk trigger button
const displayValue = computed(() => {
  const v = props.modelValue
  if (!v) return ''
  if (typeof v === 'object' && v.type === 'dataref') return v.path
  if (typeof v === 'object' && v.type === 'varref')  return `$${v.varName}`
  return String(v)
})

// DataRef entries: primitif (string/number) agar cocok untuk value fields
const dataOptions = computed(() => {
  const q = searchQ.value.toLowerCase()
  return dataReg.entries
    .filter(e => e.compatibleWith.includes('value'))
    .filter(e => !q || e.path.toLowerCase().includes(q))
})

// Canvas variables dari blok Get Text / Get Value (tidak include extraVars)
const varOptions = computed(() => {
  const vars = []
  for (const f of canvas.features) {
    for (const tc of f.testCases) {
      for (const step of tc.steps) {
        if (step.inputs?.varName) {
          vars.push({ varName: step.inputs.varName })
        }
      }
    }
  }
  const q = searchQ.value.toLowerCase()
  return vars.filter(v => !q || v.varName.toLowerCase().includes(q))
})

const filteredExtraVars = computed(() => {
  const q = searchQ.value.toLowerCase()
  return props.extraVars.filter(p => !q || p.varName.toLowerCase().includes(q))
})

function selectData(entry) {
  emit('update:modelValue', { type: 'dataref', path: entry.path })
  closeDropdown()
}

function selectVar(v) {
  emit('update:modelValue', { type: 'varref', varName: v.varName })
  closeDropdown()
}

function clearValue() {
  emit('update:modelValue', '')
}

function positionDropdown() {
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  const dropHeight = 220
  if (spaceBelow >= dropHeight || spaceBelow >= 120) {
    dropStyle.value = {
      top:   `${rect.bottom + window.scrollY}px`,
      left:  `${rect.left  + window.scrollX}px`,
      width: `${rect.width}px`
    }
  } else {
    dropStyle.value = {
      top:   `${rect.top + window.scrollY - dropHeight}px`,
      left:  `${rect.left + window.scrollX}px`,
      width: `${rect.width}px`
    }
  }
}

function toggleDropdown() {
  open.value = !open.value
  if (open.value) {
    searchQ.value = ''
    nextTick(() => {
      positionDropdown()
      searchRef.value?.focus()
    })
  }
}

function closeDropdown() {
  open.value    = false
  searchQ.value = ''
}

function onOutside(e) {
  if (!e.target.closest('.hvi-wrap') && !e.target.closest('.hvi-dropdown')) closeDropdown()
}

watch(open, (v) => {
  if (v) document.addEventListener('click', onOutside)
  else   document.removeEventListener('click', onOutside)
})
</script>

<template>
  <div class="field">
    <!-- Label + mode toggle -->
    <div class="field-label">
      <span>{{ label }}<span v-if="required" class="required">*</span></span>
      <div class="mode-toggle">
        <button
          :class="['mode-btn', { active: mode === 'text' }]"
          @click="switchMode('text')"
          title="Plain Text — ketik nilai langsung"
        >T</button>
        <button
          :class="['mode-btn', { active: mode === 'data' }]"
          @click="switchMode('data')"
          title="Data Ref — pilih dari Data Factory atau Canvas Variable"
        >🔗</button>
      </div>
    </div>

    <!-- MODE: Plain Text -->
    <div v-if="mode === 'text'" class="text-mode">
      <input
        class="field-input"
        :class="{ 'has-error': error }"
        type="text"
        :value="textValue"
        :placeholder="placeholder"
        @input="onTextInput"
      />
      <div class="mode-hint">Nilai ditulis sebagai string literal di kode</div>
    </div>

    <!-- MODE: Data Ref -->
    <div v-else class="hvi-wrap" :class="{ open }">
      <!-- Trigger -->
      <div
        ref="triggerRef"
        class="hvi-trigger"
        :class="{ 'has-error': error, 'has-value': displayValue }"
        @click="toggleDropdown"
      >
        <template v-if="displayValue">
          <span class="hvi-icon">
            {{ props.modelValue?.type === 'varref' ? '📌' : '📊' }}
          </span>
          <span class="hvi-current">{{ displayValue }}</span>
          <button class="hvi-clear" @click.stop="clearValue">×</button>
        </template>
        <span v-else class="hvi-placeholder">Pilih dari Data Factory atau variabel canvas...</span>
        <span class="hvi-arrow" :class="{ rotated: open }">›</span>
      </div>
    </div>

    <!-- Dropdown di-teleport ke body agar tidak terpotong overflow:hidden -->
    <Teleport to="body">
      <div v-if="open" class="hvi-dropdown" :style="dropStyle">
        <div class="hvi-search-wrap">
          <input
            ref="searchRef"
            v-model="searchQ"
            class="hvi-search"
            placeholder="Cari data atau variabel..."
            @keyup.escape="closeDropdown"
          />
        </div>
        <div class="hvi-list">

          <!-- Method params -->
          <template v-if="filteredExtraVars.length">
            <div class="hvi-group-lbl">⚙️ Parameter Method</div>
            <div
              v-for="p in filteredExtraVars"
              :key="'param-' + p.varName"
              class="hvi-option hvi-option-param"
              @click="selectVar(p)"
            >
              <span class="opt-icon">⚙️</span>
              <span class="opt-path" style="color:#a78bfa">{{ p.varName }}</span>
              <span class="opt-type" style="color:#7c3aed;background:rgba(124,58,237,0.1)">param</span>
            </div>
          </template>
          <!-- DataRef entries (primitif) -->
          <template v-if="dataOptions.length">
            <div class="hvi-group-lbl">📊 Data Factory</div>
            <div
              v-for="entry in dataOptions"
              :key="entry.path"
              class="hvi-option"
              @click="selectData(entry)"
            >
              <span class="opt-icon">{{ entry.icon }}</span>
              <div class="opt-body">
                <span class="opt-path">{{ entry.path }}</span>
                <span class="opt-file">{{ entry.filePath }}</span>
              </div>
              <span class="opt-type">{{ entry.type }}</span>
            </div>
          </template>

          <!-- Canvas variables -->
          <template v-if="varOptions.length">
            <div class="hvi-group-lbl">📌 Canvas Variables</div>
            <div
              v-for="v in varOptions"
              :key="v.varName"
              class="hvi-option"
              @click="selectVar(v)"
            >
              <span class="opt-icon">📌</span>
              <span class="opt-path" style="color:#c084fc">${{ v.varName }}</span>
            </div>
          </template>

          <!-- Empty -->
          <div
            v-if="!dataOptions.length && !varOptions.length && !filteredExtraVars.length"
            class="hvi-empty"
          >
            {{ searchQ
              ? `Tidak ada hasil untuk "${searchQ}"`
              : 'Belum ada data. Buka Data Manager untuk menambahkan.' }}
          </div>
        </div>
      </div>
    </Teleport>

    <span v-if="error" class="field-error">{{ error }}</span>
  </div>
</template>

<style scoped>
.field       { margin-bottom: 10px; }

/* Label row */
.field-label {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 5px;
  font-size: 9.5px; font-weight: 600; color: #64748b;
  text-transform: uppercase; letter-spacing: 0.05em;
}
.required { color: #ef4444; margin-left: 2px; }

/* Mode toggle */
.mode-toggle { display: flex; gap: 2px; }
.mode-btn {
  padding: 2px 7px; border-radius: 3px; border: 1px solid #1e293b;
  font-size: 9px; font-weight: 700; cursor: pointer;
  background: transparent; color: #334155;
  transition: all 0.15s;
}
.mode-btn:hover      { border-color: #334155; color: #64748b; }
.mode-btn.active     { background: rgba(99,102,241,0.15); border-color: #6366f1; color: #818cf8; }

/* Text mode */
.text-mode    { position: relative; }
.field-input {
  width: 100%; background: #0f1117; border: 1px solid #334155;
  border-radius: 5px; padding: 5px 8px; font-size: 11px; color: #e2e8f0;
  outline: none; transition: border-color 0.15s;
}
.field-input:focus      { border-color: #6366f1; }
.field-input.has-error  { border-color: #ef4444; }
.field-input::placeholder { color: #334155; }
.mode-hint {
  font-size: 9px; color: #334155; margin-top: 3px;
}

/* Data ref mode — trigger */
.hvi-wrap    { position: relative; }
.hvi-trigger {
  display: flex; align-items: center; gap: 6px;
  width: 100%; background: #0f1117; border: 1px solid #334155;
  border-radius: 5px; padding: 5px 8px; cursor: pointer;
  transition: border-color 0.15s; min-height: 30px;
}
.hvi-trigger.has-error { border-color: #ef4444; }
.hvi-wrap.open .hvi-trigger {
  border-color: #6366f1; border-bottom-color: transparent;
  border-radius: 5px 5px 0 0;
}
.hvi-icon        { font-size: 11px; flex-shrink: 0; }
.hvi-current     { font-size: 10.5px; font-family: monospace; color: #38bdf8; flex: 1; }
.hvi-placeholder { font-size: 10px; color: #334155; flex: 1; }
.hvi-clear {
  background: none; border: none; cursor: pointer;
  color: #475569; font-size: 14px; line-height: 1; padding: 0;
  transition: color 0.1s; flex-shrink: 0;
}
.hvi-clear:hover { color: #ef4444; }
.hvi-arrow {
  color: #475569; font-size: 14px; flex-shrink: 0;
  transition: transform 0.2s; display: inline-block;
}
.hvi-arrow.rotated { transform: rotate(90deg); }

/* Dropdown — di-teleport ke body */
.hvi-dropdown {
  position: fixed; z-index: 9999;
  background: #0f1117; border: 1px solid #6366f1;
  border-radius: 0 0 5px 5px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  max-height: 220px; display: flex; flex-direction: column;
}
.hvi-search-wrap { padding: 6px; border-bottom: 1px solid #1e293b; flex-shrink: 0; }
.hvi-search {
  width: 100%; background: #1e293b; border: 1px solid #334155;
  border-radius: 4px; padding: 4px 8px; font-size: 10.5px;
  color: #e2e8f0; outline: none;
}
.hvi-search:focus { border-color: #6366f1; }

.hvi-list { overflow-y: auto; flex: 1; }
.hvi-group-lbl {
  font-size: 9px; font-weight: 700; color: #334155;
  padding: 6px 10px 3px; text-transform: uppercase; letter-spacing: 0.06em;
}
.hvi-option {
  display: flex; align-items: center; gap: 7px;
  padding: 5px 10px; cursor: pointer; transition: background 0.1s;
}
.hvi-option:hover { background: rgba(255,255,255,0.04); }
.hvi-option-param:hover { background: rgba(124,58,237,0.08); }
.opt-icon { font-size: 10px; flex-shrink: 0; }
.opt-body { flex: 1; min-width: 0; }
.opt-path {
  display: block; font-size: 10.5px; font-family: monospace;
  color: #38bdf8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.opt-file {
  display: block; font-size: 8.5px; color: #334155; font-family: monospace;
}
.opt-type {
  font-size: 8.5px; color: #334155;
  background: rgba(255,255,255,0.04); border-radius: 3px; padding: 1px 5px;
  flex-shrink: 0;
}
.hvi-empty { font-size: 10px; color: #334155; padding: 12px 10px; text-align: center; }
.field-error { font-size: 9px; color: #ef4444; margin-top: 3px; display: block; }
</style>
