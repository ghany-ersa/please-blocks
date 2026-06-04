<script setup>
/**
 * DataManager.vue — Modal overlay untuk mengelola test data.
 * QA bisa tambah/edit/hapus URL objects, Account objects, dan env variables.
 * Setiap perubahan langsung di-process oleh DataFactory → update dataRegistry.
 */
import { ref, computed } from 'vue'
import { useDataRegistry } from '@/stores/dataRegistry.js'
import { generateDataFile } from '@/core/factory/DataFactory.js'

const emit = defineEmits(['close'])
const dataReg = useDataRegistry()

// State navigasi
const activeGroup  = ref(Object.keys(dataReg.groups)[0] || 'URL')
const activeTab    = ref('data')   // 'data' | 'env' | 'preview'
const editingEntry = ref(null)     // { groupName, entryName }

// Draft untuk tambah group/entry baru
const newGroupName  = ref('')
const newEntryName  = ref('')
const addingGroup   = ref(false)
const addingEntry   = ref(false)

// ── Group actions ────────────────────────────────────────────────
function selectGroup(name) {
  activeGroup.value  = name
  editingEntry.value = null
  newEntryName.value = ''
  addingEntry.value  = false
}

function submitNewGroup() {
  const name = newGroupName.value.trim().toUpperCase()
  if (!name) return
  dataReg.addGroup(name)
  activeGroup.value  = name
  newGroupName.value = ''
  addingGroup.value  = false
}

function removeGroup(name) {
  if (!confirm(`Hapus group "${name}"? Semua entry di dalamnya akan terhapus.`)) return
  const groups = Object.keys(dataReg.groups)
  dataReg.removeGroup(name)
  activeGroup.value = groups.find(g => g !== name) || Object.keys(dataReg.groups)[0] || ''
}

// ── Entry actions ────────────────────────────────────────────────
function selectEntry(entryName) {
  editingEntry.value = { groupName: activeGroup.value, entryName }
}

function submitNewEntry() {
  const name = newEntryName.value.trim()
  if (!name || !activeGroup.value) return
  const defaultFields = activeGroup.value === 'URL'
    ? { url: '', title: '' }
    : { username: '', password: '' }
  dataReg.addEntry(activeGroup.value, name, defaultFields)
  newEntryName.value = ''
  addingEntry.value  = false
  editingEntry.value = { groupName: activeGroup.value, entryName: name }
}

function removeEntry(entryName) {
  dataReg.removeEntry(activeGroup.value, entryName)
  if (editingEntry.value?.entryName === entryName) editingEntry.value = null
}

// ── Field actions ────────────────────────────────────────────────
const currentFields = computed(() => {
  if (!editingEntry.value) return {}
  return dataReg.groups[editingEntry.value.groupName]?.[editingEntry.value.entryName] || {}
})

function updateField(fieldName, value) {
  if (!editingEntry.value) return
  dataReg.updateField(editingEntry.value.groupName, editingEntry.value.entryName, fieldName, value)
}

function addField() {
  if (!editingEntry.value) return
  const name = prompt('Nama field baru:')
  if (name?.trim()) {
    dataReg.addField(editingEntry.value.groupName, editingEntry.value.entryName, name.trim(), '')
  }
}

function removeField(fieldName) {
  dataReg.removeField(editingEntry.value.groupName, editingEntry.value.entryName, fieldName)
}

// ── Env variable actions ─────────────────────────────────────────
function addEnvVar() {
  const key = prompt('Nama env variable (huruf kapital, contoh: MY_API_KEY):')
  if (key?.trim()) dataReg.addEnvVar(key.trim().toUpperCase())
}

// ── Preview ──────────────────────────────────────────────────────
const previewCode = computed(() =>
  generateDataFile(dataReg.groups, dataReg.env)
)

