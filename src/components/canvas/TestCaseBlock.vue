<script setup>
import { ref, computed, watch } from 'vue'
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

// Sinkronkan multi-select (index-based, lokal) ke store (ID-based, global)
// agar bisa dibaca lintas komponen — mis. shortcut Ctrl+C untuk copy banyak step.
watch(sel.selectedIndices, (indices) => {
  const stepIds = indices.map(i => props.testCase.steps[i]?.id).filter(Boolean)
  canvas.setSelectedStepIds(props.testCase.id, stepIds)
})

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
const tcDropPosition = ref(null)   // 'before' | 'after' — reorder test case

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
  // Biarkan drag test case (tc-reorder) lolos/bubble ke parent .test-case
  if (e.dataTransfer.types.includes('tc-reorder')) return
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
  // Biarkan drop test case (tc-reorder) lolos/bubble ke parent .test-case
  if (e.dataTransfer.types.includes('tc-reorder')) return
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

// Drag-and-drop test case (reorder dalam feature / pindah antar feature)
function onTcDragStart(e) {
  e.stopPropagation()
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('tc-reorder', JSON.stringify({
    testCaseId:      props.testCase.id,
    fromFeatureId:   props.featureId
  }))
}

function onTcDragOver(e) {
  if (!e.dataTransfer.types.includes('tc-reorder')) return
  e.preventDefault()
  e.stopPropagation()
  e.dataTransfer.dropEffect = 'move'
  const rect = e.currentTarget.getBoundingClientRect()
  tcDropPosition.value = (e.clientY - rect.top) < rect.height / 2 ? 'before' : 'after'
}

function onTcDragLeave(e) {
  if (!e.currentTarget.contains(e.relatedTarget)) tcDropPosition.value = null
}

function onTcDrop(e) {
  const raw = e.dataTransfer.getData('tc-reorder')
  if (!raw) return
  e.preventDefault()
  e.stopPropagation()
  const { testCaseId, fromFeatureId } = JSON.parse(raw)
  const position = tcDropPosition.value
  tcDropPosition.value = null
  if (testCaseId === props.testCase.id) return

  const feature = canvas.featureById(props.featureId)
  if (!feature) return
  const targetIndex = feature.testCases.findIndex(t => t.id === props.testCase.id)
  const toIndex = position === 'before' ? targetIndex : targetIndex + 1
  canvas.moveTestCase(testCaseId, fromFeatureId, props.featureId, toIndex)
}
</script>

<template>
  <div
    class="test-case"
    :class="{
      active: isActive,
      'drop-over': isDropOver,
      'tc-drop-before': tcDropPosition === 'before',
      'tc-drop-after':  tcDropPosition === 'after'
    }"
    @click.self="onSelect"
    @dragover="onTcDragOver"
    @dragleave="onTcDragLeave"
    @drop="onTcDrop"
  >
    <!-- Header -->
    <div
      class="tc-header"
      draggable="true"
      @click="onSelect"
      @dragstart="onTcDragStart"
    >
      <button
        class="tc-collapse"
        @click.stop="canvas.toggleTestCaseCollapse(testCase.id)"
        :title="testCase.collapsed ? 'Buka' : 'Tutup'"
      >
        {{ testCase.collapsed ? '›' : '⌄' }}
      </button>

      <button
        class="tc-toggle"
        :class="{ enabled: testCase.enabled !== false }"
        @click.stop="canvas.toggleTestCaseEnabled(testCase.id)"
        :title="testCase.enabled !== false ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'"
      >
        {{ testCase.enabled !== false ? '👁' : '🙈' }}
      </button>

      <span v-if="!editing" class="tc-label" @dblclick.stop="startEdit"
        :class="{ disabled: testCase.enabled === false }">
         {{ testCase.label }}
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
  background: var(--color-purple-bg);
  border: 1px solid rgba(168,85,247,0.18);
  border-radius: var(--radius-xl);
  margin-bottom: var(--space-2);
  transition: border-color var(--transition-base);
}
.test-case.active { border-color: rgba(168,85,247,0.5); }
.test-case.drop-over {
  border-color: var(--color-purple);
  background: var(--color-purple-bg-mid);
}
.test-case.tc-drop-before { box-shadow: 0 -2px 0 var(--color-purple); }
.test-case.tc-drop-after  { box-shadow: 0  2px 0 var(--color-purple); }

.tc-header {
  display: flex;
  align-items: center;
  gap: var(--space-1-5);
  padding: var(--pad-item-y) var(--pad-item-x);
  cursor: pointer;
  border-radius: 7px 7px 0 0;
  transition: background var(--transition-fast);
}
.tc-header:hover { background: rgba(168,85,247,0.06); }
.tc-header { cursor: grab; }
.tc-header:active { cursor: grabbing; }

