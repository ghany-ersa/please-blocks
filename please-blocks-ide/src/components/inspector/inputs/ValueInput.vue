<script setup>
/**
 * ValueInput — komponen tunggal untuk semua tipe input referensi nilai.
 *
 * inputType='value'   → mode toggle [T]/[🔗]: plain text ATAU pilih dari Data Factory / Canvas Variable
 * inputType='dataref' → langsung dropdown, pilih object dari Data Registry
 * inputType='varref'  → langsung dropdown, pilih variabel canvas
 *
 * Format modelValue:
 *   - Plain text  : 'some string' atau 42 (primitif)
 *   - DataRef     : { type: 'dataref', path: 'ACCOUNT.valid.username' }
 *   - VarRef      : { type: 'varref',  varName: 'headerText' }
 */
import { ref, computed, watch } from 'vue'
import { useDataRegistry }         from '@/model/stores/dataRegistry.js'
import { useCanvasStore }          from '@/model/stores/canvasStore.js'
import { checkEntryCompatibility } from '@/model/core/blocks/schemaValidator.js'
import { useDropdownControl }      from '@/composables/useDropdownControl.js'
import DropdownOptionGroup         from '@/components/shared/DropdownOptionGroup.vue'

const props = defineProps({
  modelValue:  { default: '' },
  label:       { type: String,  default: '' },
  placeholder: { type: String,  default: 'Ketik nilai atau pilih dari data...' },
  required:    { type: Boolean, default: false },
  error:       { type: String,  default: '' },
  inputType:   { type: String,  default: 'value' },  // 'value' | 'dataref' | 'varref'
  schema:      { type: Object,  default: null },
  extraVars:   { type: Array,   default: () => [] }
})

const emit = defineEmits(['update:modelValue'])

const dataReg = useDataRegistry()
const canvas  = useCanvasStore()

// ── Helpers ───────────────────────────────────────────────────────
const colorMap = { dataref: '#0ea5e9', value: '#94a3b8', varref: '#c084fc' }
const color    = computed(() => colorMap[props.inputType] || '#94a3b8')

function isRefValue(v) {
  return v && typeof v === 'object' && (v.type === 'dataref' || v.type === 'varref')
}

// ── Mode toggle (hanya aktif saat inputType === 'value') ──────────
const isHybrid = computed(() => props.inputType === 'value')
const mode     = ref(isRefValue(props.modelValue) ? 'data' : 'text')

watch(() => props.modelValue, (v) => {
  if (isHybrid.value) mode.value = isRefValue(v) ? 'data' : 'text'
}, { immediate: true })

function switchMode(newMode) {
  if (mode.value === newMode) return
  mode.value = newMode
  emit('update:modelValue', '')
}

// Apakah sedang menampilkan plain-text input
const showTextInput = computed(() => isHybrid.value && mode.value === 'text')
// Apakah sedang menampilkan dropdown trigger
const showDropdown  = computed(() => !isHybrid.value || mode.value === 'data')

// ── Plain text mode ───────────────────────────────────────────────
const textValue = computed(() => {
  const v = props.modelValue
  if (!v || typeof v === 'object') return ''
  return String(v)
})

function onTextInput(e) {
  emit('update:modelValue', e.target.value)
}

// ── Dropdown ──────────────────────────────────────────────────────
const searchRef  = ref(null)
const triggerRef = ref(null)

const { open, searchQ, dropStyle, toggle, close } = useDropdownControl({
  wrapSelector:     '.vi-wrap',
  dropdownSelector: '.vi-dropdown',
  focusRef:         searchRef,
  triggerRef,
  dropHeight:       240
})

// Nilai yang tampil di trigger
const displayValue = computed(() => {
  const v = props.modelValue
  if (!v) return ''
  if (typeof v === 'object' && v.type === 'dataref') return v.path
  if (typeof v === 'object' && v.type === 'varref')  return `$${v.varName}`
  return String(v)
})

// DataRef entries — filter berdasarkan inputType, tambahkan info compat schema
const dataOptions = computed(() => {
  const q = searchQ.value.toLowerCase()
  return dataReg.entries
    .filter(e => e.compatibleWith.includes(props.inputType))
    .filter(e => !q || e.path.toLowerCase().includes(q))
    .map(e => ({
      ...e,
      compat: props.schema ? checkEntryCompatibility(e, props.schema) : 'ok'
    }))
    .sort((a, b) => {
      if (a.compat === 'ok' && b.compat !== 'ok') return -1
      if (a.compat !== 'ok' && b.compat === 'ok') return 1
      return 0
    })
})

