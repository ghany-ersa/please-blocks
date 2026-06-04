<script setup>
import { computed, ref } from 'vue'
import { useBlockRegistry } from '@/stores/blockRegistry.js'
import { useCanvasStore } from '@/stores/canvasStore.js'
import { useDataRegistry } from '@/stores/dataRegistry.js'
import { validateStep } from '@/core/blocks/stepValidator.js'

const props = defineProps({
  step:       { type: Object, required: true },
  testCaseId: { type: String, required: true },
  index:      { type: Number, required: true }
})

const emit = defineEmits(['select'])

const registry = useBlockRegistry()
const canvas   = useCanvasStore()
const dataReg  = useDataRegistry()

const block = computed(() => registry.getById(props.step.blockId))

const isActive = computed(() => canvas.activeStepId === props.step.id)

const validation = computed(() => {
  if (!block.value) return { valid: false, errorCount: 1, errors: {} }
  return validateStep(props.step, block.value, dataReg.entries)
})
const hasError = computed(() => !validation.value.valid)

// 'before' | 'after' | null
const dropPosition = ref(null)

function onSelect() {
  canvas.selectStep(props.step.id)
  emit('select', props.step)
}

function onRemove(e) {
  e.stopPropagation()
  canvas.removeStep(props.step.id)
}

function onDragStart(e) {
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('step-reorder', JSON.stringify({
    stepId:     props.step.id,
    testCaseId: props.testCaseId,
    fromIndex:  props.index
  }))
}

function onDragOver(e) {
  const reorderData = e.dataTransfer.types.includes('step-reorder')
  if (!reorderData) return
  e.preventDefault()
  e.stopPropagation()
  e.dataTransfer.dropEffect = 'move'
  const rect = e.currentTarget.getBoundingClientRect()
  dropPosition.value = (e.clientY - rect.top) < rect.height / 2 ? 'before' : 'after'
}

function onDragLeave(e) {
  if (!e.currentTarget.contains(e.relatedTarget)) {
    dropPosition.value = null
  }
}

function onDrop(e) {
  const raw = e.dataTransfer.getData('step-reorder')
  if (!raw) return
  e.preventDefault()
  e.stopPropagation()

  const { stepId, testCaseId, fromIndex } = JSON.parse(raw)
  if (testCaseId !== props.testCaseId || stepId === props.step.id) {
    dropPosition.value = null
    return
  }

  const toIndex = dropPosition.value === 'before' ? props.index : props.index + 1
  const adjusted = fromIndex < toIndex ? toIndex - 1 : toIndex
  canvas.moveStep(props.testCaseId, fromIndex, adjusted)
  dropPosition.value = null
}
</script>

<template>
  <div
    v-if="block"
    class="step-item"
    :class="{ active: isActive, 'has-error': hasError, 'drop-before': dropPosition === 'before', 'drop-after': dropPosition === 'after' }"
    :style="{ '--step-color': block.color, '--step-bg': block.colorBg }"
    draggable="true"
    @dragstart="onDragStart"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    @click="onSelect"
  >
    <span class="step-num">{{ index + 1 }}</span>
    <span class="step-icon">{{ block.icon }}</span>
    <span class="step-label">{{ block.label }}</span>

    <!-- Preview input utama jika ada -->
    <span v-if="step.inputs.selector" class="step-selector">{{ step.inputs.selector }}</span>
    <span v-else-if="step.inputs.urlTarget?.path" class="step-selector">{{ step.inputs.urlTarget.path }}</span>
    <span v-else-if="step.inputs.urlExpected?.path" class="step-selector">{{ step.inputs.urlExpected.path }}</span>

    <!-- Validation error badge -->
    <span
      v-if="hasError"
      class="step-error-badge"
      :title="Object.values(validation.errors).join('\n')"
    >
      ⚠ {{ validation.errorCount }}
    </span>

    <button class="step-remove" @click="onRemove" title="Hapus step">×</button>
  </div>

  <!-- Fallback jika block ID tidak ditemukan -->
  <div v-else class="step-item step-unknown">
    <span class="step-num">{{ index + 1 }}</span>
    <span>⚠️ Block tidak dikenal: {{ step.blockId }}</span>
    <button class="step-remove" @click="onRemove">×</button>
  </div>
</template>

<style scoped>
.step-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border-radius: 5px;
  background: var(--step-bg);
  border: 1px solid transparent;
  cursor: pointer;
  transition: border-color 0.12s, background 0.12s;
  margin-bottom: 3px;
  user-select: none;
  position: relative;
}
.step-item:hover { border-color: var(--step-color); }
.step-item.active {
  border-color: var(--step-color);
  background: color-mix(in srgb, var(--step-bg) 200%, transparent);
}
.step-item.has-error {
  border-color: rgba(239,68,68,0.5) !important;
  background: rgba(239,68,68,0.05);
}
.step-item.has-error.active {
  border-color: rgba(239,68,68,0.8) !important;
}
.step-item:hover .step-remove { opacity: 1; }

.step-num {
  font-size: 9px;
  color: #475569;
  font-family: monospace;
  min-width: 14px;
  text-align: right;
  flex-shrink: 0;
}
.step-icon  { font-size: 11px; flex-shrink: 0; }
.step-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--step-color);
  flex-shrink: 0;
}
.step-selector {
  font-size: 9px;
  color: #475569;
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.step-remove {
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
.step-remove:hover { color: #ef4444; opacity: 1; }
.step-error-badge {
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
.step-unknown {
  background: rgba(239,68,68,0.08);
  border-color: rgba(239,68,68,0.3);
  color: #fca5a5;
  font-size: 10px;
}
.step-item.drop-before { box-shadow: 0 -2px 0 #a855f7; }
.step-item.drop-after  { box-shadow: 0  2px 0 #a855f7; }
</style>
