<script setup>
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  label:      { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="field field-checkbox">
    <label class="checkbox-label">
      <input
        type="checkbox"
        :checked="modelValue"
        @change="emit('update:modelValue', $event.target.checked)"
      />
      <span>{{ label }}</span>
    </label>
  </div>
</template>

<style scoped>
@import '@/styles/fieldInput.css';

.field-checkbox { display: flex; align-items: center; }
.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-1-5);
  font-size: var(--text-base);
  color: var(--color-text-secondary);
  cursor: pointer;
  user-select: none;
}
.checkbox-label input[type="checkbox"] {
  width: 15px;
  height: 15px;
  accent-color: var(--color-primary);
  cursor: pointer;
}
</style>
