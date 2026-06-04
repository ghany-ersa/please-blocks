<script setup>
/**
 * DataRefSelect — dropdown reaktif dari dataRegistry.
 *
 * Mendukung prop `schema` untuk validasi dan filtering kompatibilitas:
 *   - Entry yang kompatibel → tampil normal
 *   - Entry yang inkompatibel → tetap tampil tapi diberi marker ⚠ dan warna redup
 *   - Masih bisa dipilih tapi BlockInspector akan menampilkan error schema
 *
 * Ini memberi QA visibilitas penuh sambil tetap menginformasikan ketidaksesuaian.
 */
import { ref, computed, watch, nextTick } from 'vue'
import { useDataRegistry }       from '@/stores/dataRegistry.js'
import { useCanvasStore }        from '@/stores/canvasStore.js'
import { checkEntryCompatibility } from '@/core/blocks/schemaValidator.js'

const props = defineProps({
  modelValue:  { default: '' },
  label:       { type: String,  default: '' },
  placeholder: { type: String,  default: 'Pilih atau ketik...' },
  required:    { type: Boolean, default: false },
  error:       { type: String,  default: '' },
  inputType:   { type: String,  default: 'dataref' },  // 'dataref' | 'value' | 'varref'
  schema:      { type: Object,  default: null }         // block input schema (optional)
})

const emit = defineEmits(['update:modelValue'])

const dataReg = useDataRegistry()
const canvas  = useCanvasStore()

const open      = ref(false)
const searchQ   = ref('')
const inputRef  = ref(null)
const triggerRef = ref(null)

// Posisi dropdown di-teleport ke body
const dropStyle = ref({})

// Nilai yang tampil di trigger
const displayValue = computed(() => {
  const v = props.modelValue
  if (!v) return ''
  if (typeof v === 'object' && v.type === 'dataref') return v.path
  if (typeof v === 'object' && v.type === 'varref')  return `$${v.varName}`
  return String(v)
})

const colorMap = { dataref: '#0ea5e9', value: '#94a3b8', varref: '#c084fc' }
const color    = computed(() => colorMap[props.inputType] || '#94a3b8')

// ── Opsi dropdown ────────────────────────────────────────────────

// DataRef entries dengan info kompatibilitas skema
const dataOptions = computed(() => {
  const q = searchQ.value.toLowerCase()

  return dataReg.entries
    .filter(e => e.compatibleWith.includes(props.inputType))
    .filter(e => !q || e.path.toLowerCase().includes(q))
    .map(e => {
      const compat = props.schema
        ? checkEntryCompatibility(e, props.schema)
        : 'ok'
      return { ...e, compat }
    })
    // Urutkan: compatible dulu, inkompatibel di bawah
    .sort((a, b) => {
      if (a.compat === 'ok' && b.compat !== 'ok') return -1
      if (a.compat !== 'ok' && b.compat === 'ok') return 1
      return 0
    })
})

// Apakah ada setidaknya satu entry yang compatible dengan skema
const hasCompatibleOptions = computed(() =>
  !props.schema || dataOptions.value.some(e => e.compat === 'ok')
)

// Canvas variables
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
  const q = searchQ.value.toLowerCase()
  return vars.filter(v => !q || v.varName.toLowerCase().includes(q))
})

// Inline (hanya untuk tipe value + ada search query)
const inlineValue = computed(() =>
  searchQ.value && props.inputType !== 'dataref' ? searchQ.value : null
)

// ── Select handlers ──────────────────────────────────────────────

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

// ── Open/close ───────────────────────────────────────────────────

function toggle() {
  open.value = !open.value
  if (open.value) {
    searchQ.value = ''
    nextTick(() => {
      positionDropdown()
      inputRef.value?.focus()
    })
  }
}

function positionDropdown() {
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  const dropHeight = 240

  if (spaceBelow >= dropHeight || spaceBelow >= 120) {
    // Buka ke bawah
    dropStyle.value = {
      top:   `${rect.bottom + window.scrollY}px`,
      left:  `${rect.left  + window.scrollX}px`,
      width: `${rect.width}px`
    }
  } else {
    // Buka ke atas
    dropStyle.value = {
      top:   `${rect.top + window.scrollY - dropHeight}px`,
      left:  `${rect.left + window.scrollX}px`,
      width: `${rect.width}px`
    }
  }
}

