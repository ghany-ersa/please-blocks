<script setup>
/**
 * BlockInspector — panel kanan atas.
 * Tampil saat QA mengklik sebuah Step di canvas.
 * Merender field input sesuai schema block.inputs[].
 */
import { computed, watch, ref } from 'vue'
import { useCanvasStore }    from '@/stores/canvasStore.js'
import { useBlockRegistry }  from '@/stores/blockRegistry.js'
import TextInput      from './inputs/TextInput.vue'
import SelectorInput  from './inputs/SelectorInput.vue'
import NumberInput    from './inputs/NumberInput.vue'
import DataRefSelect  from './inputs/DataRefSelect.vue'

const canvas   = useCanvasStore()
const registry = useBlockRegistry()

// Step yang sedang aktif
const activeStep = computed(() => {
  if (!canvas.activeStepId) return null
  for (const f of canvas.features) {
    for (const tc of f.testCases) {
      const s = tc.steps.find(s => s.id === canvas.activeStepId)
      if (s) return s
    }
  }
  return null
})

// Block definition dari step aktif
const block = computed(() =>
  activeStep.value ? registry.getById(activeStep.value.blockId) : null
)

// Salinan lokal inputs untuk editing — di-sync ke store saat berubah
const localInputs = ref({})

// Saat step aktif berubah → reset localInputs dari step.inputs
watch(activeStep, (step) => {
  localInputs.value = step ? { ...step.inputs } : {}
}, { immediate: true })

// Saat localInputs berubah → update store (debounce ringan pakai watch deep)
watch(localInputs, (val) => {
  if (activeStep.value) {
    canvas.updateStepInputs(activeStep.value.id, val)
  }
}, { deep: true })

// Validasi per field
const errors = computed(() => {
  if (!block.value) return {}
  const errs = {}
  for (const inputDef of block.value.inputs) {
    if (inputDef.required) {
      const v = localInputs.value[inputDef.name]
      if (!v && v !== 0) {
        errs[inputDef.name] = `${inputDef.label} wajib diisi`
      }
    }
  }
  return errs
})

const hasErrors = computed(() => Object.keys(errors.value).length > 0)

function updateField(name, value) {
  localInputs.value = { ...localInputs.value, [name]: value }
}
</script>

