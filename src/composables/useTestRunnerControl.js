/**
 * useTestRunnerControl — ViewModel untuk memicu eksekusi test.
 * Real run (mocha via server) jika tersedia, selain itu mode simulasi.
 */
import { exportProject, slugify } from '@/model/core/codegen/projectExporter.js'
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

  // Validate: cek alur test via simulasi (cepat, tanpa server). Dipakai topbar.
  function validate() {
    runner.open()
    runner.runSimulation(canvas.features, registry, dataReg.entries)
  }

  // Run Real: jalankan mocha sungguhan via server bila tersedia, selain itu
  // fallback ke simulasi. Dipakai panel Test Runner.
  // Fitur yang di-skip (enabled === false) tidak diikutkan dalam run sungguhan.
  function runReal() {
    runner.open()
    const activeFeatures = canvas.features.filter(f => f.enabled !== false)
    if (runner.canRunReal) {
      const files = exportProject(canvas, registry, dataReg, compStore, runner.projectName)
        .filter(f => f.category !== 'spec' || f.enabled !== false)
      runner.runReal(files, runner.projectPath, activeFeatures)
    } else {
      runner.runSimulation(canvas.features, registry, dataReg.entries)
    }
  }

  // Run Feature: jalankan hanya satu fitur sungguhan via server.
  function runFeature(featureId) {
    const feature = canvas.features.find(f => f.id === featureId)
    if (!feature) return

    runner.open()
    if (runner.canRunReal) {
      const files    = exportProject(canvas, registry, dataReg, compStore, runner.projectName)
      const specFile = `feature/${slugify(feature.label)}.spec.js`
      runner.runReal(files, runner.projectPath, [feature], specFile)
    } else {
      runner.runSimulation([feature], registry, dataReg.entries)
    }
  }

  return { validate, runReal, runFeature }
}
