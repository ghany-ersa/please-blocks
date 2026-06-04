<script setup>
/**
 * StepCard — komponen step tunggal yang dipakai di canvas DAN ComponentBuilder.
 *
 * Props:
 *   step         { blockId, inputs }   — data step
 *   index        Number                — urutan tampil (1-based di UI)
 *   selected     Boolean               — highlight selection (canvas)
 *   draggable    Boolean               — aktifkan drag reorder (canvas)
 *   testCaseId   String                — dibutuhkan untuk drag reorder (canvas)
 *   editable     Boolean               — tampilkan form input saat expand (builder + canvas)
 *
 * Emits:
 *   select          (event)            — klik biasa (tanpa modifier)
 *   step-click      (event)            — semua klik (termasuk ctrl/shift)
 *   remove          ()                 — tombol hapus diklik
 *   update-input    (fieldName, value) — nilai field berubah
 *   reorder         (fromIndex, toIndex) — drag selesai
 */
import { ref, computed } from 'vue'
import { useBlockRegistry }  from '@/stores/blockRegistry.js'
import { useCanvasStore }    from '@/stores/canvasStore.js'
import { useDataRegistry }   from '@/stores/dataRegistry.js'
import { useComponentStore } from '@/stores/componentStore.js'
import { validateStep }      from '@/core/blocks/stepValidator.js'
import TextInput        from '@/components/inspector/inputs/TextInput.vue'
import SelectorInput    from '@/components/inspector/inputs/SelectorInput.vue'
import NumberInput      from '@/components/inspector/inputs/NumberInput.vue'
import DataRefSelect    from '@/components/inspector/inputs/DataRefSelect.vue'
import HybridValueInput from '@/components/inspector/inputs/HybridValueInput.vue'

const props = defineProps({
  step:         { type: Object,  required: true },
  index:        { type: Number,  required: true },
  selected:     { type: Boolean, default: false },
  hasSelection: { type: Boolean, default: false },
  selectable:   { type: Boolean, default: false },
  draggable:    { type: Boolean, default: false },
  testCaseId:   { type: String,  default: '' },
  editable:     { type: Boolean, default: true },
  methodParams: { type: Array,   default: () => [] }
})

const emit = defineEmits(['select', 'step-click', 'remove', 'update-input', 'update-note', 'reorder'])

const registry  = useBlockRegistry()
const canvas    = useCanvasStore()
const dataReg   = useDataRegistry()
const compStore = useComponentStore()

const block     = computed(() => registry.getById(props.step.blockId))
const extraVars = computed(() =>
  props.methodParams.map(p =>
    typeof p === 'string'
      ? { varName: p, label: p, inputType: 'value', schema: null }
      : { varName: p.varName, label: p.varName, inputType: p.inputType || 'value', schema: p.schema || null }
  )
)
const isActive = computed(() => canvas.activeStepId === props.step.id)

const validation = computed(() => {
  if (!block.value) return { valid: false, errorCount: 1, errors: {} }
  return validateStep(props.step, block.value, dataReg.entries)
})
const hasError = computed(() => !validation.value.valid)

// ── Expand / collapse ─────────────────────────────────────────────
const expanded = ref(false)

function toggleExpand() {
  if (!props.editable || !block.value?.inputs?.length) return
  expanded.value = !expanded.value
}

// Preview nilai utama untuk collapsed header
const preview = computed(() => {
  const inp = props.step.inputs || {}
  if (inp.selector)          return inp.selector
  if (inp.urlTarget?.path)   return inp.urlTarget.path
  if (inp.urlExpected?.path) return inp.urlExpected.path
  if (inp.label)             return inp.label
  const first = Object.values(inp).find(v => v && typeof v !== 'object')
  return first ? String(first) : ''
})

// ── Click handling ────────────────────────────────────────────────
function onHeaderClick(e) {
  if (props.editable && block.value?.inputs?.length) {
    toggleExpand()
  } else {
    // Tidak ada expand — header click = select step biasa
    canvas.selectStep(props.step.id)
    emit('select', props.step)
  }
}

// Checkbox diklik — toggle selection
function onCheckboxClick(e) {
  e.stopPropagation()
  emit('step-click', e)
}

function onDblClick(e) {
  if (block.value?.type === 'component' && block.value?.componentId) {
    e.stopPropagation()
    compStore.openBuilderFor(block.value.componentId)
  }
}

// ── Drag reorder ──────────────────────────────────────────────────
const dropPosition = ref(null)

function onDragStart(e) {
  if (!props.draggable) return
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('step-reorder', JSON.stringify({
    stepId:     props.step.id,
    testCaseId: props.testCaseId,
    fromIndex:  props.index
  }))
}

