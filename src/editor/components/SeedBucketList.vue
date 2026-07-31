<template>
  <div class="seed-list">
    <div class="pane-label">{{ t('editorPage.tabSeed') }}</div>

    <div
      v-for="bucket in buckets"
      :key="bucket.value"
      class="bucket-row"
      :class="{ active: bucket.value === modelValue }"
      @click="emit('update:modelValue', bucket.value)"
    >
      <div class="active-bar" />
      <q-icon :name="bucket.icon" size="16px" class="bucket-icon" />
      <div class="bucket-info">
        <div class="bucket-name">{{ bucket.label }}</div>
        <div class="bucket-count">{{ t('seedBucketList.entryCount', { n: countFor(bucket.value) }) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()

// Fixed set, not user-creatable — unlike every other list pane so far
// (chapters/contacts/threads/locales), these 5 buckets are dictated by the
// engine's own seed data shape (seedInitialContent(), engine/stores/story.js),
// not free-form project content.
defineProps({ modelValue: { type: String, default: 'messages' } })
const emit = defineEmits(['update:modelValue'])
const story = useStoryStore()

const buckets = computed(() => [
  { value: 'messages', label: t('seedBucketList.messages'), icon: 'sms' },
  { value: 'dms', label: t('seedBucketList.dms'), icon: 'send' },
  { value: 'posts', label: t('seedBucketList.posts'), icon: 'dynamic_feed' },
  { value: 'reels', label: t('seedBucketList.reels'), icon: 'movie' },
  { value: 'photos', label: t('seedBucketList.photos'), icon: 'photo' },
])

const seed = computed(() => story.project?.seed || {})
function countFor(bucketName) {
  const data = seed.value[bucketName]
  if (Array.isArray(data)) return data.length
  return Object.values(data || {}).reduce((n, arr) => n + (arr?.length || 0), 0)
}
</script>

<style scoped>
.seed-list {
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

.bucket-row {
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

.bucket-row:hover {
  background: var(--color-surface-hover);
}

.bucket-row.active {
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

.bucket-row.active .active-bar {
  background: var(--color-accent);
}

.bucket-icon {
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.bucket-info {
  flex: 1;
  min-width: 0;
}

.bucket-name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text);
}

.bucket-count {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
</style>
