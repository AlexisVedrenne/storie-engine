<template>
  <div class="timeline-editor">
    <div v-for="(entry, i) in entries" :key="i" class="entry-card" :class="{ open: expanded[i] }">
      <div class="entry-header" @click="toggle(i)">
        <q-icon :name="expanded[i] ? 'expand_less' : 'expand_more'" size="18px" class="chevron" />
        <q-icon :name="iconFor(entry.type)" size="16px" class="type-icon" />
        <span class="type-badge">{{ entry.type }}</span>
        <span class="summary" :title="summaryFor(entry)">{{ summaryFor(entry) }}</span>
        <span v-if="entry.requires" class="requires-badge" title="Cette entrée a une condition d'affichage">
          <q-icon name="rule" size="12px" /> condition
        </span>
        <div class="spacer" />
        <div class="row-actions">
          <q-btn dense flat round icon="arrow_upward" size="sm" :disable="i === 0" @click.stop="moveUp(i)">
            <q-tooltip>Monter</q-tooltip>
          </q-btn>
          <q-btn dense flat round icon="arrow_downward" size="sm" :disable="i === entries.length - 1" @click.stop="moveDown(i)">
            <q-tooltip>Descendre</q-tooltip>
          </q-btn>
          <q-btn dense flat round icon="content_copy" size="sm" @click.stop="duplicate(i)">
            <q-tooltip>Dupliquer</q-tooltip>
          </q-btn>
          <q-btn dense flat round icon="delete" size="sm" color="negative" @click.stop="remove(i)">
            <q-tooltip>Supprimer</q-tooltip>
          </q-btn>
        </div>
      </div>

      <div v-if="expanded[i]" class="entry-body">
        <p class="entry-help">{{ helpFor(entry.type) }}</p>
        <component :is="formFor(entry.type)" :entry="entry" />
        <div class="section-label">
          Condition d'affichage (optionnel)
          <FieldHelp text="N'affiche cette entrée que si toutes les conditions sont vraies. Rien d'ajouté = toujours affichée." />
        </div>
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
    >
      <template #prepend>
        <q-icon name="add" size="18px" />
      </template>
      <template #option="scope">
        <q-item v-bind="scope.itemProps">
          <q-item-section avatar>
            <q-icon :name="iconFor(scope.opt.value)" size="18px" />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ scope.opt.label }}</q-item-label>
            <q-item-label caption>{{ helpFor(scope.opt.value) }}</q-item-label>
          </q-item-section>
        </q-item>
      </template>
    </q-select>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import RequiresBuilder from '@/editor/components/RequiresBuilder.vue'
import FieldHelp from '@/editor/components/FieldHelp.vue'
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

// Material icon per entry type — lets a 30-entry timeline be scanned by eye
// instead of read word by word (see docs/ui-ux-guidelines.md §7).
const ICON_BY_TYPE = {
  message: 'sms',
  choice: 'call_split',
  post: 'dynamic_feed',
  photo: 'photo',
  story: 'auto_awesome',
  dm: 'send',
  reel: 'movie',
  call: 'call',
  effect: 'bolt',
  timeskip: 'update',
}
function iconFor(type) {
  return ICON_BY_TYPE[type] || 'help_outline'
}

// One-line plain-language reminder of what each entry type does, shown
// above its form — aimed at someone who's never touched this engine before
// (see docs/story-engine.md section 4 in the NTR repo for the full spec).
const ENTRY_HELP = {
  message: 'Un SMS reçu de ce contact — apparaît dans Messages.',
  choice: 'Bloque la conversation et propose un choix de réponse au joueur.',
  post: 'Une publication dans le fil Pixly (comme un post Instagram).',
  photo: 'Une photo ajoutée à la Galerie du téléphone.',
  story: 'Une story Pixly éphémère (cercle en haut du fil).',
  dm: 'Un message privé Instagram — arrive dans une conversation DM, pas dans Messages.',
  reel: 'Un Reel dans l’onglet vidéos verticales de Pixly.',
  call: 'Un appel entrant, avec un script de dialogue défilant.',
  effect: 'Modifie l’état du jeu (stats, météo, batterie...) sans rien montrer au joueur.',
  timeskip: 'Une ellipse temporelle — verrouille le téléphone et avance l’heure/date.',
}
function helpFor(type) {
  return ENTRY_HELP[type] || ''
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
  gap: var(--space-2);
}

.entry-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-surface);
}

.entry-card.open {
  border-color: var(--color-accent);
}

.entry-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--row-height);
  padding: 0 var(--space-2) 0 var(--space-1);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.entry-header:hover {
  background: var(--color-surface-hover);
}

.chevron,
.type-icon {
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.type-badge {
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.requires-badge {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  background: var(--color-warning-tint);
  color: var(--color-warning);
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

.spacer {
  flex: 1;
}

.row-actions {
  display: flex;
  align-items: center;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.entry-header:hover .row-actions {
  opacity: 1;
}

.entry-body {
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  border-top: 1px solid var(--color-border);
  background: var(--color-bg);
}

.section-label {
  display: flex;
  align-items: center;
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  margin-top: var(--space-1);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}

.entry-help {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  line-height: 1.5;
}

.add-select {
  margin-top: var(--space-2);
}
</style>
