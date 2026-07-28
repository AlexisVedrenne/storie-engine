<template>
  <div class="asset-field">
    <div class="row">
      <q-input
        dense
        outlined
        clearable
        class="path-input"
        :model-value="modelValue || ''"
        :label="label"
        @update:model-value="(val) => emit('update:modelValue', val || undefined)"
      />
      <q-btn dense flat icon="upload" label="Importer…" @click="importFile">
        <q-tooltip>Copier un fichier depuis n'importe où sur le disque dans assets/</q-tooltip>
      </q-btn>
      <q-btn dense flat icon="folder_open" label="Parcourir…" @click="browse">
        <q-tooltip>Choisir un fichier déjà présent dans assets/</q-tooltip>
      </q-btn>
    </div>
    <div v-if="error" class="error-text">{{ error }}</div>

    <img v-if="category === 'image'" :src="resolveAssetUrl(modelValue)" class="preview" />
    <div v-else-if="category === 'audio'" class="audio-preview">
      <span class="audio-name" :title="modelValue">{{ modelValue }}</span>
      <audio controls preload="none" :src="resolveAssetUrl(modelValue)" class="audio-control" />
    </div>
    <div v-else-if="modelValue" class="file-preview">
      <q-icon name="insert_drive_file" size="18px" />
      <span class="audio-name" :title="modelValue">{{ modelValue }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import { resolveAssetUrl } from '@/engine/assets'
import { categorizeAsset } from '@/editor/utils/assetCategory'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: 'Image' },
  // Suggests a per-contact subfolder for imports (assets/images/<contactId>/),
  // matching the project's existing asset layout convention — left empty for
  // fields with no natural contact context, which import to assets/ root.
  contactId: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])
const story = useStoryStore()
const error = ref('')

// Shown-file preview branches by type (image thumbnail / playable audio /
// generic file row) instead of always assuming an image — this field is
// now also used for sound overrides (see GameForm.vue's Sons section).
const category = computed(() => (props.modelValue ? categorizeAsset(props.modelValue) : ''))

async function browse() {
  error.value = ''
  if (!window.storieAPI) {
    error.value = "window.storieAPI indisponible — lance en mode Electron."
    return
  }
  try {
    const rel = await window.storieAPI.pickAsset({ rootPath: story.project.rootPath })
    if (rel) emit('update:modelValue', rel)
  } catch (err) {
    error.value = err.message || String(err)
  }
}

async function importFile() {
  error.value = ''
  if (!window.storieAPI) {
    error.value = "window.storieAPI indisponible — lance en mode Electron."
    return
  }
  try {
    const rel = await window.storieAPI.importAsset({
      rootPath: story.project.rootPath,
      suggestedFolder: props.contactId ? `images/${props.contactId}` : '',
    })
    if (rel) emit('update:modelValue', rel)
  } catch (err) {
    error.value = err.message || String(err)
  }
}
</script>

<style scoped>
.asset-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.path-input {
  flex: 1;
}

.error-text {
  color: var(--color-danger);
  font-size: var(--text-xs);
}

.preview {
  max-width: 160px;
  max-height: 120px;
  border-radius: var(--radius-md);
  object-fit: cover;
}

.audio-preview,
.file-preview {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
}

.audio-preview {
  flex-wrap: wrap;
}

.audio-name {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.audio-control {
  width: 100%;
  height: 32px;
}
</style>