function close() {
  open.value    = false
  searchQ.value = ''
}

function onOutsideClick(e) {
  // Tutup jika klik bukan di trigger (.drs-wrap) maupun dropdown (.drs-dropdown)
  if (!e.target.closest('.drs-wrap') && !e.target.closest('.drs-dropdown')) close()
}

watch(open, (val) => {
  if (val) document.addEventListener('click', onOutsideClick)
  else     document.removeEventListener('click', onOutsideClick)
})

// ── Schema hint text ─────────────────────────────────────────────
const schemaHint = computed(() => {
  if (!props.schema) return ''
  return `Butuh: ${props.schema.requiredFields?.join(', ')} · Contoh: ${props.schema.example || ''}`
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

    <!-- Schema hint (jika ada skema) -->
    <div v-if="schema" class="schema-hint">
      <span class="sh-icon">📋</span>
      <span>{{ schemaHint }}</span>
    </div>

    <div class="drs-wrap" :class="{ open }">
      <!-- Trigger -->
      <div
        ref="triggerRef"
        class="drs-trigger"
        :class="{ 'has-error': error, 'has-value': displayValue }"
        @click="toggle"
      >
        <span v-if="displayValue" class="drs-current" :style="{ color }">{{ displayValue }}</span>
        <span v-else class="drs-placeholder">{{ placeholder }}</span>
        <button v-if="displayValue" class="drs-clear" @click.stop="clearValue">×</button>
        <span class="drs-arrow" :class="{ rotated: open }">›</span>
      </div>
    </div>

    <!-- Dropdown di-teleport ke body agar tidak terpotong overflow:hidden -->
    <Teleport to="body">
      <div v-if="open" class="drs-dropdown" :style="dropStyle">
        <div class="drs-search-wrap">
          <input
            ref="inputRef"
            v-model="searchQ"
            class="drs-search"
            placeholder="Cari..."
            @keyup.escape="close"
          />
          <!-- Info skema di dalam dropdown -->
          <div v-if="schema && !hasCompatibleOptions" class="drs-schema-warn">
            ⚠ Tidak ada data yang sesuai. Buka Data Manager dan tambahkan object dengan field
            <strong>{{ schema.requiredFields?.join(', ') }}</strong>.
          </div>
          <div v-else-if="schema" class="drs-schema-info">
            ✓ = kompatibel &nbsp;⚠ = field tidak lengkap
          </div>
        </div>

        <div class="drs-list">
          <!-- DataRef entries -->
          <template v-if="dataOptions.length">
            <div class="drs-group-label">📊 Data Registry</div>
            <div
              v-for="entry in dataOptions"
              :key="entry.path"
              class="drs-option"
              :class="{
                'compat-ok':    entry.compat === 'ok',
                'compat-warn':  entry.compat !== 'ok' && schema
              }"
              @click="selectData(entry)"
            >
              <span class="opt-icon">{{ entry.icon }}</span>
              <div class="opt-body">
                <span class="opt-path">{{ entry.path }}</span>
                <span v-if="entry.fields" class="opt-fields">
                  {{ entry.fields.join(', ') }}
                </span>
              </div>
              <span v-if="schema && entry.compat === 'ok'"      class="opt-compat ok">✓</span>
              <span v-else-if="schema && entry.compat !== 'ok'" class="opt-compat warn"
                :title="`Field tidak lengkap. Butuh: ${schema.requiredFields?.join(', ')}`">⚠</span>
              <span class="opt-type">{{ entry.type }}</span>
            </div>
          </template>

          <!-- Canvas variables -->
          <template v-if="(inputType === 'varref' || inputType === 'value') && varOptions.length">
            <div class="drs-group-label">📌 Canvas Variables</div>
            <div
              v-for="v in varOptions"
              :key="v.varName"
              class="drs-option"
              @click="selectVar(v)"
            >
              <span class="opt-icon">📌</span>
              <span class="opt-path" style="color:#c084fc">${{ v.varName }}</span>
            </div>
          </template>

          <!-- Inline value -->
          <template v-if="inlineValue && inputType !== 'dataref'">
            <div class="drs-group-label">✏️ Nilai Inline</div>
            <div class="drs-option" @click="selectInline(inlineValue)">
              <span class="opt-icon">✏️</span>
              <span class="opt-path" style="color:#fbbf24">'{{ inlineValue }}'</span>
            </div>
          </template>

          <!-- Empty -->
          <div v-if="!dataOptions.length && !varOptions.length && !inlineValue" class="drs-empty">
            {{ searchQ
              ? `Tidak ada hasil untuk "${searchQ}"`
              : 'Belum ada data. Buka Data Manager.' }}
          </div>
        </div>
      </div>
    </Teleport>

    <span v-if="error" class="field-error">{{ error }}</span>
  </div>
</template>

<style scoped>
.field       { margin-bottom: 10px; }
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

/* Schema hint */
.schema-hint {
  display: flex; align-items: center; gap: 5px;
  font-size: 9px; color: #475569; margin-bottom: 5px;
  padding: 4px 7px; background: rgba(99,102,241,0.06);
  border-radius: 4px; border: 1px solid rgba(99,102,241,0.15);
}
.sh-icon { flex-shrink: 0; }

/* Trigger */
.drs-wrap    { position: relative; }  /* tetap untuk border-radius trigger saat open */
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
  color: #475569; font-size: 14px; line-height: 1; padding: 0; flex-shrink: 0; transition: color 0.1s;
}
.drs-clear:hover { color: #ef4444; }
.drs-arrow { color: #475569; font-size: 14px; flex-shrink: 0; transition: transform 0.2s; display: inline-block; }
.drs-arrow.rotated { transform: rotate(90deg); }

/* Dropdown — di-teleport ke body, posisi via inline style */
.drs-dropdown {
  position: fixed; z-index: 9999;
  background: #0f1117; border: 1px solid #6366f1;
  border-radius: 0 0 5px 5px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  max-height: 240px; display: flex; flex-direction: column;
}
.drs-search-wrap { padding: 6px; border-bottom: 1px solid #1e293b; flex-shrink: 0; }
.drs-search {
  width: 100%; background: #1e293b; border: 1px solid #334155;
  border-radius: 4px; padding: 4px 8px; font-size: 10.5px; color: #e2e8f0; outline: none;
}
.drs-search:focus { border-color: #6366f1; }

/* Schema info/warn di dalam dropdown */
.drs-schema-info {
  font-size: 8.5px; color: #334155; padding: 3px 2px 0;
}
.drs-schema-warn {
  font-size: 9px; color: #f59e0b; padding: 4px 2px 0; line-height: 1.4;
}
.drs-schema-warn strong { color: #fbbf24; }

.drs-list { overflow-y: auto; flex: 1; }
.drs-group-label {
  font-size: 9px; font-weight: 700; color: #334155;
  padding: 6px 10px 3px; text-transform: uppercase; letter-spacing: 0.06em;
}
.drs-option {
  display: flex; align-items: center; gap: 7px;
  padding: 5px 10px; cursor: pointer; transition: background 0.1s;
}
.drs-option:hover { background: rgba(255,255,255,0.04); }

/* Kompatibilitas */
.drs-option.compat-ok { }
.drs-option.compat-warn { opacity: 0.6; }
.drs-option.compat-warn:hover { opacity: 0.85; }

.opt-icon { font-size: 10px; flex-shrink: 0; }
.opt-body { flex: 1; min-width: 0; }
.opt-path {
  display: block; font-size: 10.5px; font-family: monospace;
  color: #38bdf8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.opt-fields {
  display: block; font-size: 8.5px; color: #334155; font-family: monospace;
}
.opt-compat {
  font-size: 10px; flex-shrink: 0; font-weight: 700;
}
.opt-compat.ok   { color: #10b981; }
.opt-compat.warn { color: #f59e0b; cursor: help; }
.opt-type {
  font-size: 8.5px; color: #334155;
  background: rgba(255,255,255,0.04); border-radius: 3px; padding: 1px 5px; flex-shrink: 0;
}
.drs-empty { font-size: 10px; color: #334155; padding: 12px 10px; text-align: center; }
.field-error { font-size: 9px; color: #ef4444; margin-top: 3px; display: block; }
</style>
