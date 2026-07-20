import { ref, onMounted, onUnmounted } from 'vue'
import { useCanvasStore } from '@/model/stores/canvasStore.js'

/**
 * useCanvasClipboard — shortcut Ctrl/Cmd+C & Ctrl/Cmd+V untuk testCase & step.
 *
 * - Ctrl/Cmd+C: jika ada multi-select step (Ctrl+click / checkbox, lihat
 *   selectedStepIds), salin SEMUA step terpilih. Jika tidak, salin step aktif
 *   (activeStepId) jika ada, jika tidak salin testCase aktif (activeTestCaseId).
 * - Ctrl/Cmd+V: tempel sesuai tipe clipboard, disisipkan tepat setelah
 *   item aktif saat ini (bisa di testCase/feature berbeda dari sumber copy).
 * - Tidak aktif saat fokus berada di input/textarea/contenteditable (mis. saat
 *   sedang rename label) agar tidak bentrok dengan copy-paste teks native.
 */
export function useCanvasClipboard() {
  const canvas = useCanvasStore()
  const clipboard = ref(null) // { type: 'testcase', data } | { type: 'steps', data: [] } | null

  function isTypingTarget(el) {
    if (!el) return false
    const tag = el.tagName?.toLowerCase()
    return tag === 'input' || tag === 'textarea' || el.isContentEditable
  }

  function handleCopy() {
    const found = canvas.testCaseById(canvas.activeTestCaseId)

    if (canvas.selectedStepIds.length && found) {
      const steps = canvas.selectedStepIds
        .map(id => found.testCase.steps.find(s => s.id === id))
        .filter(Boolean)
      if (steps.length) {
        clipboard.value = { type: 'steps', data: steps.map(s => ({ ...s, inputs: { ...s.inputs } })) }
        return
      }
    }

    if (canvas.activeStepId && found) {
      const step = found.testCase.steps.find(s => s.id === canvas.activeStepId)
      if (step) clipboard.value = { type: 'steps', data: [{ ...step, inputs: { ...step.inputs } }] }
      return
    }

    if (found) {
      clipboard.value = {
        type: 'testcase',
        data: {
          ...found.testCase,
          steps: found.testCase.steps.map(s => ({ ...s, inputs: { ...s.inputs } }))
        }
      }
    }
  }

  function handlePaste() {
    if (!clipboard.value) return
    if (clipboard.value.type === 'steps') canvas.pasteSteps(clipboard.value.data)
    else if (clipboard.value.type === 'testcase') canvas.pasteTestCase(clipboard.value.data)
  }

  function onKeydown(e) {
    const isMeta = e.ctrlKey || e.metaKey
    if (!isMeta || isTypingTarget(e.target)) return

    if (e.key === 'c' || e.key === 'C') {
      handleCopy()
    } else if (e.key === 'v' || e.key === 'V') {
      e.preventDefault()
      handlePaste()
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onUnmounted(() => window.removeEventListener('keydown', onKeydown))

  return { clipboard }
}
