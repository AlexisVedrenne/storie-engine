<template>
  <div class="assets-panel">
    <div class="panel toolbar">
      <div class="breadcrumb">
        <span class="section-label">Ressources</span>
        <span class="path mono" :title="folder ? `assets/${folder}` : 'assets/'">{{ folder ? `assets/${folder}` : 'assets/' }}</span>
        <span class="count">{{ visibleFolders.length }} dossier(s), {{ visibleFiles.length }} fichier(s), {{ orphanCount }} orphelin(s) au total</span>
      </div>
      <div class="spacer" />
      <q-btn dense flat no-caps icon="upload" label="Importer un fichier" @click="importFile" />
      <q-btn dense flat round icon="refresh" @click="refresh">
        <q-tooltip>Recharger la liste depuis le disque</q-tooltip>
      </q-btn>
    </div>

    <div v-if="error" class="error-text">{{ error }}</div>

    <div v-if="!visibleFolders.length && !visibleFiles.length && folder === ''" class="empty-state">
      Aucun fichier ni dossier dans assets/.
    </div>

    <div v-else class="grid">
      <div v-if="folder" class="asset-card folder-card" @click="goTo(parentFolder)">
        <div class="thumb thumb-placeholder">
          <q-icon name="drive_file_move_rtl" size="32px" />
        </div>
        <div class="asset-name">.. (dossier parent)</div>
      </div>

      <div v-for="sub in visibleFolders" :key="sub.path" class="asset-card folder-card" @click="goTo(sub.path)">
        <div class="thumb thumb-placeholder">
          <q-icon name="folder" size="32px" />
        </div>
        <div class="asset-name" :title="sub.path">{{ sub.name }}</div>
      </div>

      <div v-for="item in visibleFiles" :key="item.path" class="asset-card">
        <img v-if="item.category === 'image'" :src="resolveAssetUrl(item.path)" class="thumb" />
        <div v-else class="thumb thumb-placeholder">
          <q-icon :name="item.category === 'audio' ? 'audiotrack' : 'insert_drive_file'" size="32px" />
          <AudioPreview v-if="item.category === 'audio'" :src="resolveAssetUrl(item.path)" />
        </div>
        <div class="asset-name" :title="item.path">{{ item.name }}</div>
        <div class="asset-footer">
          <span class="badge" :class="item.used ? 'badge-used' : 'badge-orphan'">
            {{ item.used ? 'Utilisé' : 'Orphelin' }}
          </span>
          <q-btn
            v-if="!item.used"
            dense
            flat
            round
            icon="delete"
            size="sm"
            color="negative"
            @click="confirmDelete(item)"
          >
            <q-tooltip>Supprimer ce fichier inutilisé</q-tooltip>
          </q-btn>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { Dialog, Notify } from 'quasar'
import { useStoryStore } from '@/engine/stores/story'
import { resolveAssetUrl } from '@/engine/assets'
import { collectAssetPaths } from '@/project/validateProject'
import { useAssetLibrary } from '@/editor/composables/useAssetLibrary'
import { categorizeAsset } from '@/editor/utils/assetCategory'
import AudioPreview from '@/editor/components/AudioPreview.vue'

// Real explorer behavior: this pane shows the CURRENT folder's direct
// subfolders (click to descend) and direct files, plus a ".." tile to go
// up — not a flat/recursive list. v-model:folder so clicking a tile here
// keeps EditorPage's selectedAssetFolder (and AssetTree's selection) in
// sync, same as AssetTree driving it the other way.
const props = defineProps({ folder: { type: String, default: '' } })
const emit = defineEmits(['update:folder'])

const story = useStoryStore()
const { files, folders, refresh } = useAssetLibrary()
const error = ref('')

onMounted(() => {
  if (!files.value.length && !folders.value.length) refresh()
})

function dirnameOf(itemPath) {
  const i = itemPath.lastIndexOf('/')
  return i === -1 ? '' : itemPath.slice(0, i)
}

function goTo(path) {
  emit('update:folder', path)
}

const parentFolder = computed(() => {
  const i = props.folder.lastIndexOf('/')
  return i === -1 ? '' : props.folder.slice(0, i)
})

const visibleFolders = computed(() =>
  [...folders.value]
    .filter((f) => dirnameOf(f) === props.folder)
    .map((path) => ({ path, name: path.split('/').pop() }))
    .sort((a, b) => a.name.localeCompare(b.name)),
)

const allItems = computed(() => {
  const used = new Set(collectAssetPaths(story.project).map((a) => a.path))
  return files.value.map((path) => ({
    path,
    name: path.split('/').pop(),
    category: categorizeAsset(path),
    used: used.has(path),
  }))
})

const orphanCount = computed(() => allItems.value.filter((i) => !i.used).length)

const visibleFiles = computed(() =>
  allItems.value.filter((item) => dirnameOf(item.path) === props.folder).sort((a, b) => a.name.localeCompare(b.name)),
)

async function importFile() {
  error.value = ''
  try {
    const rel = await window.storieAPI.importAsset({
      rootPath: story.project.rootPath,
      suggestedFolder: props.folder,
      accept: 'any',
    })
    if (rel) await refresh()
  } catch (err) {
    error.value = err.message || String(err)
  }
}

function confirmDelete(item) {
  Dialog.create({
    title: 'Supprimer ce fichier ?',
    message: `« ${item.path} » n'est référencé nulle part dans le projet. Il sera supprimé du disque. Cette action est irréversible.`,
    cancel: true,
    persistent: true,
    color: 'negative',
  }).onOk(async () => {
    try {
      await window.storieAPI.deleteAsset({
        rootPath: story.project.rootPath,
        assetsRoot: story.project.assetsRoot,
        path: item.path,
      })
      await refresh()
      Notify.create({ type: 'positive', message: 'Fichier supprimé.' })
    } catch (err) {
      Notify.create({ type: 'negative', message: err.message || String(err) })
    }
  })
}
</script>

<style scoped>
.assets-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.breadcrumb {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  min-width: 0;
}

.spacer {
  flex: 1;
}

.section-label {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.path {
  font-size: var(--text-sm);
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.count {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.mono {
  font-family: var(--font-mono);
}

.error-text {
  color: var(--color-danger);
  font-size: var(--text-xs);
}

.empty-state {
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  padding: var(--space-6);
  text-align: center;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: var(--space-3);
}

.asset-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-2);
}

.folder-card {
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.folder-card:hover {
  background: var(--color-surface-hover);
}

.folder-card .asset-name {
  color: var(--color-text);
  font-family: var(--font-ui);
}

.thumb {
  width: 100%;
  height: 100px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  background: var(--color-bg);
}

.thumb-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  color: var(--color-text-muted);
}


.asset-name {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.badge-used {
  background: var(--color-surface-hover);
  color: var(--color-text-muted);
}

.badge-orphan {
  background: var(--color-warning-tint);
  color: var(--color-warning);
}
</style>
