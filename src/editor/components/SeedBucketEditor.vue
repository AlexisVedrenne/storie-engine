<template>
  <div class="seed-editor">
    <div v-if="isDictBucket" class="panel toolbar">
      <q-select
        dense
        outlined
        emit-value
        map-options
        class="key-select"
        :label="bucket === 'messages' ? t('seedBucketEditor.conversationWith') : t('seedBucketEditor.thread')"
        :options="keyOptions"
        v-model="selectedKey"
      />
      <div class="spacer" />
      <span class="count">{{ t('seedBucketList.entryCount', { n: entries.length }) }}</span>
    </div>
    <div v-else class="panel toolbar">
      <span class="section-label">{{ bucketLabel }}</span>
      <div class="spacer" />
      <span class="count">{{ t('seedBucketList.entryCount', { n: entries.length }) }}</span>
    </div>

    <div v-if="isDictBucket && !selectedKey" class="empty-state">{{ t('seedBucketEditor.chooseConversation') }}</div>

    <template v-else>
      <div v-if="!entries.length" class="empty-state">{{ t('seedBucketEditor.noEntries') }}</div>

      <div class="cards">
        <div v-for="(entry, i) in entries" :key="i" class="card" :class="{ open: expanded[i] }">
          <div class="card-header" @click="toggle(i)">
            <q-icon :name="expanded[i] ? 'expand_less' : 'expand_more'" size="18px" class="chevron" />
            <span class="summary" :title="summaryFor(entry)">{{ summaryFor(entry) }}</span>
            <div class="spacer" />
            <div class="row-actions">
              <q-btn dense flat round icon="arrow_upward" size="sm" :disable="i === 0" @click.stop="moveUp(i)">
                <q-tooltip>{{ t('timelineEntryCard.moveUp') }}</q-tooltip>
              </q-btn>
              <q-btn dense flat round icon="arrow_downward" size="sm" :disable="i === entries.length - 1" @click.stop="moveDown(i)">
                <q-tooltip>{{ t('timelineEntryCard.moveDown') }}</q-tooltip>
              </q-btn>
              <q-btn dense flat round icon="delete" size="sm" color="negative" @click.stop="remove(i)">
                <q-tooltip>{{ t('common.delete') }}</q-tooltip>
              </q-btn>
            </div>
          </div>

          <div v-if="expanded[i]" class="card-body">
            <template v-if="isDictBucket">
              <div class="row">
                <q-select dense outlined emit-value map-options :label="t('seedBucketEditor.fromLabel')" :options="contactOptions" v-model="entry.from" class="grow" />
                <q-input dense outlined type="number" step="0.5" :label="t('seedBucketEditor.daysAgoLabel')" v-model.number="entry.daysAgo" class="days-input" />
              </div>
              <q-input dense outlined :ref="(el) => (fieldRefs[i] = el)" type="textarea" autogrow :label="t('seedBucketEditor.textLabel')" v-model="entry.text">
                <template #append>
                  <EmojiPickerBtn @pick="(e) => (entry.text = insertEmojiAtCaret(fieldRefs[i], entry.text, e))" />
                </template>
              </q-input>
              <AssetField v-model="entry.image" :label="t('entries.message.imageLabel')" :contact-id="entry.from" />
            </template>

            <template v-else-if="bucket === 'posts'">
              <div class="row">
                <q-select dense outlined emit-value map-options :label="t('seedBucketEditor.authorLabel')" :options="contactOptions" v-model="entry.author" class="grow" />
                <q-input dense outlined type="number" step="0.5" :label="t('seedBucketEditor.daysAgoLabel')" v-model.number="entry.daysAgo" class="days-input" />
              </div>
              <q-input dense outlined :ref="(el) => (fieldRefs[i] = el)" type="textarea" autogrow :label="t('entries.post.captionLabel')" v-model="entry.content">
                <template #append>
                  <EmojiPickerBtn @pick="(e) => (entry.content = insertEmojiAtCaret(fieldRefs[i], entry.content, e))" />
                </template>
              </q-input>
              <AssetField v-model="entry.image" :label="t('entries.post.imageLabel')" :contact-id="entry.author" />
              <q-input dense outlined type="number" :label="t('entries.post.likesLabel')" v-model.number="entry.likes" />
              <CommentsListField
                v-model="entry.comments"
                :comments-count="entry.commentsCount"
                @update:comments-count="(v) => (entry.commentsCount = v)"
              />
            </template>

            <template v-else-if="bucket === 'reels'">
              <div class="row">
                <q-select dense outlined emit-value map-options :label="t('seedBucketEditor.authorLabel')" :options="contactOptions" v-model="entry.author" class="grow" />
                <q-input dense outlined type="number" step="0.5" :label="t('seedBucketEditor.daysAgoLabel')" v-model.number="entry.daysAgo" class="days-input" />
              </div>
              <q-input dense outlined :ref="(el) => (fieldRefs[i] = el)" type="textarea" autogrow :label="t('entries.reel.captionLabel')" v-model="entry.caption">
                <template #append>
                  <EmojiPickerBtn @pick="(e) => (entry.caption = insertEmojiAtCaret(fieldRefs[i], entry.caption, e))" />
                </template>
              </q-input>
              <AssetField v-model="entry.media" :label="t('entries.reel.mediaLabel')" :contact-id="entry.author" />
              <q-input dense outlined :label="t('entries.reel.musicLabel')" v-model="entry.music" />
              <q-input dense outlined type="number" :label="t('entries.post.likesLabel')" v-model.number="entry.likes" />
              <CommentsListField
                v-model="entry.comments"
                :comments-count="entry.commentsCount"
                @update:comments-count="(v) => (entry.commentsCount = v)"
              />
            </template>

            <template v-else-if="bucket === 'photos'">
              <q-select dense outlined emit-value map-options :label="t('entries.photo.fromLabel')" :options="contactOptions" v-model="entry.from" />
              <AssetField v-model="entry.url" :label="t('entries.photo.imageLabel')" :contact-id="entry.from" />
              <q-input dense outlined :ref="(el) => (fieldRefs[i] = el)" :label="t('entries.photo.captionLabel')" v-model="entry.caption">
                <template #append>
                  <EmojiPickerBtn @pick="(e) => (entry.caption = insertEmojiAtCaret(fieldRefs[i], entry.caption, e))" />
                </template>
              </q-input>
            </template>
          </div>
        </div>
      </div>

      <q-btn dense flat no-caps icon="add" :label="addLabel" color="primary" class="add-btn" @click="addEntry" />
    </template>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import { useContactOptions } from '@/components/shared/useContactOptions'
