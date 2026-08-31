<template>
  <div class="asset-field">
    <div class="field-label">{{ label || t('assetField.defaultLabel') }}</div>

    <div v-if="category === 'image'" class="preview-box">
      <img :src="resolveAssetUrl(modelValue)" class="preview-img" />
    </div>
    <div v-else-if="category === 'video'" class="preview-box">
      <video :src="resolveAssetUrl(modelValue)" class="preview-img" muted loop autoplay />
    </div>
    <AudioPreview
      v-else-if="category === 'audio'"
      :src="resolveAssetUrl(modelValue)"
      class="audio-box"
    />
    <AudioPreview
      v-else-if="!modelValue && fallbackAudioSrc"
      :src="fallbackAudioSrc"
      class="audio-box"
    />

    <div class="meta-row">
      <q-icon
        v-if="!category && modelValue"
        name="insert_drive_file"
        size="16px"
        class="meta-icon"
      />
      <span class="filename" :title="modelValue">
        {{
          modelValue ||
          (fallbackAudioSrc ? t('assetField.defaultSound') : t('assetField.noFileSelected'))
        }}
      </span>
      <q-btn dense flat round icon="upload" size="sm" @click="importFile">
        <q-tooltip>{{ t('assetField.importTooltip') }}</q-tooltip>
      </q-btn>
      <q-btn dense flat round icon="folder_open" size="sm" @click="browse">
        <q-tooltip>{{ t('assetField.browseTooltip') }}</q-tooltip>
      </q-btn>
      <q-btn v-if="modelValue" dense flat round icon="close" size="sm" @click="clear">
        <q-tooltip>{{ t('assetField.removeTooltip') }}</q-tooltip>
      </q-btn>
    </div>

    <div v-if="error" class="error-text">{{ error }}</div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import { resolveAssetUrl } from '@/engine/assets'
import { categorizeAsset } from '@/editor/utils/assetCategory'
import AudioPreview from '@/editor/components/AudioPreview.vue'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '' },
  // Suggests a per-contact subfolder for imports (assets/images/<contactId>/),
  // matching the project's existing asset layout convention — left empty for
  // fields with no natural contact context, which import to assets/ root.
  contactId: { type: String, default: '' },
  // Engine-bundled sound to preview/play when no override is set (see
  // GameForm.vue's Sons section) — lets one AssetField instance stand in for
  // both "here's the current default" and "here's your override" instead of
  // GameForm stacking two separate blocks per sound (docs/ui-design-principles.md).
  fallbackAudioSrc: { type: String, default: '' },
  // Which file-type filter the native picker (browse/import) opens with —
  // 'images' (default) for the many narrative image fields, 'audio' for
  // sound overrides and a `music` entry's track. Forwarded as-is to the
  // main process (project:pickAsset/project:importAsset), see project.js.
  accept: { type: String, default: 'images' },
})
const emit = defineEmits(['update:modelValue'])
const story = useStoryStore()
const error = ref('')

// Shown-file preview branches by type (image thumbnail / playable audio /
// generic file row) instead of always assuming an image — this field is
// now also used for sound overrides (see GameForm.vue's Sons section).
const category = computed(() => (props.modelValue ? categorizeAsset(props.modelValue) : ''))

function clear() {
  emit('update:modelValue', undefined)
}

async function browse() {
  error.value = ''
  if (!window.storieAPI) {
    error.value = t('assetField.apiUnavailable')
    return
  }
  try {
    const rel = await window.storieAPI.pickAsset({
      rootPath: story.project.rootPath,
      accept: props.accept,
    })
    if (rel) emit('update:modelValue', rel)
  } catch (err) {
    error.value = err.message || String(err)
  }
}

async function importFile() {
  error.value = ''
  if (!window.storieAPI) {
    error.value = t('assetField.apiUnavailable')
    return
  }
  try {
    const rel = await window.storieAPI.importAsset({
      rootPath: story.project.rootPath,
      suggestedFolder: props.contactId ? `images/${props.contactId}` : '',
      accept: props.accept,
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

.field-label {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.error-text {
  color: var(--color-danger);
  font-size: var(--text-xs);
}

/* The preview is the point of this widget — sized to actually show the
   picture, not squeezed under the controls (user feedback: "image en tout
   petit, moche"). object-fit: cover so a wide/tall wallpaper still fills a
   consistent, predictable box instead of stretching or leaving gaps. */
.preview-box {
  width: 100%;
  max-height: 160px;
  overflow: hidden;
  border-radius: var(--radius-md);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
}

.preview-img {
  display: block;
  width: 100%;
  max-height: 160px;
  object-fit: cover;
}

.audio-box {
  padding: var(--space-2);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

/* Filename as a small muted caption + icon-only action buttons, instead of
   a full-width text input (editable but rarely typed into by hand) sitting
   next to two large label+icon buttons — the combination the user flagged
   as the ugliest part of this widget. */
.meta-row {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.meta-icon {
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.filename {
  flex: 1;
  min-width: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
