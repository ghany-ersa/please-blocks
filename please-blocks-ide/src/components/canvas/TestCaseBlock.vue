<script setup>
import { ref, computed } from 'vue'
import { useCanvasStore } from '@/model/stores/canvasStore.js'
import { useBlockRegistry } from '@/model/stores/blockRegistry.js'
import { useDataRegistry } from '@/model/stores/dataRegistry.js'
import { useComponentStore } from '@/model/stores/componentStore.js'
import { validateTestCase } from '@/model/core/blocks/stepValidator.js'
import { useStepSelection } from '@/composables/useStepSelection.js'
import StepItem from './StepItem.vue'

const props = defineProps({
  testCase:  { type: Object, required: true },
  featureId: { type: String, required: true }
})

const canvas    = useCanvasStore()
const registry  = useBlockRegistry()
const dataReg   = useDataRegistry()
const compStore = useComponentStore()
const editing   = ref(false)

const sel = useStepSelection()

// Dialog "Jadikan Component"
const showDialog    = ref(false)
const componentName = ref('')
const extractError  = ref('')

function openExtractDialog() {
  componentName.value = ''
  extractError.value  = ''
  showDialog.value    = true
}

// Bersihkan nama jadi PascalCase identifier yang valid utk nama class
function sanitizeName(raw) {
  const cleaned = raw
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')
  return cleaned
}

function confirmExtract() {
  extractError.value = ''
  const name = sanitizeName(componentName.value)

  if (!name) {
    extractError.value = 'Nama component tidak valid (gunakan huruf/angka).'
    return
  }
  if (/^[0-9]/.test(name)) {
    extractError.value = 'Nama tidak boleh diawali angka.'
    return
  }
  if (!sel.hasSelection.value) {
    extractError.value = 'Tidak ada step yang dipilih.'
    return
  }
  // Cegah nama duplikat
  if (compStore.components.some(c => c.name.toLowerCase() === name.toLowerCase())) {
    extractError.value = `Component "${name}" sudah ada. Pilih nama lain.`
    return
  }

  const indices = sel.selectedIndices.value
  const steps   = canvas.getStepsAt(props.testCase.id, indices)

  // 1. Buat module component + method "run" berisi step terpilih
  const { blockId } = compStore.createComponentFromSteps(name, steps, 'run')

  // 2. Pastikan block sudah terdaftar sebelum mengganti step di canvas
  if (!registry.getById(blockId)) {
    extractError.value = 'Gagal mendaftarkan component. Coba lagi.'
    return
  }

  // 3. Ganti step terpilih dengan satu step yang memanggil component
  canvas.replaceStepsWithComponent(props.testCase.id, indices, blockId)

  showDialog.value = false
  sel.clearSelection()
}

function cancelExtract() {
  showDialog.value   = false
  extractError.value = ''
  sel.clearSelection()
}

const tcValidation = computed(() =>
  validateTestCase(props.testCase, registry, dataReg.entries)
)
const tcErrorCount = computed(() => tcValidation.value.totalErrors)
const draftLabel = ref('')
const isDropOver = ref(false)

const isActive = computed(() => canvas.activeTestCaseId === props.testCase.id)

function startEdit() {
  draftLabel.value = props.testCase.label
  editing.value    = true
}

function saveLabel() {
  if (draftLabel.value.trim()) {
    canvas.updateTestCaseLabel(props.testCase.id, draftLabel.value.trim())
  }
  editing.value = false
}

function onRemove() {
  canvas.removeTestCase(props.testCase.id)
}

function onSelect() {
  canvas.selectTestCase(props.testCase.id, props.featureId)
}

// Drag-and-drop dari palette ke test case
function onDragOver(e) {
  e.preventDefault()
  e.stopPropagation()
  e.dataTransfer.dropEffect = 'copy'
  isDropOver.value = true
}

function onDragLeave(e) {
  if (!e.currentTarget.contains(e.relatedTarget)) {
    isDropOver.value = false
  }
}