import AssetField from '@/editor/components/AssetField.vue'
import CommentsListField from '@/editor/components/CommentsListField.vue'
import EmojiPickerBtn from '@/components/shared/EmojiPickerBtn.vue'
import { insertEmojiAtCaret } from '@/components/shared/emojiInsert'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
const props = defineProps({ bucket: { type: String, required: true } })
// Plain object (not reactive) — per-card DOM ref bag for EmojiPickerBtn's
// caret insertion, keyed by card index (v-for can't bind a static template ref).
const fieldRefs = {}
const story = useStoryStore()
const { contactOptions, contactOptionsNoMe, threadOptions } = useContactOptions()

const isDictBucket = computed(() => props.bucket === 'messages' || props.bucket === 'dms')
const bucketLabel = computed(() => {
  const labels = { posts: t('seedBucketList.posts'), reels: t('seedBucketList.reels'), photos: t('seedBucketList.photos') }
  return labels[props.bucket] || props.bucket
})
const addLabel = computed(() => {
  const labels = {
    messages: t('seedBucketEditor.addMessage'),
    dms: t('seedBucketEditor.addMessage'),
    posts: t('seedBucketEditor.addPost'),
    reels: t('seedBucketEditor.addReel'),
    photos: t('seedBucketEditor.addPhoto'),
  }
  return labels[props.bucket]
})

