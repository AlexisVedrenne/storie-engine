<template>
  <div class="assets-panel">
    <div class="panel toolbar">
      <div class="section-label">Assets ({{ items.length }} fichier(s), {{ orphanCount }} orphelin(s))</div>
      <div class="spacer" />
      <q-btn dense flat no-caps icon="upload" label="Importer un fichier" @click="importFile" />
      <q-btn dense flat round icon="refresh" @click="refresh">
        <q-tooltip>Recharger la liste depuis le disque</q-tooltip>
      </q-btn>
    </div>

    <div v-if="error" class="error-text">{{ error }}</div>

    <div v-if="!items.length" class="empty-state">Aucun fichier dans assets/.</div>

    <div v-else class="grid">
      <div v-for="item in items" :key="item.path" class="asset-card">
        <img :src="resolveAssetUrl(item.path)" class="thumb" />
        <div class="asset-path" :title="item.path">{{ item.path }}</div>
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

const story = useStoryStore()
const items = ref([])
const error = ref('')
const orphanCount = computed(() => items.value.filter((i) => !i.used).length)

async function refresh() {
  error.value = ''
  try {
    const files = await window.storieAPI.listAssetFiles({
      rootPath: story.project.rootPath,
      assetsRoot: story.project.assetsRoot,
    })
    const used = new Set(collectAssetPaths(story.project).map((a) => a.path))
    items.value = files.map((path) => ({ path, used: used.has(path) })).sort((a, b) => a.path.localeCompare(b.path))
  } catch (err) {
    error.value = err.message || String(err)
  }
}
onMounted(refresh)

async function importFile() {
  error.value = ''
  try {
    const rel = await window.storieAPI.importAsset({ rootPath: story.project.rootPath, suggestedFolder: '' })
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
      items.value = items.value.filter((i) => i.path !== item.path)
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

.spacer {
  flex: 1;
}

.section-label {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
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

.asset-path {
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