function onDrop(e) {
  e.preventDefault()
  e.stopPropagation()
  isDropOver.value = false

  const blockId = e.dataTransfer.getData('text/plain')
  if (blockId) {
    canvas.addStep(props.testCase.id, blockId)
    canvas.clearDrag()
    return
  }

  const reorderData = e.dataTransfer.getData('step-reorder')
  if (reorderData) {
    const { testCaseId, fromIndex } = JSON.parse(reorderData)
    if (testCaseId === props.testCase.id) {
      const lastIndex = props.testCase.steps.length - 1
      if (fromIndex !== lastIndex) {
        canvas.moveStep(props.testCase.id, fromIndex, lastIndex)
      }
    }
  }
}
</script>

<template>
  <div
    class="test-case"
    :class="{ active: isActive, 'drop-over': isDropOver }"
    @click.self="onSelect"
  >
    <!-- Header -->
    <div class="tc-header" @click="onSelect">
      <button
        class="tc-collapse"
        @click.stop="canvas.toggleTestCaseCollapse(testCase.id)"
        :title="testCase.collapsed ? 'Buka' : 'Tutup'"
      >
        {{ testCase.collapsed ? '›' : '⌄' }}
      </button>

      <span v-if="!editing" class="tc-label" @dblclick.stop="startEdit">
        🧪 {{ testCase.label }}
      </span>
      <input
        v-else
        v-model="draftLabel"
        class="tc-label-input"
        @blur="saveLabel"
        @keyup.enter="saveLabel"
        @keyup.escape="editing = false"
        @click.stop
        autofocus
      />

      <span class="tc-count">{{ testCase.steps.length }} step</span>
      <span
        v-if="tcErrorCount > 0"
        class="tc-error-badge"
        :title="`${tcErrorCount} field belum lengkap`"
      >⚠ {{ tcErrorCount }}</span>
      <button class="tc-remove" @click.stop="onRemove" title="Hapus test case">×</button>
    </div>

    <!-- Steps (drop target) -->
    <div
      v-show="!testCase.collapsed"
      class="tc-steps"
      :class="{ 'drop-active': isDropOver }"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <StepItem
        v-for="(step, idx) in testCase.steps"
        :key="step.id"
        :step="step"
        :test-case-id="testCase.id"
        :index="idx"
        :selected="sel.isSelected(idx)"
        :has-selection="sel.hasSelection.value"
        @step-click="sel.onStepClick(idx, $event)"
      />

      <!-- Drop zone hint -->
      <div v-if="testCase.steps.length === 0 || isDropOver" class="drop-hint">
        <span v-if="testCase.steps.length === 0 && !isDropOver">
          Drag blok dari palette ke sini
        </span>
        <span v-else-if="isDropOver" class="drop-hint-active">
          ＋ Lepas untuk tambah blok
        </span>
      </div>

      <!-- Floating toolbar saat ada selection -->
      <div v-if="sel.hasSelection.value" class="extract-toolbar">
        <span class="extract-info">{{ sel.selectedIndices.value.length }} step dipilih</span>
        <button class="extract-btn" @click="openExtractDialog">📦 Jadikan Component</button>
        <button class="extract-cancel" @click="sel.clearSelection()">✕</button>
      </div>
    </div>

    <!-- Dialog nama component -->
    <div v-if="showDialog" class="extract-dialog-overlay" @click.self="cancelExtract">
      <div class="extract-dialog">
        <div class="dialog-title">📦 Jadikan Component</div>
        <p class="dialog-hint">
          {{ sel.selectedIndices.value.length }} step akan dipindah ke sebuah module
          component baru dan dipanggil sebagai satu blok.
        </p>
        <input
          v-model="componentName"
          class="dialog-input"
          placeholder="Nama component (mis. LoginFlow)"
          @keyup.enter="confirmExtract"
          @keyup.escape="cancelExtract"
          autofocus
        />
        <p v-if="extractError" class="dialog-error">{{ extractError }}</p>
        <div class="dialog-actions">
          <button class="dialog-confirm" @click="confirmExtract">Simpan</button>
          <button class="dialog-cancel"  @click="cancelExtract">Batal</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.test-case {
  background: rgba(168,85,247,0.04);
  border: 1px solid rgba(168,85,247,0.18);
  border-radius: 8px;
  margin-bottom: 8px;
  transition: border-color 0.15s;
}
.test-case.active {
  border-color: rgba(168,85,247,0.5);
}
.test-case.drop-over {
  border-color: #a855f7;
  background: rgba(168,85,247,0.08);
}

