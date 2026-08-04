<template>
  <div class="custom-app-list">
    <div class="pane-label">{{ t('editorPage.tabApps') }}</div>

    <div v-if="!customApps.length" class="empty-hint">{{ t('customAppList.empty') }}</div>

    <div
      v-for="(app, i) in customApps"
      :key="app.id"
      class="app-row"
      :class="{ active: i === modelValue }"
      @click="emit('update:modelValue', i)"
    >
      <div class="active-bar" />
      <q-icon name="widgets" size="16px" class="row-icon" />
      <div class="app-info">
        <div class="app-name" :title="app.label || app.id">{{ app.label || app.id }}</div>
        <div class="app-id">{{ app.id }}</div>
      </div>
      <div class="row-actions">
        <q-btn dense flat round icon="ios_share" size="sm" @click.stop="exportApp(app)">
          <q-tooltip>{{ t('customAppList.export') }}</q-tooltip>
        </q-btn>
        <q-btn dense flat round icon="delete" size="sm" color="negative" @click.stop="confirmDelete(app)">
          <q-tooltip>{{ t('common.delete') }}</q-tooltip>
        </q-btn>
      </div>
    </div>

    <div class="list-actions">
      <q-btn dense flat no-caps icon="add" :label="t('customAppList.newApp')" color="primary" @click="newDialog = true" />
      <q-btn dense flat no-caps icon="file_download" :label="t('customAppList.import')" @click="importApp" />
    </div>

    <q-dialog v-model="newDialog">
      <q-card class="new-card">
        <q-card-section>
          <div class="text-subtitle1">{{ t('customAppList.newApp') }}</div>
          <q-input dense outlined :label="t('customAppList.idLabel')" v-model="newId" class="q-mt-sm" />
          <q-input dense outlined :label="t('customAppList.labelLabel')" v-model="newLabel" class="q-mt-sm" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" v-close-popup />
          <q-btn flat :label="t('common.create')" color="primary" :disable="!newId || !newLabel" @click="create" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Dialog, Notify } from 'quasar'
import { useStoryStore } from '@/engine/stores/story'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
defineProps({ modelValue: { type: Number, default: 0 } })
const emit = defineEmits(['update:modelValue'])
const story = useStoryStore()

// story.project.customApps is optional/absent on any project created before
// this feature existed — same lazy-init pattern as game.events/interactions.
if (!story.project.customApps) story.project.customApps = []
const customApps = computed(() => story.project.customApps)

const newDialog = ref(false)
const newId = ref('')
const newLabel = ref('')

async function create() {
  try {
    const data = { id: newId.value, label: newLabel.value, icon: 'widgets', color: '#4c8bf5', screens: [{ id: 'home', label: '', blocks: [] }] }
    const result = await window.storieAPI.createCustomApp({ rootPath: story.project.rootPath, id: newId.value, data })
    customApps.value.push({ ...data, id: newId.value, __sourceFile: result.sourceFile })
    emit('update:modelValue', customApps.value.length - 1)
    newId.value = ''
    newLabel.value = ''
  } catch (err) {
    Notify.create({ type: 'negative', message: err.message || String(err) })
  }
}

function confirmDelete(app) {
  Dialog.create({
    title: t('customAppList.confirmDeleteTitle'),
    message: t('customAppList.confirmDeleteMessage', { name: app.label || app.id }),
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    await window.storieAPI.deleteCustomApp({ rootPath: story.project.rootPath, sourceFile: app.__sourceFile })
    const idx = customApps.value.indexOf(app)
    customApps.value.splice(idx, 1)
    if (idx === customApps.value.length) emit('update:modelValue', Math.max(0, idx - 1))
    Notify.create({ type: 'positive', message: t('customAppList.appDeleted') })
  })
}

async function exportApp(app) {
  try {
    const ok = await window.storieAPI.exportCustomApp({ rootPath: story.project.rootPath, sourceFile: app.__sourceFile })
    if (ok) Notify.create({ type: 'positive', message: t('customAppList.exported') })
  } catch (err) {
    Notify.create({ type: 'negative', message: err.message || String(err) })
  }
}

async function importApp() {
  try {
    const imported = await window.storieAPI.importCustomApp({ rootPath: story.project.rootPath })
    if (!imported) return
    customApps.value.push(imported)
    emit('update:modelValue', customApps.value.length - 1)
    Notify.create({ type: 'positive', message: t('customAppList.imported') })
  } catch (err) {
    Notify.create({ type: 'negative', message: err.message || String(err) })
  }
}
</script>

<style scoped>
.custom-app-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.pane-label {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  padding: var(--space-2) var(--space-3) var(--space-1);
}

.empty-hint {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  font-style: italic;
  padding: 0 var(--space-3);
}

.app-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--row-height);
  padding: var(--space-2) var(--space-2) var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.app-row:hover {
  background: var(--color-surface-hover);
}

.app-row.active {
  background: var(--color-accent-tint);
}

.active-bar {
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 3px;
  border-radius: 2px;
  background: transparent;
}

.app-row.active .active-bar {
  background: var(--color-accent);
}

.row-icon {
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.app-info {
  flex: 1;
  min-width: 0;
}

.app-name {
  font-size: var(--text-sm);
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-id {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.row-actions {
  display: flex;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.app-row:hover .row-actions {
  opacity: 1;
}

.list-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-top: var(--space-2);
}
</style>
