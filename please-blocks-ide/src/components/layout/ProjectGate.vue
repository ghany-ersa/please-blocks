<script setup>
/**
 * ProjectGate.vue — layar awal "New / Open Project".
 * Tampil saat belum ada projectPath. Canvas terkunci sampai project dipilih.
 *
 * - New Project : pilih folder (idealnya kosong) → reset stores → set path.
 * - Open Project: pilih folder existing → baca + import isi → set path.
 * Keduanya butuh server lokal (DirectoryPicker & read-project pakai endpoint).
 */
import { ref } from 'vue'
import DirectoryPicker from '@/components/shared/DirectoryPicker.vue'
import { readProject } from '@/model/services/runnerService.js'
import { importProject } from '@/model/core/codegen/projectImporter.js'
import { useRunnerStore }    from '@/model/stores/runnerStore.js'
import { useCanvasStore }    from '@/model/stores/canvasStore.js'
import { useBlockRegistry }  from '@/model/stores/blockRegistry.js'
import { useDataRegistry }   from '@/model/stores/dataRegistry.js'
import { useComponentStore } from '@/model/stores/componentStore.js'

const runner    = useRunnerStore()
const canvas    = useCanvasStore()
const registry  = useBlockRegistry()
const dataReg   = useDataRegistry()
const compStore = useComponentStore()

const mode    = ref(null)   // null | 'new' | 'open' → picker yang aktif
const loading = ref(false)
const error   = ref('')

function startNew()  { error.value = ''; mode.value = 'new' }
function startOpen() { error.value = ''; mode.value = 'open' }
function cancelPick(){ mode.value = null }

async function onFolderSelected(path) {
  const chosen = mode.value
  mode.value = null
  error.value = ''

  if (chosen === 'new') {
    // New Project: workspace BENAR-BENAR kosong — tanpa seed default.
    // (Demo data tersedia lewat tombol "Muat Demo Data" di canvas kosong.)
    canvas.clearCanvas()
    registry.clearDynamicBlocks()
    dataReg.setData({}, {})
    compStore.setComponents([])
    runner.setProjectPath(path)
    return
  }

  // Open Project: baca folder → muat isinya sebagai workspace → set sebagai
  // folder kerja (projectPath). replace=true karena ini MEMBUKA, bukan menyisip.
  loading.value = true
  const res = await readProject(path)
  loading.value = false
  if (!res.ok) { error.value = res.error; return }

  try {
    // Bersihkan total state lama dulu agar canvas murni mencerminkan isi folder.
    // Pakai clear ke KOSONG (bukan reset() yang menyeed DEFAULT Auth/main —
    // itu justru memunculkan "code lama" yang tidak ada di folder).
    registry.clearDynamicBlocks()
    importProject(res.data.files, {
      dataRegistry: dataReg, componentStore: compStore, blockRegistry: registry, canvas
    }, { replace: true })
  } catch (err) {
    error.value = `Gagal membuka project: ${err.message}`
    return
  }
  runner.setProjectPath(path)
}
</script>

<template>
  <div class="gate">
    <div class="gate-card">
      <div class="gate-brand">
        <span class="logo">🧩</span>
        <span class="name">Please Blocks</span>
      </div>
      <p class="gate-sub">Pilih project untuk mulai bekerja</p>

      <template v-if="runner.serverAvailable">
        <div class="gate-actions">
          <button class="gate-btn new" :disabled="loading" @click="startNew">
            <span class="ic">✨</span>
            <span class="t">New Project</span>
            <span class="d">Mulai dari folder kosong</span>
          </button>
          <button class="gate-btn open" :disabled="loading" @click="startOpen">
            <span class="ic">📂</span>
            <span class="t">Open Project</span>
            <span class="d">Buka folder project sebagai workspace</span>
          </button>
        </div>

        <p v-if="loading" class="gate-state">⏳ Membuka project…</p>
        <p v-else-if="error" class="gate-state err">⚠ {{ error }}</p>
      </template>

      <div v-else class="gate-noserver">
        <p class="big">⚠ Server lokal tidak aktif</p>
        <p>Jalankan <code>npm run dev</code> di terminal, lalu muat ulang halaman ini untuk memilih project.</p>
        <button class="retry" @click="runner.checkServer()">↻ Cek lagi</button>
      </div>
    </div>

    <!-- Picker untuk New / Open Project -->
    <DirectoryPicker
      v-if="mode"
      @select="onFolderSelected"
      @close="cancelPick"
    />
  </div>
</template>

<style scoped>
.gate {
  position: fixed; inset: 0;
  display: flex; align-items: center; justify-content: center;
  background: #0a0d14;
}
.gate-card {
  width: 460px; max-width: 92vw;
  background: #111827; border: 1px solid #1e293b; border-radius: 14px;
  padding: 34px 32px;
  box-shadow: 0 24px 60px rgba(0,0,0,0.5);
  text-align: center;
}
.gate-brand { display: flex; align-items: center; justify-content: center; gap: 10px; }
.gate-brand .logo { font-size: 28px; }
.gate-brand .name { font-size: 20px; font-weight: 800; color: #e2e8f0; letter-spacing: -0.01em; }
.gate-sub { margin: 8px 0 26px; font-size: 12px; color: #64748b; }

.gate-actions { display: flex; gap: 12px; }
.gate-btn {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 20px 14px; border-radius: 10px; cursor: pointer;
  background: #0f1117; border: 1px solid #1e293b;
  transition: all 0.15s;
}
.gate-btn:hover:not(:disabled) { border-color: #6366f1; background: rgba(99,102,241,0.06); }
.gate-btn:disabled { opacity: 0.5; cursor: default; }
.gate-btn .ic { font-size: 26px; }
.gate-btn .t  { font-size: 13px; font-weight: 700; color: #e2e8f0; margin-top: 4px; }
.gate-btn .d  { font-size: 10px; color: #64748b; line-height: 1.4; }
.gate-btn.new:hover:not(:disabled)  { border-color: #10b981; background: rgba(16,185,129,0.06); }

.gate-state { margin-top: 18px; font-size: 12px; color: #64748b; }
.gate-state.err { color: #f87171; }

.gate-noserver { color: #94a3b8; }
.gate-noserver .big { font-size: 14px; font-weight: 700; color: #f59e0b; margin-bottom: 8px; }
.gate-noserver p { font-size: 12px; line-height: 1.6; }
.gate-noserver code { background: #1e293b; padding: 1px 7px; border-radius: 4px; color: #7dd3fc; font-family: monospace; }
.retry {
  margin-top: 16px; padding: 6px 16px; border-radius: 6px; cursor: pointer;
  background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.3); color: #818cf8; font-size: 11px;
}
.retry:hover { background: rgba(99,102,241,0.22); }
</style>