const hasCompatibleOptions = computed(() =>
  !props.schema || dataOptions.value.some(e => e.compat === 'ok')
)

// Canvas variables (dari step output) + extraVars
const varOptions = computed(() => {
  const vars = []
  for (const p of props.extraVars) {
    vars.push({ varName: p.varName, label: p.label || p.varName, isParam: true, schema: p.schema, inputType: p.inputType })
  }
  for (const f of canvas.features) {
    for (const tc of f.testCases) {
      for (const step of tc.steps) {
        if (step.inputs?.varName) vars.push({ varName: step.inputs.varName, blockId: step.blockId })
      }
    }
  }
  const q = searchQ.value.toLowerCase()
  return vars.filter(v => !q || v.varName.toLowerCase().includes(q))
})

const filteredParams = computed(() => varOptions.value.filter(v => v.isParam))
const filteredVars   = computed(() => varOptions.value.filter(v => !v.isParam))

// Inline value: muncul saat user mengetik di search (hanya untuk non-dataref)
const inlineValue = computed(() =>
  searchQ.value && props.inputType !== 'dataref' ? searchQ.value : null
)

// Schema hint
const schemaHint = computed(() => {
  if (!props.schema) return ''
  return `Butuh: ${props.schema.requiredFields?.join(', ')} · Contoh: ${props.schema.example || ''}`
})

function paramSchemaCompatible(param) {
  if (!props.schema || !param.schema) return true
  const needed = props.schema.requiredFields || []
  const has    = param.schema.requiredFields || []
  return needed.every(f => has.includes(f))
}

// ── Handlers ──────────────────────────────────────────────────────
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
</script>