<template>
  <div class="inspector">
    <!-- Tidak ada step dipilih -->
    <div v-if="!activeStep" class="inspector-empty">
      <div class="empty-icon">🔍</div>
      <p>Klik sebuah step di canvas untuk mengedit propertinya</p>
    </div>

    <!-- Step aktif tapi block tidak dikenal -->
    <div v-else-if="!block" class="inspector-error">
      <p>⚠️ Block tidak dikenal: <code>{{ activeStep.blockId }}</code></p>
    </div>

    <!-- Block Inspector utama -->
    <template v-else>
      <!-- Header -->
      <div class="insp-header" :style="{ '--block-color': block.color }">
        <span class="insp-icon">{{ block.icon }}</span>
        <div class="insp-meta">
          <div class="insp-name">{{ block.label }}</div>
          <div class="insp-type">{{ block.type }}</div>
        </div>
        <div v-if="hasErrors" class="insp-err-badge">{{ Object.keys(errors).length }} error</div>
      </div>

      <!-- Description -->
      <p class="insp-desc">{{ block.description }}</p>

      <!-- Input fields -->
      <div class="insp-fields">
        <template v-for="inputDef in block.inputs" :key="inputDef.name">

          <SelectorInput
            v-if="inputDef.type === 'selector'"
            :label="inputDef.label"
            :placeholder="inputDef.placeholder"
            :required="inputDef.required"
            :error="errors[inputDef.name]"
            :model-value="localInputs[inputDef.name] || ''"
            @update:model-value="updateField(inputDef.name, $event)"
          />

          <NumberInput
            v-else-if="inputDef.type === 'number'"
            :label="inputDef.label"
            :placeholder="inputDef.placeholder"
            :required="inputDef.required"
            :error="errors[inputDef.name]"
            :unit="inputDef.name === 'duration' || inputDef.name === 'wait' ? 'ms' : ''"
            :model-value="localInputs[inputDef.name] ?? ''"
            @update:model-value="updateField(inputDef.name, $event)"
          />

          <DataRefSelect
            v-else-if="inputDef.type === 'dataref' || inputDef.type === 'varref'"
            :label="inputDef.label"
            :placeholder="inputDef.placeholder"
            :required="inputDef.required"
            :error="errors[inputDef.name]"
            :input-type="inputDef.type"
            :model-value="localInputs[inputDef.name] ?? ''"
            @update:model-value="updateField(inputDef.name, $event)"
          />

          <!-- value: bisa inline string atau DataRef path -->
          <DataRefSelect
            v-else-if="inputDef.type === 'value'"
            :label="inputDef.label"
            :placeholder="inputDef.placeholder"
            :required="inputDef.required"
            :error="errors[inputDef.name]"
            input-type="value"
            :model-value="localInputs[inputDef.name] ?? ''"
            @update:model-value="updateField(inputDef.name, $event)"
          />

          <!-- text (default) -->
          <TextInput
            v-else
            :label="inputDef.label"
            :placeholder="inputDef.placeholder"
            :required="inputDef.required"
            :error="errors[inputDef.name]"
            :model-value="localInputs[inputDef.name] || ''"
            @update:model-value="updateField(inputDef.name, $event)"
          />

        </template>
      </div>

      <!-- Output badge jika block menghasilkan variabel -->
      <div v-if="block.output" class="insp-output">
        <span class="output-label">📤 Output</span>
        <span class="output-val">
          simpan ke variabel
          <code>{{ localInputs.varName || '...' }}</code>
        </span>
      </div>

      <!-- Sprint 4 note untuk run -->
      <div class="insp-note">
        💡 Buka <strong>📊 Data Manager</strong> untuk mengelola URL dan Account yang tersedia di dropdown
      </div>
    </template>
  </div>
</template>

<style scoped>
.inspector {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Empty / error states */
.inspector-empty, .inspector-error {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  text-align: center;
}
.empty-icon { font-size: 28px; }
.inspector-empty p { font-size: 11px; color: #374151; line-height: 1.5; }
.inspector-error p { font-size: 11px; color: #fca5a5; }
.inspector-error code { font-family: monospace; font-size: 10px; }

/* Header */
.insp-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(0,0,0,0.2);
  border-bottom: 1px solid #1e293b;
  flex-shrink: 0;
}
.insp-icon { font-size: 18px; flex-shrink: 0; }
.insp-meta { flex: 1; min-width: 0; }
.insp-name {
  font-size: 12px;
  font-weight: 700;
  color: var(--block-color, #e2e8f0);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.insp-type {
  font-size: 9px;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-top: 1px;
}
.insp-err-badge {
  font-size: 9px;
  background: rgba(239,68,68,0.15);
  color: #ef4444;
  border-radius: 10px;
  padding: 2px 7px;
  font-weight: 700;
  flex-shrink: 0;
}

/* Description */
.insp-desc {
  font-size: 10px;
  color: #475569;
  padding: 8px 12px 4px;
  line-height: 1.4;
  flex-shrink: 0;
}

/* Fields */
.insp-fields {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
}

/* Output */
.insp-output {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-top: 1px solid #1e293b;
  flex-shrink: 0;
}
.output-label { font-size: 9.5px; color: #475569; font-weight: 600; }
.output-val   { font-size: 10px; color: #94a3b8; }
.output-val code {
  font-family: monospace;
  background: rgba(255,255,255,0.06);
  padding: 1px 5px;
  border-radius: 3px;
  color: #c084fc;
  font-size: 10px;
}

/* Sprint 3 note */
.insp-note {
  font-size: 9.5px;
  color: #374151;
  padding: 8px 12px;
  border-top: 1px solid #1e293b;
  line-height: 1.4;
  flex-shrink: 0;
}
.insp-note strong { color: #475569; }
</style>