const copied = ref(false)
async function copyPreview() {
  await navigator.clipboard.writeText(previewCode.value).catch(() => {})
  copied.value = true
  setTimeout(() => { copied.value = false }, 1800)
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal">
      <!-- Modal header -->
      <div class="modal-header">
        <span class="modal-title">📊 Data Manager</span>
        <div class="modal-tabs">
          <button :class="['mtab', { active: activeTab === 'data' }]"  @click="activeTab = 'data'">Data Groups</button>
          <button :class="['mtab', { active: activeTab === 'env' }]"   @click="activeTab = 'env'">ENV Variables</button>
          <button :class="['mtab', { active: activeTab === 'preview' }]" @click="activeTab = 'preview'">Preview Code</button>
        </div>
        <button class="modal-close" @click="emit('close')">×</button>
      </div>

      <!-- DATA GROUPS TAB -->
      <div v-if="activeTab === 'data'" class="modal-body three-col">

        <!-- Kolom 1: Group list -->
        <div class="col-groups">
          <div class="col-title">Groups</div>
          <div
            v-for="gName in dataReg.groupNames"
            :key="gName"
            :class="['group-item', { active: activeGroup === gName }]"
            @click="selectGroup(gName)"
          >
            <span class="group-name">{{ gName }}</span>
            <span class="group-count">{{ Object.keys(dataReg.groups[gName]).length }}</span>
            <button class="item-del" @click.stop="removeGroup(gName)">×</button>
          </div>

          <div v-if="addingGroup" class="add-form">
            <input
              v-model="newGroupName"
              class="add-input"
              placeholder="NAMA_GROUP"
              @keyup.enter="submitNewGroup"
              @keyup.escape="addingGroup = false"
              autofocus
            />
            <button class="add-ok" @click="submitNewGroup">✓</button>
          </div>
          <button class="add-btn" @click="addingGroup = true; newGroupName = ''">+ Group</button>
        </div>

        <!-- Kolom 2: Entry list -->
        <div class="col-entries" v-if="activeGroup">
          <div class="col-title">{{ activeGroup }} entries</div>
          <div
            v-for="(fields, entryName) in dataReg.groups[activeGroup]"
            :key="entryName"
            :class="['entry-item', { active: editingEntry?.entryName === entryName }]"
            @click="selectEntry(entryName)"
          >
            <span class="entry-icon">📦</span>
            <span class="entry-name">{{ activeGroup }}.{{ entryName }}</span>
            <button class="item-del" @click.stop="removeEntry(entryName)">×</button>
          </div>

          <div v-if="addingEntry" class="add-form">
            <input
              v-model="newEntryName"
              class="add-input"
              :placeholder="`e.g. ${activeGroup === 'URL' ? 'dashboard' : 'admin'}`"
              @keyup.enter="submitNewEntry"
              @keyup.escape="addingEntry = false"
              autofocus
            />
            <button class="add-ok" @click="submitNewEntry">✓</button>
          </div>
          <button class="add-btn" @click="addingEntry = true; newEntryName = ''">+ Entry</button>
        </div>

        <!-- Kolom 3: Field editor -->
        <div class="col-fields" v-if="editingEntry">
          <div class="col-title">
            {{ editingEntry.groupName }}.{{ editingEntry.entryName }}
            <span class="ref-badge">{{ editingEntry.groupName }}.{{ editingEntry.entryName }}</span>
          </div>

          <div class="field-list">
            <div v-for="(val, fieldName) in currentFields" :key="fieldName" class="field-row">
              <span class="field-key">{{ fieldName }}</span>
              <input
                class="field-val"
                :value="val"
                :placeholder="fieldName === 'url' ? 'https://...' : fieldName === 'title' ? 'Page Title...' : ''"
                @input="updateField(fieldName, $event.target.value)"
              />
              <button class="item-del small" @click="removeField(fieldName)">×</button>
            </div>
            <div v-if="Object.keys(currentFields).length === 0" class="no-fields">
              Belum ada field. Klik "+ Field" untuk menambah.
            </div>
          </div>

          <button class="add-btn" @click="addField">+ Field</button>

          <div class="field-usage-hint">
            <div class="hint-title">Cara pakai di canvas:</div>
            <div class="hint-code">{{ editingEntry.groupName }}.{{ editingEntry.entryName }}</div>
            <div class="hint-sub">Ketik path ini di field bertipe <strong>dataref</strong> di Block Inspector</div>
          </div>
        </div>

        <div class="col-fields empty-col" v-else>
          <div class="empty-hint">← Pilih entry untuk edit field-nya</div>
        </div>
      </div>

      <!-- ENV VARIABLES TAB -->
      <div v-else-if="activeTab === 'env'" class="modal-body">
        <div class="env-header">
          <p class="env-desc">Variabel ini tersimpan di file <code>.env</code> dan dipakai oleh data/main.js</p>
          <button class="add-btn" @click="addEnvVar">+ Variable</button>
        </div>
        <div class="env-list">
          <div v-for="(val, key) in dataReg.env" :key="key" class="env-row">
            <span class="env-key">{{ key }}</span>
            <span class="env-eq">=</span>
            <input
              class="env-val"
              :value="val"
              :placeholder="`nilai ${key}`"
              @input="dataReg.setEnvVar(key, $event.target.value)"
            />
            <button class="item-del" @click="dataReg.removeEnvVar(key)">×</button>
          </div>
        </div>
        <div class="env-note">
          💡 Nilai dari env yang diawali <code>process.env.</code> akan otomatis di-resolve saat generate kode.
        </div>
      </div>

      <!-- PREVIEW CODE TAB -->
      <div v-else-if="activeTab === 'preview'" class="modal-body preview-body">
        <div class="preview-actions">
          <span class="preview-file">data/main.js</span>
          <button class="cp-copy" :class="{ done: copied }" @click="copyPreview">
            {{ copied ? '✓ Copied' : '⎘ Copy' }}
          </button>
        </div>
        <pre class="preview-code">{{ previewCode }}</pre>
      </div>

    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
}
.modal {
  width: 820px; max-width: 96vw;
  height: 560px; max-height: 90vh;
  background: #111827;
  border: 1px solid #1e293b;
  border-radius: 12px;
  display: flex; flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(0,0,0,0.5);
}

