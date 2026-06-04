<script setup>
defineProps({
  label: { type: String, required: true },
  items: { type: Array,  required: true }
})
defineEmits(['select'])
</script>

<template>
  <template v-if="items.length">
    <div class="opt-group-label">{{ label }}</div>
    <slot />
  </template>
</template>

<style scoped>
.opt-group-label {
  font-size: 9px;
  font-weight: 700;
  color: #334155;
  padding: 6px 10px 3px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
</style>