.tc-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  cursor: pointer;
  border-radius: 7px 7px 0 0;
  transition: background 0.1s;
}
.tc-header:hover { background: rgba(168,85,247,0.06); }

.tc-collapse {
  background: none; border: none; cursor: pointer;
  color: #7c3aed; font-size: 16px; line-height: 1;
  padding: 0; flex-shrink: 0;
}
.tc-label {
  font-size: 13px;
  font-weight: 600;
  color: #c084fc;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tc-label-input {
  flex: 1;
  background: rgba(168,85,247,0.1);
  border: 1px solid #a855f7;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 13px;
  color: #e2e8f0;
  outline: none;
}
.tc-count {
  font-size: 11px;
  color: #6b21a8;
  background: rgba(168,85,247,0.1);
  border-radius: 10px;
  padding: 1px 6px;
  flex-shrink: 0;
}
.tc-error-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 8px;
  background: rgba(239,68,68,0.12);
  border: 1px solid rgba(239,68,68,0.3);
  color: #ef4444;
  flex-shrink: 0;
  cursor: help;
}
.tc-remove {
  background: none; border: none; cursor: pointer;
  color: #475569; font-size: 17px; line-height: 1;
  opacity: 0; padding: 0 2px;
  transition: opacity 0.1s, color 0.1s;
  flex-shrink: 0;
}
.tc-header:hover .tc-remove { opacity: 1; }
.tc-remove:hover { color: #ef4444; }

.tc-steps {
  padding: 4px 8px 8px;
  min-height: 36px;
  border-radius: 0 0 7px 7px;
  transition: background 0.1s;
}
.tc-steps.drop-active {
  background: rgba(168,85,247,0.06);
}
.drop-hint {
  text-align: center;
  padding: 6px 0 2px;
}
.drop-hint span {
  font-size: 11.5px;
  color: #4b5563;
}
.drop-hint-active {
  color: #a855f7 !important;
  font-weight: 600;
}

/* Floating extract toolbar */
.extract-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  padding: 5px 8px;
  background: rgba(168,85,247,0.1);
  border: 1px solid rgba(168,85,247,0.3);
  border-radius: 6px;
}
.extract-info {
  font-size: 11.5px;
  color: #c084fc;
  flex: 1;
}
.extract-btn {
  background: #7c3aed;
  border: none;
  color: #fff;
  font-size: 11.5px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.1s;
}
.extract-btn:hover { background: #6d28d9; }
.extract-cancel {
  background: none;
  border: none;
  color: #6b7280;
  font-size: 14px;
  cursor: pointer;
  padding: 0 3px;
  line-height: 1;
}
.extract-cancel:hover { color: #ef4444; }

/* Dialog overlay */
.extract-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.extract-dialog {
  background: #1e1b2e;
  border: 1px solid rgba(168,85,247,0.4);
  border-radius: 10px;
  padding: 20px;
  min-width: 260px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.dialog-title {
  font-size: 15px;
  font-weight: 700;
  color: #c084fc;
}
.dialog-hint {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.5;
  margin: 0;
}
.dialog-error {
  font-size: 12px;
  color: #f87171;
  margin: 0;
}
.dialog-input {
  background: rgba(168,85,247,0.08);
  border: 1px solid rgba(168,85,247,0.35);
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 14px;
  color: #e2e8f0;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}
.dialog-input:focus { border-color: #a855f7; }
.dialog-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
.dialog-confirm {
  background: #7c3aed;
  border: none;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  padding: 5px 14px;
  border-radius: 5px;
  cursor: pointer;
}
.dialog-confirm:hover { background: #6d28d9; }
.dialog-cancel {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: #94a3b8;
  font-size: 13px;
  padding: 5px 14px;
  border-radius: 5px;
  cursor: pointer;
}
.dialog-cancel:hover { background: rgba(255,255,255,0.08); }
</style>
