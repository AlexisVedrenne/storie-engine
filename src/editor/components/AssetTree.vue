<template>
  <div class="asset-tree">
    <div class="pane-label">Dossiers</div>

    <div
      class="folder-row root-row"
      :class="{ active: modelValue === '' }"
      @click="emit('update:modelValue', '')"
    >
      <q-icon name="folder" size="16px" class="folder-icon" />
      <span class="folder-name">assets/</span>
    </div>

    <div
      v-for="folder in sortedFolders"
      :key="folder.path"
      class="folder-row"
      :class="{ active: modelValue === folder.path }"
      :style="{ paddingLeft: `${(folder.depth + 1) * 16 + 8}px` }"
      @click="emit('update:modelValue', folder.path)"
    >
      <q-icon name="folder" size="16px" class="folder-icon" />
      <span class="folder-name" :title="folder.path">{{ folder.name }}</span>
      <div class="row-actions">
        <q-btn dense flat round icon="create_new_folder" size="sm" @click.stop="openNewFolderDialog(folder.path)">
          <q-tooltip>Nouveau sous-dossier ici</q-tooltip>
        </q-btn>
      </div>
    </div>

    <q-btn
      class="new-folder-btn"
      dense
      flat
      no-caps
      icon="create_new_folder"
      label="Nouveau dossier"
      color="primary"
      @click="openNewFolderDialog(modelValue)"
    />

    <q-dialog v-model="newFolderDialog">
      <q-card class="new-folder-card">
        <q-card-section>
          <div class="text-subtitle1">Nouveau dossier</div>
          <div class="dialog-hint">
            Dans : <span class="mono">{{ newFolderParent || 'assets/' }}</span>
          </div>
          <q-input dense outlined autofocus label="Nom du dossier" v-model="newFolderName" class="q-mt-sm" @keyup.enter="createFolder" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn flat label="Créer" color="primary" :disable="!newFolderName.trim()" @click="createFolder" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { Notify } from 'quasar'
import { useStoryStore } from '@/engine/stores/story'
import { useAssetLibrary } from '@/editor/composables/useAssetLibrary'

defineProps({ modelValue: { type: String, default: '' } })
const emit = defineEmits(['update:modelValue'])

const story = useStoryStore()
const { folders, refresh } = useAssetLibrary()
onMounted(() => {
  if (!folders.value.length) refresh()
})

// Flat, depth-indented, alphabetically sorted — the actual trees here are
// shallow (images/<contact>/, a future sounds/...), so indentation alone
// reads fine without building/maintaining expand/collapse state.
const sortedFolders = computed(() =>
  [...folders.value]
    .sort((a, b) => a.localeCompare(b))
    .map((path) => ({
      path,
      name: path.split('/').pop(),
      depth: path.split('/').length - 1,
    })),
)

const newFolderDialog = ref(false)
const newFolderParent = ref('')
const newFolderName = ref('')

function openNewFolderDialog(parent) {
  newFolderParent.value = parent
  newFolderName.value = ''
  newFolderDialog.value = true
}

async function createFolder() {
  const name = newFolderName.value.trim()
  if (!name) return
  const folderPath = newFolderParent.value ? `${newFolderParent.value}/${name}` : name
  try {
    await window.storieAPI.createAssetFolder({
      rootPath: story.project.rootPath,
      assetsRoot: story.project.assetsRoot,
      folderPath,
    })
    await refresh()
    Notify.create({ type: 'positive', message: 'Dossier créé.' })
  } catch (err) {
    Notify.create({ type: 'negative', message: err.message || String(err) })
  }
}
</script>

<style scoped>
.asset-tree {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-2);
}

.pane-label {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  padding: var(--space-2) var(--space-2) var(--space-1);
}

.folder-row {
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

.folder-row:hover {
  background: var(--color-surface-hover);
}

.folder-row.active {
  background: var(--color-accent-tint);
}

.root-row {
  font-weight: 600;
}

.folder-icon {
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.folder-name {
  flex: 1;
  min-width: 0;
  font-size: var(--text-sm);
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-actions {
  display: flex;
  align-items: center;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.folder-row:hover .row-actions {
  opacity: 1;
}

.new-folder-btn {
  margin-top: var(--space-2);
  justify-content: flex-start;
}

.new-folder-card {
  min-width: 320px;
  background: var(--color-surface);
  color: var(--color-text);
}

.dialog-hint {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  margin-top: var(--space-1);
}

.mono {
  font-family: var(--font-mono);
}
</style>