<template>
  <div class="field">

    <!-- Label -->
    <div class="vi-label">
      <span class="vi-label-text">
        {{ label }}<span v-if="required" class="required">*</span>
      </span>

      <!-- Mode toggle — hanya tampil untuk inputType='value' -->
      <div v-if="isHybrid" class="mode-toggle">
        <button
          :class="['mode-btn', { active: mode === 'text' }]"
          title="Plain Text — ketik nilai langsung"
          @click="switchMode('text')"
        >T</button>
        <button
          :class="['mode-btn', { active: mode === 'data' }]"
          title="Data Ref — pilih dari Data Factory atau Canvas Variable"
          @click="switchMode('data')"
        >🔗</button>
      </div>

      <!-- Type badge — tampil untuk dataref / varref -->
      <span v-else class="type-badge" :style="{ color, borderColor: color }">
        {{ inputType === 'dataref' ? 'data ref' : 'var' }}
      </span>
    </div>

    <!-- Schema hint -->
    <div v-if="schema" class="schema-hint">
      <span class="sh-icon">📋</span>
      <span>{{ schemaHint }}</span>
    </div>

    <!-- Plain text input (mode='text' pada hybrid) -->
    <div v-if="showTextInput" class="text-mode">
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

    <!-- Dropdown trigger -->
    <div v-if="showDropdown" class="vi-wrap" :class="{ open }">
      <div
        ref="triggerRef"
        class="vi-trigger"
        :class="{ 'has-error': error, 'has-value': displayValue }"
        @click="toggle()"
      >
        <template v-if="displayValue">
          <span class="vi-icon">
            {{ modelValue?.type === 'varref' ? '📌' : '📊' }}
          </span>
          <span class="vi-current" :style="inputType !== 'value' ? { color } : {}">{{ displayValue }}</span>
          <button class="vi-clear" @click.stop="clearValue">×</button>
        </template>
        <span v-else class="vi-placeholder">{{ placeholder }}</span>
        <span class="vi-arrow" :class="{ rotated: open }">›</span>
      </div>
    </div>

    <!-- Dropdown panel — teleport ke body -->
    <Teleport to="body">
      <div v-if="open" class="vi-dropdown" :style="dropStyle">
        <div class="vi-search-wrap">
          <input
            ref="searchRef"
            v-model="searchQ"
            class="vi-search"
            placeholder="Cari..."
            @keyup.escape="close"
          />
          <div v-if="schema && !hasCompatibleOptions" class="vi-schema-warn">
            ⚠ Tidak ada data yang sesuai. Tambahkan object dengan field
            <strong>{{ schema.requiredFields?.join(', ') }}</strong>.
          </div>
          <div v-else-if="schema" class="vi-schema-info">
            ✓ = kompatibel &nbsp;⚠ = field tidak lengkap
          </div>
        </div>

        <div class="vi-list">

          <!-- Parameter Method -->
          <DropdownOptionGroup label="⚙️ Parameter Method" :items="filteredParams">
            <div
              v-for="p in filteredParams"
              :key="'param-' + p.varName"
              class="vi-option vi-option-param"
              :class="{ 'compat-warn': schema && p.schema && !paramSchemaCompatible(p) }"
              @click="selectVar(p)"
            >
              <span class="opt-icon">⚙️</span>
              <div class="opt-body">
                <span class="opt-path" style="color:#a78bfa">{{ p.varName }}</span>
                <span v-if="p.schema?.requiredFields" class="opt-fields">
                  butuh: {{ p.schema.requiredFields.join(', ') }}
                </span>
              </div>
              <span
                v-if="schema && p.schema && !paramSchemaCompatible(p)"
                class="opt-compat warn"
                :title="`Param ini butuh: ${p.schema.requiredFields?.join(', ')}, tapi field ini butuh: ${schema.requiredFields?.join(', ')}`"
              >⚠</span>
              <span class="opt-type" style="color:#7c3aed;background:rgba(124,58,237,0.1)">
                {{ p.inputType === 'dataref' && p.schema ? p.schema.description?.split(' ')[0] || 'obj' : p.inputType || 'param' }}
              </span>
            </div>
          </DropdownOptionGroup>

          <!-- Data Factory / Data Registry -->
          <DropdownOptionGroup
            :label="inputType === 'dataref' ? '📊 Data Registry' : '📊 Data Factory'"
            :items="dataOptions"
          >
            <div
              v-for="entry in dataOptions"
              :key="entry.path"
              class="vi-option"
              :class="{ 'compat-ok': entry.compat === 'ok', 'compat-warn': entry.compat !== 'ok' && schema }"
              @click="selectData(entry)"
            >
              <span class="opt-icon">{{ entry.icon }}</span>
              <div class="opt-body">
                <span class="opt-path">{{ entry.path }}</span>
                <span v-if="entry.fields" class="opt-fields">{{ entry.fields.join(', ') }}</span>
                <span v-else-if="entry.filePath" class="opt-fields">{{ entry.filePath }}</span>
              </div>
              <span v-if="schema && entry.compat === 'ok'" class="opt-compat ok">✓</span>
              <span
                v-else-if="schema && entry.compat !== 'ok'"
                class="opt-compat warn"
                :title="`Field tidak lengkap. Butuh: ${schema.requiredFields?.join(', ')}`"
              >⚠</span>
              <span class="opt-type">{{ entry.type }}</span>
            </div>
          </DropdownOptionGroup>

          <!-- Canvas Variables (varref dan value) -->
          <DropdownOptionGroup
            v-if="inputType === 'varref' || inputType === 'value'"
            label="📌 Canvas Variables"
            :items="filteredVars"
          >
            <div
              v-for="v in filteredVars"
              :key="v.varName"
              class="vi-option"
              @click="selectVar(v)"
            >
              <span class="opt-icon">📌</span>
              <span class="opt-path" style="color:#c084fc">${{ v.varName }}</span>
            </div>
          </DropdownOptionGroup>

          <!-- Inline value (saat user mengetik di search, non-dataref) -->
          <DropdownOptionGroup
            v-if="inlineValue"
            label="✏️ Nilai Inline"
            :items="[inlineValue]"
          >
            <div class="vi-option" @click="selectInline(inlineValue)">
              <span class="opt-icon">✏️</span>
              <span class="opt-path" style="color:#fbbf24">'{{ inlineValue }}'</span>
            </div>
          </DropdownOptionGroup>

          <!-- Empty state -->
          <div
            v-if="!dataOptions.length && !varOptions.length && !inlineValue"
            class="vi-empty"
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
@import '@/styles/fieldInput.css';

