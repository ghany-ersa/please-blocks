<script setup>
/**
 * DataRefInput — input untuk tipe 'dataref' dan 'value'.
 *
 * Sprint 2: text input dengan tampilan khusus (border warna data).
 * Sprint 3: akan diganti dengan dropdown dari Data Registry.
 *
 * Format yang diterima oleh block codegen:
 *   - String path  → 'URL.login' (user ketik langsung)
 *   - Object ref   → { type: 'dataref', path: 'URL.login' }
 */
import { computed } from 'vue'

const props = defineProps({
  modelValue: { default: '' },
  placeholder: { type: String, default: 'URL.login atau teks langsung' },
  label:       { type: String, default: '' },
  required:    { type: Boolean, default: false },
  error:       { type: String,  default: '' },
  inputType:   { type: String,  default: 'dataref' }  // 'dataref' | 'value' | 'varref'
})

const emit = defineEmits(['update:modelValue'])

// Nilai yang tampil di input — bisa string atau path dari object
const displayValue = computed(() => {
  const v = props.modelValue
  if (!v) return ''
  if (typeof v === 'object' && v.type === 'dataref') return v.path
  if (typeof v === 'object' && v.type === 'varref')  return v.varName
  return String(v)
})

function onInput(e) {
  const raw = e.target.value
  if (!raw) {
    emit('update:modelValue', '')
    return
  }

  // Jika user ketik path seperti URL.login / ACCOUNT.valid → wrap sebagai dataref
  if (props.inputType === 'dataref' && /^[A-Z][A-Z_]*\.[a-zA-Z.]+$/.test(raw)) {
    emit('update:modelValue', { type: 'dataref', path: raw })
  } else {
    // Nilai biasa (inline string)
    emit('update:modelValue', raw)
  }
}

const colorMap = {
  dataref: '#0ea5e9',
  value:   '#94a3b8',
  varref:  '#c084fc'
}
const color = computed(() => colorMap[props.inputType] || '#94a3b8')
</script>

<template>
  <div class="field">
    <label class="field-label">
      {{ label }}
      <span v-if="required" class="required">*</span>
      <span class="type-badge" :style="{ color: color, borderColor: color }">
        {{ inputType === 'dataref' ? 'data ref' : inputType === 'varref' ? 'var' : 'value' }}
      </span>
    </label>
    <input
      class="field-input mono"
      :class="{ 'has-error': error }"
      :style="{ '--focus-color': color }"
      type="text"
      :value="displayValue"
      :placeholder="placeholder"
      @input="onInput"
    />
    <div v-if="inputType === 'dataref'" class="hint">
      Ketik path data: <code>URL.login</code> · <code>ACCOUNT.valid</code>
    </div>
    <div v-else-if="inputType === 'varref'" class="hint">
      Gunakan nama variabel dari blok Get Text/Value sebelumnya
    </div>
    <span v-if="error" class="field-error">{{ error }}</span>
  </div>
</template>

<style scoped>
.field       { margin-bottom: 10px; }
.field-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 9.5px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.required { color: #ef4444; }
.type-badge {
  font-size: 8px;
  padding: 1px 5px;
  border-radius: 3px;
  border: 1px solid;
  font-weight: 700;
  margin-left: auto;
}
.field-input {
  width: 100%;
  background: #0f1117;
  border: 1px solid #334155;
  border-radius: 5px;
  padding: 5px 8px;
  font-size: 11px;
  color: #e2e8f0;
  outline: none;
  transition: border-color 0.15s;
}
.field-input.mono { font-family: 'SF Mono', 'Fira Code', monospace; }
.field-input:focus  { border-color: var(--focus-color, #6366f1); }
.field-input.has-error { border-color: #ef4444; }
.field-input::placeholder { color: #334155; }
.hint { font-size: 9px; color: #334155; margin-top: 4px; line-height: 1.4; }
.hint code {
  font-family: monospace;
  background: rgba(255,255,255,0.05);
  padding: 1px 4px;
  border-radius: 2px;
  color: #475569;
}
.field-error { font-size: 9px; color: #ef4444; margin-top: 3px; display: block; }
</style>
