<script setup>
/**
 * SelectorInput — input khusus untuk CSS/XPath/id selector.
 * Mendeteksi tipe selector secara otomatis dan menampilkan badge-nya.
 */
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '#selector atau //xpath' },
  label:       { type: String, default: 'Selector' },
  required:    { type: Boolean, default: false },
  error:       { type: String,  default: '' }
})

const emit = defineEmits(['update:modelValue'])

const selectorType = computed(() => {
  const v = props.modelValue || ''
  if (!v) return null
  if (v.startsWith('//') || v.startsWith('(//')) return { label: 'XPath',   color: '#f59e0b' }
  if (v.startsWith('#'))                          return { label: 'ID',     color: '#6366f1' }
  if (v.startsWith('link='))                      return { label: 'Link',   color: '#0ea5e9' }
  if (v.startsWith('.') || /[\s>:+~[\]]/.test(v)) return { label: 'CSS',    color: '#10b981' }
  return { label: 'Name', color: '#94a3b8' }
})
</script>

<template>
  <div class="field">
    <label class="field-label">
      {{ label }}
      <span v-if="required" class="required">*</span>
      <span v-if="selectorType" class="sel-badge" :style="{ color: selectorType.color, borderColor: selectorType.color }">
        {{ selectorType.label }}
      </span>
    </label>
    <input
      class="field-input mono"
      :class="{ 'has-error': error }"
      type="text"
      :value="modelValue"
      :placeholder="placeholder"
      @input="emit('update:modelValue', $event.target.value)"
    />
    <div class="sel-hints">
      <span title="ID">• #id</span>
      <span title="CSS class">• .class</span>
      <span title="XPath">• //xpath</span>
      <span title="Link text">• link=teks</span>
    </div>
    <span v-if="error" class="field-error">{{ error }}</span>
  </div>
</template>

<style scoped>
@import '@/styles/fieldInput.css';

.field-label { display: flex; align-items: center; gap: 5px; }
.required    { margin-left: 0; }
.sel-badge {
  font-size: 8px;
  padding: 1px 5px;
  border-radius: 3px;
  border: 1px solid;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-left: auto;
}
.sel-hints { display: flex; gap: 8px; margin-top: 4px; }
.sel-hints span { font-size: 9px; color: #334155; font-family: monospace; cursor: default; }
</style>
