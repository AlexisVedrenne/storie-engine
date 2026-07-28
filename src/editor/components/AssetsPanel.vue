<template>
  <div class="assets-panel">
    <div class="panel toolbar">
      <div class="breadcrumb">
        <span class="section-label">Assets</span>
        <span class="path mono">{{ folder ? `assets/${folder}` : 'assets/' }}</span>
        <span class="count">{{ visibleItems.length }} fichier(s) ici, {{ orphanCount }} orphelin(s) au total</span>
      </div>
      <div class="spacer" />
      <q-btn dense flat no-caps icon="upload" label="Importer un fichier" @click="importFile" />
      <q-btn dense flat round icon="refresh" @click="refresh">
        <q-tooltip>Recharger la liste depuis le disque</q-tooltip>
      </q-btn>
    </div>

    <div v-if="error" class="error-text">{{ error }}</div>

    <div v-if="!visibleItems.length" class="empty-state">Aucun fichier dans ce dossier.</div>

    <div v-else class="grid">
      <div v-for="item in visibleItems" :key="item.path" class="asset-card">
        <img v-if="item.category === 'image'" :src="resolveAssetUrl(item.path)" class="thumb" />
        <div v-else class="thumb thumb-placeholder">
          <q-icon :name="item.category === 'audio' ? 'audiotrack' : 'insert_drive_file'" size="32px" />
          <audio v-if="item.category === 'audio'" controls preload="none" :src="resolveAssetUrl(item.path)" class="audio-control" />
        </div>
        <div class="asset-name" :title="item.path">{{ folder ? item.name : item.path }}</div>
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

const props = defineProps({ folder: { type: String, default: '' } })

const story = useStoryStore()
const { files, refresh } = useAssetLibrary()
const error = ref('')

onMounted(() => {
  if (!files.value.length) refresh()
})

const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'])
const AUDIO_EXT = new Set(['mp3', 'wav', 'ogg', 'm4a', 'flac'])
function categoryFor(filePath) {
  const ext = filePath.split('.').pop().toLowerCase()
  if (IMAGE_EXT.has(ext)) return 'image'
  if (AUDIO_EXT.has(ext)) return 'audio'
  return 'other'
}

function dirnameOf(filePath) {
  const i = filePath.lastIndexOf('/')
  return i === -1 ? '' : filePath.slice(0, i)
}

const allItems = computed(() => {
  const used = new Set(collectAssetPaths(story.project).map((a) => a.path))
  return files.value.map((path) => ({
    path,
    name: path.split('/').pop(),
    category: categoryFor(path),
    used: used.has(path),
  }))
})

const orphanCount = computed(() => allItems.value.filter((i) => !i.used).length)

// Root ('') shows every file recursively — in practice almost nothing sits
// directly at assets/ root (everything's organized into subfolders), so a
// "direct children only" root view would look empty even when the project
// has plenty of assets. Any specific subfolder still shows just its own
// direct children, standard file-browser behavior once you've drilled in.
const visibleItems = computed(() =>
  allItems.value
    .filter((item) => (props.folder === '' ? true : dirnameOf(item.path) === props.folder))
    .sort((a, b) => a.path.localeCompare(b.path)),
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

.audio-control {
  width: 100%;
  height: 28px;
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