function onDragOver(e) {
  if (!props.draggable) return
  if (!e.dataTransfer.types.includes('step-reorder')) return
  e.preventDefault()
  e.stopPropagation()
  e.dataTransfer.dropEffect = 'move'
  const rect = e.currentTarget.getBoundingClientRect()
  dropPosition.value = (e.clientY - rect.top) < rect.height / 2 ? 'before' : 'after'
}

function onDragLeave(e) {
  if (!e.currentTarget.contains(e.relatedTarget)) dropPosition.value = null
}

function onDrop(e) {
  if (!props.draggable) return
  const raw = e.dataTransfer.getData('step-reorder')
  if (!raw) return
  e.preventDefault()
  e.stopPropagation()
  const { stepId, testCaseId, fromIndex } = JSON.parse(raw)
  if (testCaseId !== props.testCaseId || stepId === props.step.id) {
    dropPosition.value = null
    return
  }
  const toIndex  = dropPosition.value === 'before' ? props.index : props.index + 1
  const adjusted = fromIndex < toIndex ? toIndex - 1 : toIndex
  emit('reorder', fromIndex, adjusted)
  dropPosition.value = null
}
</script>

<template>
  <!-- Unknown block fallback -->
  <div v-if="!block" class="step-card step-unknown">
    <span class="sc-num">{{ index + 1 }}</span>
    <span class="sc-unknown-text">⚠️ Block tidak dikenal: {{ step.blockId }}</span>
    <button class="sc-remove" @click.stop="emit('remove')">×</button>
  </div>

  <!-- Normal step card -->
  <div
    v-else
    class="step-card"
    :class="{
      active:        isActive,
      'has-error':   hasError,
      selected,
      expanded,
      'drop-before': dropPosition === 'before',
      'drop-after':  dropPosition === 'after'
    }"
    :style="{ '--sc-color': block.color, '--sc-bg': block.colorBg }"
    :draggable="draggable"
    @dragstart="onDragStart"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    @dblclick="onDblClick"
  >
    <!-- ── Collapsed header ─────────────────────────────────── -->
    <div class="sc-header" @click="onHeaderClick">
      <!-- Checkbox area (selectable mode: canvas) -->
      <span
        v-if="selectable"
        class="sc-checkbox-wrap"
        :class="{ visible: selected || hasSelection }"
        @click.stop="onCheckboxClick"
      >
        <span class="sc-checkbox" :class="{ checked: selected }">
          {{ selected ? '☑' : '☐' }}
        </span>
      </span>
      <!-- Nomor (visible saat tidak ada selection atau bukan selectable) -->
      <span v-if="!selectable || (!selected && !hasSelection)" class="sc-num">{{ index + 1 }}</span>

      <!-- Chevron (hanya jika editable dan ada fields) -->
      <span
        v-if="editable && block.inputs?.length"
        class="sc-chevron"
      >{{ expanded ? '⌄' : '›' }}</span>

      <span class="sc-icon">{{ block.icon }}</span>
      <span class="sc-label">{{ block.label }}</span>

      <!-- Preview nilai utama saat collapsed -->
      <span v-if="!expanded && preview" class="sc-preview">{{ preview }}</span>

      <!-- Badge error -->
      <span
        v-if="hasError"
        class="sc-error-badge"
        :title="Object.values(validation.errors).join('\n')"
      >⚠ {{ validation.errorCount }}</span>

      <button class="sc-remove" @click.stop="emit('remove')" title="Hapus step">×</button>
    </div>

    <!-- ── Expanded form ────────────────────────────────────── -->
    <div v-if="expanded && block.inputs?.length" class="sc-fields">
      <template v-for="field in block.inputs" :key="field.name">
        <NumberInput
          v-if="field.type === 'number'"
          :label="field.label"
          :placeholder="field.placeholder"
          :required="field.required"
          :model-value="step.inputs[field.name] ?? ''"
          @update:model-value="emit('update-input', field.name, $event)"
        />
        <DataRefSelect
          v-else-if="field.type === 'dataref' || field.type === 'varref'"
          :label="field.label"
          :placeholder="field.placeholder"
          :required="field.required"
          :schema="field.schema || null"
          :input-type="field.type"
          :extra-vars="extraVars"
          :model-value="step.inputs[field.name] ?? ''"
          @update:model-value="emit('update-input', field.name, $event)"
        />
        <HybridValueInput
          v-else-if="field.type === 'value'"
          :label="field.label"
          :placeholder="field.placeholder"
          :required="field.required"
          :extra-vars="extraVars"
          :model-value="step.inputs[field.name] ?? ''"
          @update:model-value="emit('update-input', field.name, $event)"
        />
        <SelectorInput
          v-else-if="field.type === 'selector'"
          :label="field.label"
          :placeholder="field.placeholder"
          :required="field.required"
          :model-value="step.inputs[field.name] ?? ''"
          @update:model-value="emit('update-input', field.name, $event)"
        />
        <TextInput
          v-else
          :label="field.label"
          :placeholder="field.placeholder"
          :required="field.required"
          :model-value="step.inputs[field.name] ?? ''"
          @update:model-value="emit('update-input', field.name, $event)"
        />
      </template>

      <!-- Note / konteks opsional -->
      <div class="sc-note-field">
        <label class="sc-note-label">Konteks <span class="sc-note-opt">opsional</span></label>
        <textarea
          class="sc-note-input"
          :value="step.note || ''"
          placeholder="Tulis konteks atau tujuan step ini..."
          rows="2"
          @input="emit('update-note', $event.target.value)"
          @click.stop
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.step-card {
  border-radius: 5px;
  background: var(--sc-bg);
  border: 1px solid transparent;
  margin-bottom: 3px;
  user-select: none;
  transition: border-color 0.12s, background 0.12s;
  overflow: visible;
}
.step-card:hover          { border-color: var(--sc-color); }
.step-card.active         { border-color: var(--sc-color); background: color-mix(in srgb, var(--sc-bg) 200%, transparent); }
.step-card.selected       { outline: 2px solid rgba(168,85,247,0.6); outline-offset: 1px; }
.step-card.has-error      { border-color: rgba(239,68,68,0.5) !important; background: rgba(239,68,68,0.05); }
.step-card.has-error.active { border-color: rgba(239,68,68,0.8) !important; }
.step-card.expanded       { border-color: var(--sc-color); }
.step-card:hover .sc-remove { opacity: 1; }

