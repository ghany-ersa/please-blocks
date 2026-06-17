/**
 * useTestRunnerControl — ViewModel untuk memicu eksekusi test.
 * Real run (mocha via server) jika tersedia, selain itu mode simulasi.
 */
import { exportProject } from '@/model/core/codegen/projectExporter.js'
import { useRunnerStore }    from '@/model/stores/runnerStore.js'
import { useCanvasStore }    from '@/model/stores/canvasStore.js'
import { useBlockRegistry }  from '@/model/stores/blockRegistry.js'
import { useDataRegistry }   from '@/model/stores/dataRegistry.js'
import { useComponentStore } from '@/model/stores/componentStore.js'

export function useTestRunnerControl() {
  const runner    = useRunnerStore()
  const canvas    = useCanvasStore()
  const registry  = useBlockRegistry()
  const dataReg   = useDataRegistry()
  const compStore = useComponentStore()

  function triggerRun() {
    runner.open()
    if (runner.canRunReal) {
      const files = exportProject(canvas, registry, dataReg, compStore, runner.projectName)
      runner.runReal(files, runner.projectPath)
    } else {
      runner.runSimulation(canvas.features, registry, dataReg.entries)
    }
  }

  return { triggerRun }
}
