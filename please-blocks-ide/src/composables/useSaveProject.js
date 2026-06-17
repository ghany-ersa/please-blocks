/**
 * useSaveProject — ViewModel untuk aksi Simpan ke Project.
 * Generate file dari canvas → tulis ke folder workspace (prune file basi).
 * State idle | saving | saved | error.
 */
import { ref } from 'vue'
import { exportProject } from '@/model/core/codegen/projectExporter.js'
import { writeProject }  from '@/model/services/runnerService.js'
import { useRunnerStore }    from '@/model/stores/runnerStore.js'
import { useCanvasStore }    from '@/model/stores/canvasStore.js'
import { useBlockRegistry }  from '@/model/stores/blockRegistry.js'
import { useDataRegistry }   from '@/model/stores/dataRegistry.js'
import { useComponentStore } from '@/model/stores/componentStore.js'

export function useSaveProject() {
  const runner    = useRunnerStore()
  const canvas    = useCanvasStore()
  const registry  = useBlockRegistry()
  const dataReg   = useDataRegistry()
  const compStore = useComponentStore()

  const saveState   = ref('idle')   // 'idle' | 'saving' | 'saved' | 'error'
  const saveMessage = ref('')

  async function triggerSave() {
    if (!runner.serverAvailable) {
      saveState.value = 'error'
      saveMessage.value = 'Server tidak aktif — jalankan npm run dev.'
      return
    }
    // projectPath dijamin ada (sudah lewat gate New/Open)
    await doSave()
  }

  async function doSave() {
    saveState.value = 'saving'
    saveMessage.value = ''
    const files = exportProject(canvas, registry, dataReg, compStore, runner.projectName)
    const res = await writeProject(runner.projectPath, files)

    if (res.ok && (!res.errors || res.errors.length === 0)) {
      saveState.value = 'saved'
      saveMessage.value = 'Tersimpan'
    } else {
      saveState.value = 'error'
      saveMessage.value = res.error || 'Gagal menyimpan'
    }
    setTimeout(() => { if (saveState.value !== 'saving') saveState.value = 'idle' }, 2500)
  }

  return { saveState, saveMessage, triggerSave }
}
