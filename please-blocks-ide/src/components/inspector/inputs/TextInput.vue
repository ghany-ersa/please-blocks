<script setup>
const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  label:       { type: String, default: '' },
  required:    { type: Boolean, default: false },
  error:       { type: String,  default: '' }
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="field">
    <label class="field-label">
      {{ label }}
      <span v-if="required" class="required">*</span>
    </label>
    <input
      class="field-input"
      :class="{ 'has-error': error }"
      type="text"
      :value="modelValue"
      :placeholder="placeholder"
      @input="emit('update:modelValue', $event.target.value)"
    />
    <span v-if="error" class="field-error">{{ error }}</span>
  </div>
</template>

<style scoped>
.field       { margin-bottom: 10px; }
.field-label {
  display: block;
  font-size: 9.5px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.required    { color: #ef4444; margin-left: 2px; }
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
.field-input:focus  { border-color: #6366f1; }
.field-input.has-error { border-color: #ef4444; }
.field-input::placeholder { color: #334155; }
.field-error { font-size: 9px; color: #ef4444; margin-top: 3px; display: block; }
</style>
