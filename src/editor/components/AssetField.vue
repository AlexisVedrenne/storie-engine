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
      <q-btn dense flat icon="folder_open" label="Parcourir…" @click="browse" />
    </div>
    <div v-if="error" class="error-text">{{ error }}</div>
    <img v-if="modelValue" :src="resolveAssetUrl(modelValue)" class="preview" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import { resolveAssetUrl } from '@/engine/assets'

defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: 'Image' },
})
const emit = defineEmits(['update:modelValue'])
const story = useStoryStore()
const error = ref('')

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
</style>
