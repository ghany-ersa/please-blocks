<script setup>
import { useCanvasStore } from '@/stores/canvasStore.js'
import StepCard from '@/components/shared/StepCard.vue'

const props = defineProps({
  step:         { type: Object,  required: true },
  testCaseId:   { type: String,  required: true },
  index:        { type: Number,  required: true },
  selected:     { type: Boolean, default: false },
  hasSelection: { type: Boolean, default: false }
})

const emit = defineEmits(['select', 'step-click'])

const canvas = useCanvasStore()

function onRemove() {
  canvas.removeStep(props.step.id)
}

function onUpdateInput(fieldName, value) {
  canvas.updateStepInputs(props.step.id, { [fieldName]: value })
}

function onUpdateNote(note) {
  canvas.updateStepNote(props.step.id, note)
}

function onReorder(fromIndex, toIndex) {
  canvas.moveStep(props.testCaseId, fromIndex, toIndex)
}
</script>

<template>
  <StepCard
    :step="step"
    :index="index"
    :selected="selected"
    :has-selection="hasSelection"
    :selectable="true"
    :draggable="true"
    :editable="true"
    :test-case-id="testCaseId"
    @select="emit('select', $event)"
    @step-click="emit('step-click', $event)"
    @remove="onRemove"
    @update-input="onUpdateInput"
    @update-note="onUpdateNote"
    @reorder="onReorder"
  />
</template>