/* Label row */
.vi-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 11.5px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.vi-label-text { flex: 1; }
.required { color: #ef4444; margin-left: 2px; }

/* Mode toggle */
.mode-toggle { display: flex; gap: 2px; }
.mode-btn {
  padding: 2px 7px; border-radius: 3px; border: 1px solid #1e293b;
  font-size: 11px; font-weight: 700; cursor: pointer;
  background: transparent; color: #334155; transition: all 0.15s;
}
.mode-btn:hover  { border-color: #334155; color: #64748b; }
.mode-btn.active { background: rgba(99,102,241,0.15); border-color: #6366f1; color: #818cf8; }

/* Type badge */
.type-badge {
  font-size: 10px; padding: 1px 5px; border-radius: 3px;
  border: 1px solid; font-weight: 700;
}

/* Schema hint */
.schema-hint {
  display: flex; align-items: center; gap: 5px;
  font-size: 11px; color: #475569; margin-bottom: 5px;
  padding: 4px 7px; background: rgba(99,102,241,0.06);
  border-radius: 4px; border: 1px solid rgba(99,102,241,0.15);
}
.sh-icon { flex-shrink: 0; }

/* Plain text mode */
.text-mode  { position: relative; }
.mode-hint  { font-size: 11px; color: #334155; margin-top: 3px; }

/* Dropdown trigger */
.vi-wrap    { position: relative; }
.vi-trigger {
  display: flex; align-items: center; gap: 6px;
  width: 100%; background: #0f1117; border: 1px solid #334155;
  border-radius: 5px; padding: 5px 8px; cursor: pointer;
  transition: border-color 0.15s; min-height: 30px;
}
.vi-trigger.has-error { border-color: #ef4444; }
.vi-wrap.open .vi-trigger {
  border-color: #6366f1;
  border-bottom-color: transparent;
  border-radius: 5px 5px 0 0;
}
.vi-icon        { font-size: 13px; flex-shrink: 0; }
.vi-current     { font-size: 12.5px; font-family: monospace; color: #38bdf8; flex: 1; }
.vi-placeholder { font-size: 12px; color: #334155; flex: 1; }
.vi-clear {
  background: none; border: none; cursor: pointer;
  color: #475569; font-size: 16px; line-height: 1; padding: 0;
  transition: color 0.1s; flex-shrink: 0;
}
.vi-clear:hover { color: #ef4444; }
.vi-arrow {
  color: #475569; font-size: 16px; flex-shrink: 0;
  transition: transform 0.2s; display: inline-block;
}
.vi-arrow.rotated { transform: rotate(90deg); }

/* Dropdown panel */
.vi-dropdown {
  position: fixed; z-index: 9999;
  background: #0f1117; border: 1px solid #6366f1;
  border-radius: 0 0 5px 5px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  max-height: 240px; display: flex; flex-direction: column;
}
.vi-search-wrap { padding: 6px; border-bottom: 1px solid #1e293b; flex-shrink: 0; }
.vi-search {
  width: 100%; background: #1e293b; border: 1px solid #334155;
  border-radius: 4px; padding: 4px 8px; font-size: 12.5px;
  color: #e2e8f0; outline: none;
}
.vi-search:focus { border-color: #6366f1; }
.vi-schema-info { font-size: 10.5px; color: #334155; padding: 3px 2px 0; }
.vi-schema-warn { font-size: 11px; color: #f59e0b; padding: 4px 2px 0; line-height: 1.4; }
.vi-schema-warn strong { color: #fbbf24; }

/* Option list */
.vi-list { overflow-y: auto; flex: 1; }
.vi-option {
  display: flex; align-items: center; gap: 7px;
  padding: 5px 10px; cursor: pointer; transition: background 0.1s;
}
.vi-option:hover         { background: rgba(255,255,255,0.04); }
.vi-option-param:hover   { background: rgba(124,58,237,0.08); }
.vi-option.compat-warn   { opacity: 0.6; }
.vi-option.compat-warn:hover { opacity: 0.85; }

.opt-icon  { font-size: 12px; flex-shrink: 0; }
.opt-body  { flex: 1; min-width: 0; }
.opt-path  {
  display: block; font-size: 12.5px; font-family: monospace;
  color: #38bdf8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.opt-fields { display: block; font-size: 10.5px; color: #334155; font-family: monospace; }
.opt-compat { font-size: 12px; flex-shrink: 0; font-weight: 700; }
.opt-compat.ok   { color: #10b981; }
.opt-compat.warn { color: #f59e0b; cursor: help; }
.opt-type {
  font-size: 10.5px; color: #334155;
  background: rgba(255,255,255,0.04); border-radius: 3px; padding: 1px 5px; flex-shrink: 0;
}
.vi-empty { font-size: 12px; color: #334155; padding: 12px 10px; text-align: center; }
</style>