.tc-collapse {
  background: none; border: none; cursor: pointer;
  color: var(--color-purple-dark); font-size: var(--text-xl); line-height: var(--leading-none);
  padding: 0; flex-shrink: 0;
}
.tc-toggle {
  background: none; border: none; cursor: pointer;
  font-size: var(--text-sm); padding: 0 var(--space-1); flex-shrink: 0;
  color: var(--color-text-faint); transition: color var(--transition-base), opacity var(--transition-base);
}
.tc-toggle.enabled { color: var(--color-success); opacity: 0; }
.tc-toggle:not(.enabled) { color: var(--color-text-ghost); }
.tc-header:hover .tc-toggle.enabled { opacity: 1; }
.tc-toggle:hover { opacity: 0.8; }
.tc-label.disabled { opacity: 0.4; text-decoration: line-through; }
.tc-label {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-purple-light);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tc-label-input {
  flex: 1;
  background: var(--color-purple-bg-mid);
  border: 1px solid var(--color-purple);
  border-radius: var(--radius-sm);
  padding: 2px var(--space-1-5);
  font-size: var(--text-base);
  color: var(--color-text-primary);
  outline: none;
}
.tc-count {
  font-size: var(--text-xs);
  color: var(--color-purple-comp);
  background: var(--color-purple-bg-mid);
  border-radius: var(--radius-pill);
  padding: var(--pad-badge-y) var(--space-1-5);
  flex-shrink: 0;
}
.tc-error-badge {
  font-size: var(--text-2xs);
  font-weight: var(--font-bold);
  padding: var(--pad-badge-y) var(--pad-badge-x);
  border-radius: var(--radius-pill);
  background: var(--color-danger-bg);
  border: 1px solid var(--color-danger-border);
  color: var(--color-danger);
  flex-shrink: 0;
  cursor: help;
}
.tc-remove {
  background: none; border: none; cursor: pointer;
  color: var(--color-text-faint); font-size: 17px; line-height: var(--leading-none);
  opacity: 0; padding: 0 var(--space-0-5);
  transition: opacity var(--transition-fast), color var(--transition-fast);
  flex-shrink: 0;
}
.tc-header:hover .tc-remove { opacity: 1; }
.tc-remove:hover { color: var(--color-danger); }

.tc-steps {
  padding: var(--space-1) var(--space-2) var(--space-2);
  min-height: 36px;
  border-radius: 0 0 7px 7px;
  transition: background var(--transition-fast);
}
.tc-steps.drop-active { background: rgba(168,85,247,0.06); }

.drop-hint {
  text-align: center;
  padding: var(--space-1-5) 0 var(--space-0-5);
}
.drop-hint span { font-size: var(--text-xs); color: var(--color-text-ghost); }
.drop-hint-active { color: var(--color-purple) !important; font-weight: var(--font-semibold); }

/* Floating extract toolbar */
.extract-toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-1-5);
  margin-top: var(--space-1-5);
  padding: var(--pad-btn-y) var(--space-2);
  background: var(--color-purple-bg-mid);
  border: 1px solid rgba(168,85,247,0.3);
  border-radius: var(--radius-lg);
}
.extract-info { font-size: var(--text-xs); color: var(--color-purple-light); flex: 1; }
.extract-btn {
  background: var(--color-purple-dark);
  border: none;
  color: #fff;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  padding: var(--space-px) var(--space-2);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
}
.extract-btn:hover { background: var(--color-purple-dark); }
.extract-cancel {
  background: none; border: none;
  color: var(--color-status-stopped);
  font-size: var(--text-md);
  cursor: pointer;
  padding: 0 var(--space-px);
  line-height: var(--leading-none);
}
.extract-cancel:hover { color: var(--color-danger); }

/* Dialog overlay */
.extract-dialog-overlay {
  position: fixed; inset: 0;
  background: var(--color-black-50);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
}
.extract-dialog {
  background: var(--color-surface-panel-alt);
  border: 1px solid rgba(168,85,247,0.4);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  min-width: 260px;
  display: flex; flex-direction: column;
  gap: var(--space-3);
}
.dialog-title { font-size: var(--text-lg); font-weight: var(--font-bold); color: var(--color-purple-light); }
.dialog-hint  { font-size: var(--text-sm); color: var(--color-text-secondary); line-height: var(--leading-normal); margin: 0; }
.dialog-error { font-size: var(--text-sm); color: var(--color-danger-light); margin: 0; }
.dialog-input {
  background: var(--color-purple-bg);
  border: 1px solid rgba(168,85,247,0.35);
  border-radius: var(--radius-lg);
  padding: var(--space-1-5) var(--space-2-5);
  font-size: var(--text-md);
  color: var(--color-text-primary);
  outline: none;
  width: 100%;
  box-sizing: border-box;
}
.dialog-input:focus { border-color: var(--color-purple); }
.dialog-actions { display: flex; gap: var(--space-2); justify-content: flex-end; }
.dialog-confirm {
  background: var(--color-purple-dark); border: none; color: #fff;
  font-size: var(--text-base); font-weight: var(--font-semibold);
  padding: var(--pad-btn-y) 14px; border-radius: var(--radius-md); cursor: pointer;
}
.dialog-confirm:hover { background: var(--color-purple-dark); }
.dialog-cancel {
  background: var(--color-white-5); border: 1px solid rgba(255,255,255,0.1);
  color: var(--color-text-secondary);
  font-size: var(--text-base); padding: var(--pad-btn-y) 14px; border-radius: var(--radius-md); cursor: pointer;
}
.dialog-cancel:hover { background: rgba(255,255,255,0.08); }
</style>