.drop-before { box-shadow: 0 -2px 0 #a855f7; }
.drop-after  { box-shadow: 0  2px 0 #a855f7; }

/* ── Header ──────────────────────────────────────────────── */
.sc-header {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 8px;
  cursor: pointer;
  border-radius: 5px;
}
.step-card.expanded .sc-header {
  border-bottom: 1px solid rgba(255,255,255,0.06);
  border-radius: 5px 5px 0 0;
}

.sc-num {
  font-size: 9px;
  color: #475569;
  font-family: monospace;
  min-width: 14px;
  text-align: right;
  flex-shrink: 0;
}

/* Checkbox selection */
.sc-checkbox-wrap {
  min-width: 14px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s;
  cursor: pointer;
}
.sc-checkbox-wrap.visible { opacity: 1; }
.step-card:hover .sc-checkbox-wrap { opacity: 1; }
.sc-checkbox {
  font-size: 12px;
  color: #475569;
  line-height: 1;
  user-select: none;
  transition: color 0.1s;
}
.sc-checkbox.checked { color: #a855f7; }
.sc-checkbox-wrap:hover .sc-checkbox { color: #a855f7; }
.sc-chevron {
  font-size: 11px;
  color: #475569;
  flex-shrink: 0;
  width: 10px;
  text-align: center;
  transition: color 0.1s;
}
.sc-icon  { font-size: 11px; flex-shrink: 0; }
.sc-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--sc-color);
  flex-shrink: 0;
}
.sc-preview {
  font-size: 9px;
  color: #475569;
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}
.sc-error-badge {
  font-size: 8px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 8px;
  background: rgba(239,68,68,0.15);
  border: 1px solid rgba(239,68,68,0.3);
  color: #ef4444;
  flex-shrink: 0;
  cursor: help;
  white-space: nowrap;
}
.sc-remove {
  background: none;
  border: none;
  color: #475569;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0 2px;
  border-radius: 3px;
  opacity: 0;
  transition: opacity 0.1s, color 0.1s;
  flex-shrink: 0;
  margin-left: auto;
}
.sc-remove:hover { color: #ef4444; opacity: 1; }

/* ── Expanded fields ─────────────────────────────────────── */
.sc-fields {
  padding: 6px 10px 8px;
  background: rgba(0,0,0,0.2);
  border-radius: 0 0 4px 4px;
}

/* Note field di expanded form */
.sc-note-field {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255,255,255,0.05);
}
.sc-note-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 9.5px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}
.sc-note-opt {
  font-size: 8px;
  font-weight: 400;
  color: #334155;
  text-transform: none;
  letter-spacing: 0;
}
.sc-note-input {
  width: 100%;
  background: rgba(255,255,255,0.03);
  border: 1px solid #1e293b;
  border-radius: 4px;
  padding: 5px 8px;
  font-size: 10px;
  color: #94a3b8;
  font-style: italic;
  line-height: 1.5;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
  font-family: inherit;
  transition: border-color 0.15s;
}
.sc-note-input:focus { border-color: #334155; color: #e2e8f0; }
.sc-note-input::placeholder { color: #334155; font-style: italic; }

/* ── Unknown block ───────────────────────────────────────── */
.step-unknown {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  background: rgba(239,68,68,0.08);
  border-color: rgba(239,68,68,0.3);
  color: #fca5a5;
  font-size: 10px;
}
.sc-unknown-text { flex: 1; }
</style>