// Which conversation is open within a dict bucket — LOCAL to this
// component, not lifted to EditorPage.vue: nothing else needs to read or
// sync with it (unlike selectedAssetFolder, which the Assets grid AND tree
// both drive).
const selectedKey = ref('')
const keyOptions = computed(() => (props.bucket === 'messages' ? contactOptionsNoMe.value : threadOptions.value))
watch(
  () => props.bucket,
  () => {
    selectedKey.value = isDictBucket.value ? keyOptions.value[0]?.value || '' : ''
  },
  { immediate: true },
)

function ensureBucketData() {
  if (isDictBucket.value) {
    if (!story.project.seed[props.bucket]) story.project.seed[props.bucket] = {}
    if (selectedKey.value && !story.project.seed[props.bucket][selectedKey.value]) {
      story.project.seed[props.bucket][selectedKey.value] = []
    }
  } else if (!Array.isArray(story.project.seed[props.bucket])) {
    story.project.seed[props.bucket] = []
  }
}

const entries = computed(() => {
  ensureBucketData()
  if (isDictBucket.value) {
    return selectedKey.value ? story.project.seed[props.bucket][selectedKey.value] : []
  }
  return story.project.seed[props.bucket]
})

const expanded = reactive({})
function toggle(i) {
  expanded[i] = !expanded[i]
}

function defaultEntry() {
  switch (props.bucket) {
    case 'messages':
    case 'dms':
      return { from: contactOptions.value[0]?.value || 'me', text: '', daysAgo: 0 }
    case 'posts':
      return { author: contactOptionsNoMe.value[0]?.value || '', content: '', daysAgo: 0 }
    case 'reels':
      return { author: contactOptionsNoMe.value[0]?.value || '', media: '', daysAgo: 0 }
    case 'photos':
      return { from: contactOptionsNoMe.value[0]?.value || '', url: '', caption: '' }
    default:
      return {}
  }
}

function addEntry() {
  ensureBucketData()
  entries.value.push(defaultEntry())
  expanded[entries.value.length - 1] = true
}
function remove(i) {
  entries.value.splice(i, 1)
}
function moveUp(i) {
  if (i === 0) return
  const [item] = entries.value.splice(i, 1)
  entries.value.splice(i - 1, 0, item)
}
function moveDown(i) {
  if (i === entries.value.length - 1) return
  const [item] = entries.value.splice(i, 1)
  entries.value.splice(i + 1, 0, item)
}

function nameFor(id) {
  return story.getContact(id)?.name || id
}
function summaryFor(entry) {
  switch (props.bucket) {
    case 'messages':
    case 'dms':
      return `${nameFor(entry.from)}: ${entry.text || ''}`
    case 'posts':
      return `${nameFor(entry.author)} — ${entry.content || ''}`
    case 'reels':
      return `${nameFor(entry.author)} — ${entry.caption || ''}`
    case 'photos':
      return `${nameFor(entry.from)} — ${entry.caption || entry.url || ''}`
    default:
      return ''
  }
}
</script>

<style scoped>
.seed-editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.key-select {
  min-width: 220px;
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

.count {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.empty-state {
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  padding: var(--space-6);
  text-align: center;
}

.cards {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-surface);
}

.card.open {
  border-color: var(--color-accent);
}

.card-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--row-height);
  padding: 0 var(--space-2) 0 var(--space-1);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.card-header:hover {
  background: var(--color-surface-hover);
}

.chevron {
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.summary {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--text-sm);
  color: var(--color-text);
}

.row-actions {
  display: flex;
  align-items: center;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.card-header:hover .row-actions {
  opacity: 1;
}

.card-body {
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  border-top: 1px solid var(--color-border);
  background: var(--color-bg);
}

.row {
  display: flex;
  gap: var(--space-3);
}

.grow {
  flex: 1;
}

.days-input {
  width: 160px;
  flex-shrink: 0;
}

.add-btn {
  margin-top: var(--space-1);
  justify-content: flex-start;
}
</style>
