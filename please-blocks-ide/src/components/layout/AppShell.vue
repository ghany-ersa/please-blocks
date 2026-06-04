<script setup>
import { ref } from 'vue'
import BlockPalette      from '@/components/palette/BlockPalette.vue'
import CanvasEditor      from '@/components/canvas/CanvasEditor.vue'
import BlockInspector    from '@/components/inspector/BlockInspector.vue'
import CodePreview       from '@/components/canvas/CodePreview.vue'
import DataManager       from '@/components/manager/DataManager.vue'
import ComponentBuilder  from '@/components/manager/ComponentBuilder.vue'

const showDataManager      = ref(false)
const showComponentBuilder = ref(false)

// Toggle right panel visibility
const showRightPanel = ref(true)

// Resize handle untuk panel kanan (Inspector vs CodePreview)
const inspectorHeightPct = ref(55)  // Inspector ambil 55% tinggi panel kanan
const isResizing = ref(false)
const panelRef = ref(null)

function startResize(e) {
  isResizing.value = true
  const startY   = e.clientY
  const startPct = inspectorHeightPct.value

  function onMove(ev) {
    if (!panelRef.value) return
    const panelH = panelRef.value.getBoundingClientRect().height
    const delta  = ev.clientY - startY
    const newPct = Math.min(80, Math.max(20, startPct + (delta / panelH) * 100))
    inspectorHeightPct.value = newPct
  }

  function onUp() {
    isResizing.value = false
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }

  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}
</script>

<template>
  <div class="shell" :class="{ 'is-resizing': isResizing }">

    <!-- Top bar -->
    <header class="topbar">
      <div class="topbar-left">
        <span class="logo">🧩</span>
        <span class="app-name">Please Blocks</span>
        <span class="app-version">v0.3 — Sprint 3</span>
      </div>
      <div class="topbar-center">
        <span class="project-name">my-automation-tests</span>
      </div>
      <div class="topbar-right">
        <button class="topbar-btn" :class="{ active: showDataManager }" @click="showDataManager = true" title="Data Manager">📊 Data</button>
        <button class="topbar-btn" :class="{ active: showComponentBuilder }" @click="showComponentBuilder = true" title="Component Builder">📦 Components</button>
        <button
          class="topbar-btn"
          :class="{ active: showRightPanel }"
          @click="showRightPanel = !showRightPanel"
          title="Toggle Inspector & Code Preview"
        >
          ⚙️ Inspector
        </button>
        <button class="topbar-btn run" title="Run Test (Sprint 5)">▶ Run</button>
      </div>
    </header>

    <!-- Main: palette | canvas | inspector+preview -->
    <div class="main">
      <BlockPalette />
      <CanvasEditor />

      <!-- Right panel: Inspector (atas) + CodePreview (bawah) -->
      <div
        v-if="showRightPanel"
        class="right-panel"
        ref="panelRef"
      >
        <!-- Block Inspector -->
        <div
          class="right-top"
          :style="{ height: inspectorHeightPct + '%' }"
        >
          <div class="panel-label">Inspector</div>
          <BlockInspector />
        </div>

        <!-- Resize handle -->
        <div
          class="resize-handle"
          @mousedown.prevent="startResize"
          title="Drag untuk resize"
        ></div>

        <!-- Code Preview -->
        <div class="right-bottom">
          <div class="panel-label">Code Preview</div>
          <CodePreview />
        </div>
      </div>
    </div>

    <!-- Modals -->
    <DataManager
      v-if="showDataManager"
      @close="showDataManager = false"
    />
    <ComponentBuilder
      v-if="showComponentBuilder"
      @close="showComponentBuilder = false"
    />

    <!-- Status bar -->
    <footer class="statusbar">
      <span>please-test v1.0.0</span>
      <span>·</span>
      <span>mocha + selenium-webdriver</span>
      <span class="spacer"></span>
      <span class="status-dot"></span>
      <span>Sprint 3 — Data Manager + Component Builder</span>
    </footer>
  </div>
</template>

<style scoped>
.shell {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.shell.is-resizing { user-select: none; cursor: row-resize; }

/* TOP BAR */
.topbar {
  display: flex;
  align-items: center;
  padding: 0 16px;
  height: 40px;
  background: #0f1117;
  border-bottom: 1px solid #1e293b;
  flex-shrink: 0;
  gap: 12px;
}
.topbar-left   { display: flex; align-items: center; gap: 8px; flex: 1; }
.topbar-center { flex: 1; text-align: center; }
.topbar-right  { display: flex; align-items: center; gap: 6px; flex: 1; justify-content: flex-end; }

.logo      { font-size: 16px; }
.app-name  { font-size: 13px; font-weight: 700; color: #e2e8f0; }
.app-version {
  font-size: 10px; color: #334155;
  background: #1e293b;
  padding: 2px 7px; border-radius: 10px;
}
.project-name { font-size: 11px; color: #64748b; font-family: monospace; }

.topbar-btn {
  padding: 4px 10px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 5px;
  font-size: 10px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s;
}
.topbar-btn:hover        { color: #94a3b8; border-color: #475569; }
.topbar-btn.active       { background: rgba(99,102,241,0.15); border-color: #6366f1; color: #818cf8; }
.topbar-btn.run          { background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.3); color: #10b981; }
.topbar-btn.run:hover    { background: rgba(16,185,129,0.2); border-color: #10b981; }

/* MAIN */
.main {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

/* RIGHT PANEL */
.right-panel {
  width: 268px;
  min-width: 268px;
  display: flex;
  flex-direction: column;
  background: #111827;
  border-left: 1px solid #1e293b;
  flex-shrink: 0;
  overflow: hidden;
}

.right-top {
  display: flex;
  flex-direction: column;
  min-height: 120px;
  overflow: hidden;
}

.right-bottom {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100px;
  overflow: hidden;
}

.panel-label {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #334155;
  padding: 5px 12px 4px;
  background: #0f1117;
  border-bottom: 1px solid #1e293b;
  flex-shrink: 0;
}

/* Drag resize handle */
.resize-handle {
  height: 5px;
  background: #1e293b;
  cursor: row-resize;
  flex-shrink: 0;
  transition: background 0.15s;
  position: relative;
}
.resize-handle::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 28px;
  height: 2px;
  background: #334155;
  border-radius: 1px;
}
.resize-handle:hover      { background: rgba(99,102,241,0.15); }
.resize-handle:hover::after { background: #6366f1; }

/* STATUS BAR */
.statusbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  height: 24px;
  background: #0a0d14;
  border-top: 1px solid #1e293b;
  font-size: 10px;
  color: #334155;
  flex-shrink: 0;
}
.spacer { flex: 1; }
.status-dot {
  width: 6px; height: 6px;
  background: #10b981;
  border-radius: 50%;
}
</style>
