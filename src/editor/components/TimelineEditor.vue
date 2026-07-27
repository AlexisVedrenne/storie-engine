<template>
  <div class="timeline-editor">
    <div v-for="(entry, i) in entries" :key="i" class="entry-card">
      <div class="entry-header" @click="toggle(i)">
        <q-icon :name="expanded[i] ? 'expand_less' : 'expand_more'" size="20px" />
        <span class="type-badge">{{ entry.type }}</span>
        <span class="summary">{{ summaryFor(entry) }}</span>
        <span v-if="entry.requires" class="requires-badge" title="A une condition (requires)">requires</span>
        <div class="spacer" />
        <q-btn dense flat round icon="arrow_upward" size="sm" :disable="i === 0" @click.stop="moveUp(i)" />
        <q-btn dense flat round icon="arrow_downward" size="sm" :disable="i === entries.length - 1" @click.stop="moveDown(i)" />
        <q-btn dense flat round icon="content_copy" size="sm" @click.stop="duplicate(i)" />
        <q-btn dense flat round icon="delete" size="sm" @click.stop="remove(i)" />
      </div>

      <div v-if="expanded[i]" class="entry-body">
        <component :is="formFor(entry.type)" :entry="entry" />
        <div class="sub-title">Condition (requires, optionnel)</div>
        <RequiresBuilder :model-value="entry.requires" @update:model-value="(v) => (entry.requires = v)" />
      </div>
    </div>

    <q-select
      dense
      outlined
      class="add-select"
      label="Ajouter une entrée…"
      emit-value
      map-options
      :options="TYPE_OPTIONS"
      :model-value="null"
      @update:model-value="addEntry"
    />
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import RequiresBuilder from '@/editor/components/RequiresBuilder.vue'
import MessageEntryForm from '@/editor/components/entries/MessageEntryForm.vue'
import ChoiceEntryForm from '@/editor/components/entries/ChoiceEntryForm.vue'
import PostEntryForm from '@/editor/components/entries/PostEntryForm.vue'
import PhotoEntryForm from '@/editor/components/entries/PhotoEntryForm.vue'
import StoryEntryForm from '@/editor/components/entries/StoryEntryForm.vue'
import DmEntryForm from '@/editor/components/entries/DmEntryForm.vue'
import ReelEntryForm from '@/editor/components/entries/ReelEntryForm.vue'
import CallEntryForm from '@/editor/components/entries/CallEntryForm.vue'
import EffectEntryForm from '@/editor/components/entries/EffectEntryForm.vue'
import TimeskipEntryForm from '@/editor/components/entries/TimeskipEntryForm.vue'

// `entries` is mutated in place (push/splice/swap) — the caller passes the
// actual reactive array (chapter.timeline, or an option's `then`), never a
// copy, so edits here are immediately visible to the live PhoneShell preview
// reading the same story.project data (see docs/phase2-plan.md).
const props = defineProps({ entries: { type: Array, required: true } })
const story = useStoryStore()

const FORM_BY_TYPE = {
  message: MessageEntryForm,
  choice: ChoiceEntryForm,
  post: PostEntryForm,
  photo: PhotoEntryForm,
  story: StoryEntryForm,
  dm: DmEntryForm,
  reel: ReelEntryForm,
  call: CallEntryForm,
  effect: EffectEntryForm,
  timeskip: TimeskipEntryForm,
}
function formFor(type) {
  return FORM_BY_TYPE[type] || null
}

const TYPE_OPTIONS = [
  { label: 'Message (SMS)', value: 'message' },
  { label: 'Choix (choice)', value: 'choice' },
  { label: 'Publication (post)', value: 'post' },
  { label: 'Photo', value: 'photo' },
  { label: 'Story', value: 'story' },
  { label: 'DM Insta', value: 'dm' },
  { label: 'Reel', value: 'reel' },
  { label: 'Appel (call)', value: 'call' },
  { label: 'Effet (effect)', value: 'effect' },
  { label: 'Ellipse temporelle (timeskip)', value: 'timeskip' },
]

function firstContactId() {
  return story.contactsList.find((c) => c.id !== 'me')?.id
}

function defaultEntry(type) {
  switch (type) {
    case 'message':
      return { type, contact: firstContactId(), text: '' }
    case 'choice':
      return { type, contact: firstContactId(), prompt: '', options: [{ text: '', then: [] }] }
    case 'post':
      return { type, author: firstContactId(), content: '' }
    case 'photo':
      return { type, from: firstContactId(), url: '' }
    case 'story':
      return { type, contact: firstContactId(), emoji: '✨' }
    case 'dm':
      return { type, thread: firstContactId(), from: firstContactId(), text: '' }
    case 'reel':
      return { type, author: firstContactId(), media: '' }
    case 'call':
      return { type, contact: firstContactId(), script: [] }
    case 'effect':
      return { type, effects: {} }
    case 'timeskip':
      return { type }
    default:
      return { type }
  }
}

const expanded = reactive({})
function toggle(i) {
  expanded[i] = !expanded[i]
}

function addEntry(type) {
  props.entries.push(defaultEntry(type))
  expanded[props.entries.length - 1] = true
}
function remove(i) {
  props.entries.splice(i, 1)
}
function duplicate(i) {
  props.entries.splice(i + 1, 0, JSON.parse(JSON.stringify(props.entries[i])))
}
function moveUp(i) {
  if (i === 0) return
  const [item] = props.entries.splice(i, 1)
  props.entries.splice(i - 1, 0, item)
}
function moveDown(i) {
  if (i === props.entries.length - 1) return
  const [item] = props.entries.splice(i, 1)
  props.entries.splice(i + 1, 0, item)
}

function summaryFor(entry) {
  switch (entry.type) {
    case 'message':
      return `${story.getContact(entry.contact).name}: ${entry.text || ''}`
    case 'choice':
      return entry.prompt || '(prompt vide)'
    case 'post':
      return `${story.getContact(entry.author).name} — ${entry.content || ''}`
    case 'photo':
      return entry.caption || entry.url || ''
    case 'story':
      return `${story.getContact(entry.contact).name} ${entry.emoji || ''}`
    case 'dm':
      return `${entry.thread}: ${entry.text || ''}`
    case 'reel':
      return entry.caption || entry.media || ''
    case 'call':
      return `${story.getContact(entry.contact).name} — ${(entry.script || []).length} répliques`
    case 'effect':
      return Object.keys(entry.effects || {}).join(', ')
    case 'timeskip':
      return entry.label || `${entry.clock || ''} ${entry.date || ''}`.trim()
    default:
      return ''
  }
}
</script>

<style scoped>
.timeline-editor {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.entry-card {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  overflow: hidden;
}

.entry-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.03);
}

.type-badge {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
}

.requires-badge {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(255, 193, 7, 0.25);
  color: #ffc107;
}

.summary {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  opacity: 0.85;
}

.spacer {
  flex: 1;
}

.entry-body {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.sub-title {
  font-size: 11px;
  text-transform: uppercase;
  opacity: 0.6;
}

.add-select {
  margin-top: 6px;
}
</style>