/* Header */
.modal-header {
  display: flex; align-items: center; gap: 12px;
  padding: 0 16px;
  height: 46px;
  background: #0f1117;
  border-bottom: 1px solid #1e293b;
  flex-shrink: 0;
}
.modal-title { font-size: 13px; font-weight: 700; color: #e2e8f0; margin-right: 8px; }
.modal-tabs  { display: flex; flex: 1; gap: 2px; }
.mtab {
  padding: 5px 12px; border-radius: 5px; border: none;
  font-size: 11px; font-weight: 600; cursor: pointer;
  color: #64748b; background: transparent;
  transition: all 0.15s;
}
.mtab.active { background: rgba(14,165,233,0.1); color: #0ea5e9; }
.mtab:hover:not(.active) { color: #94a3b8; }
.modal-close {
  background: none; border: none; cursor: pointer;
  color: #475569; font-size: 20px; line-height: 1;
  padding: 0; margin-left: auto;
  transition: color 0.15s;
}
.modal-close:hover { color: #e2e8f0; }

/* Body */
.modal-body { flex: 1; overflow: hidden; display: flex; }
.three-col  { flex-direction: row; }

/* Columns */
.col-groups, .col-entries, .col-fields {
  display: flex; flex-direction: column; overflow: hidden;
}
.col-groups  { width: 150px; min-width: 150px; border-right: 1px solid #1e293b; }
.col-entries { width: 210px; min-width: 210px; border-right: 1px solid #1e293b; }
.col-fields  { flex: 1; }

.col-title {
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase;
  color: #475569; padding: 8px 12px 6px;
  border-bottom: 1px solid #1e293b; flex-shrink: 0;
  display: flex; align-items: center; gap: 6px;
}
.ref-badge {
  font-size: 8.5px; font-family: monospace;
  background: rgba(14,165,233,0.1); color: #38bdf8;
  padding: 1px 6px; border-radius: 3px; margin-left: auto;
  text-transform: none; letter-spacing: 0;
}

/* Group items */
.group-item, .entry-item {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 10px; cursor: pointer;
  transition: background 0.1s; border-radius: 4px; margin: 1px 4px;
}
.group-item:hover, .entry-item:hover { background: rgba(255,255,255,0.03); }
.group-item.active { background: rgba(14,165,233,0.08); }
.entry-item.active { background: rgba(14,165,233,0.08); }
.group-item:hover .item-del, .entry-item:hover .item-del { opacity: 1; }
.group-name  { font-size: 11px; font-weight: 700; color: #38bdf8; flex: 1; font-family: monospace; }
.group-count { font-size: 9px; color: #334155; background: rgba(255,255,255,0.05); border-radius: 8px; padding: 1px 5px; }
.entry-icon  { font-size: 11px; flex-shrink: 0; }
.entry-name  { font-size: 10px; color: #94a3b8; flex: 1; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-del {
  background: none; border: none; cursor: pointer;
  color: #334155; font-size: 14px; line-height: 1; padding: 0 2px;
  opacity: 0; transition: opacity 0.1s, color 0.1s; flex-shrink: 0;
}
.item-del:hover { color: #ef4444; opacity: 1 !important; }
.item-del.small { font-size: 12px; }

/* Add form */
.add-form {
  display: flex; gap: 4px; padding: 4px 8px;
}
.add-input {
  flex: 1; background: #0f1117; border: 1px solid #334155;
  border-radius: 4px; padding: 4px 7px; font-size: 10px; color: #e2e8f0;
  outline: none; font-family: monospace;
}
.add-input:focus { border-color: #0ea5e9; }
.add-ok {
  background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3);
  border-radius: 4px; color: #10b981; font-size: 11px; cursor: pointer; padding: 0 7px;
}
.add-btn {
  margin: 6px 8px 4px;
  background: none; border: 1px dashed #1e293b;
  border-radius: 5px; padding: 5px 10px;
  font-size: 10px; color: #334155; cursor: pointer;
  transition: all 0.15s; text-align: left;
}
.add-btn:hover { border-color: #334155; color: #64748b; }

/* Field editor */
.field-list { flex: 1; overflow-y: auto; padding: 8px 12px; }
.field-row {
  display: flex; align-items: center; gap: 6px; margin-bottom: 6px;
}
.field-key {
  font-size: 10px; font-family: monospace; color: #7dd3fc;
  width: 90px; min-width: 90px; flex-shrink: 0;
}
.field-val {
  flex: 1; background: #0f1117; border: 1px solid #334155;
  border-radius: 4px; padding: 4px 8px; font-size: 10px; color: #e2e8f0;
  outline: none; font-family: monospace;
}
.field-val:focus { border-color: #0ea5e9; }
.no-fields { font-size: 10px; color: #374151; text-align: center; padding: 16px; }

.field-usage-hint {
  padding: 10px 12px; border-top: 1px solid #1e293b; flex-shrink: 0;
  background: rgba(14,165,233,0.03);
}
.hint-title { font-size: 9px; color: #475569; margin-bottom: 4px; }
.hint-code {
  font-family: monospace; font-size: 12px; color: #38bdf8;
  font-weight: 700; margin-bottom: 3px;
}
.hint-sub { font-size: 9px; color: #374151; }
.hint-sub strong { color: #475569; }
.empty-col { align-items: center; justify-content: center; }
.empty-hint { font-size: 11px; color: #1e293b; }

/* ENV tab */
.env-header {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; border-bottom: 1px solid #1e293b; flex-shrink: 0;
}
.env-desc { font-size: 11px; color: #475569; flex: 1; }
.env-desc code { font-family: monospace; background: rgba(255,255,255,0.05); padding: 1px 5px; border-radius: 3px; font-size: 10px; }
.env-list { flex: 1; overflow-y: auto; padding: 12px 16px; }
.env-row {
  display: flex; align-items: center; gap: 8px; margin-bottom: 6px;
}
.env-key { font-family: monospace; font-size: 10px; color: #c084fc; width: 160px; min-width: 160px; flex-shrink: 0; }
.env-eq  { color: #334155; font-size: 12px; flex-shrink: 0; }
.env-val {
  flex: 1; background: #0f1117; border: 1px solid #334155;
  border-radius: 4px; padding: 4px 8px; font-size: 10px; color: #e2e8f0;
  outline: none; font-family: monospace;
}
.env-val:focus { border-color: #c084fc; }
.env-note { padding: 10px 16px; font-size: 10px; color: #374151; }
.env-note code { font-family: monospace; background: rgba(255,255,255,0.05); padding: 1px 4px; border-radius: 3px; color: #c084fc; }

/* Preview tab */
.preview-body { flex-direction: column; }
.preview-actions {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 16px; border-bottom: 1px solid #1e293b; flex-shrink: 0;
  background: #0f1117;
}
.preview-file { font-family: monospace; font-size: 11px; color: #64748b; flex: 1; }
.cp-copy {
  padding: 3px 10px; font-size: 10px;
  background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.25);
  border-radius: 4px; color: #6366f1; cursor: pointer;
}
.cp-copy.done { background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.3); color: #10b981; }
.preview-code {
  flex: 1; overflow: auto; margin: 0;
  padding: 14px 16px;
  font-family: 'SF Mono','Fira Code',monospace; font-size: 10px;
  line-height: 1.7; color: #94a3b8;
  white-space: pre; background: #0a0d14;
}
</style>
