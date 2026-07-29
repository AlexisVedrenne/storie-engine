<template>
  <div class="chapter-graph">
    <q-btn
      class="new-chapter-fab"
      dense
      unelevated
      no-caps
      icon="add"
      label="Nouveau chapitre"
      color="primary"
      @click="newChapterDialog = true"
    />

    <VueFlow
      :nodes="displayNodes"
      :edges="graph.edges"
      :node-types="nodeTypes"
      :nodes-draggable="true"
      :nodes-connectable="true"
      :edges-updatable="false"
      :edges-focusable="true"
      class="flow"
      @connect="onConnect"
      @node-drag-stop="onNodeDragStop"
      @edge-click="onEdgeClick"
      @pane-context-menu="onPaneContextMenu"
    >
      <Controls />
    </VueFlow>

    <q-dialog v-model="newChapterDialog">
      <q-card class="new-chapter-card">
        <q-card-section>
          <div class="text-subtitle1">Nouveau chapitre</div>
          <q-input dense outlined ref="newTitleInputRef" label="Titre" v-model="newTitle" class="q-mt-sm" autofocus>
            <template #append>
              <EmojiPickerBtn @pick="(e) => (newTitle = insertEmojiAtCaret(newTitleInputRef, newTitle, e))" />
            </template>
          </q-input>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn
            flat
            label="Créer"
            color="primary"
            :disable="!newTitle.trim()"
            @click="createChapter"
            v-close-popup
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Editing an arrow's condition — same RequiresBuilder used everywhere
         else (chapter.requires used to bind here before routes/chapter-level
         requires were removed; now it's the edge itself, chapter.next[i]).
         Commits on @hide (fires on ANY dismissal — Escape, backdrop click,
         either button), not just an explicit button click: typing a new
         flag then dismissing any other way used to silently lose it. -->
    <q-dialog v-model="edgeDialogOpen" @hide="onEdgeDialogHide">
      <q-card class="edge-dialog-card">
        <q-card-section>
          <q-input
            dense
            outlined
            ref="edgeLabelInputRef"
            label="Libellé (optionnel)"
            v-model="edgeDraft.label"
            hint="Affiché sur la flèche à la place de la condition. Vide = comportement inchangé."
          >
            <template #append>
              <EmojiPickerBtn @pick="(e) => (edgeDraft.label = insertEmojiAtCaret(edgeLabelInputRef, edgeDraft.label, e))" />
            </template>
          </q-input>
          <div class="text-subtitle1 q-mt-md">Condition de cette flèche</div>
          <RequiresBuilder v-model="edgeDraft.requires" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            flat
            label="Supprimer cette flèche"
            color="negative"
            class="delete-edge-btn"
            @click="deleteEdge"
          />
          <q-btn flat label="Fermer" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { computed, markRaw, nextTick, reactive, ref, watch } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Controls } from '@vue-flow/controls'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import { Dialog, Notify } from 'quasar'
import { useStoryStore } from '@/engine/stores/story'
import { buildChapterGraph } from '@/project/chapterGraph'
import { serializeChapter } from '@/project/serializeChapter'
import ChapterGraphNode from '@/editor/components/ChapterGraphNode.vue'
import RequiresBuilder from '@/editor/components/RequiresBuilder.vue'
import EmojiPickerBtn from '@/components/shared/EmojiPickerBtn.vue'
import { insertEmojiAtCaret } from '@/components/shared/emojiInsert'

// `null` = nothing selected (the graph's default, full-bleed state driven
// by EditorPage.vue) — no strict `type` so Vue doesn't warn on that value.
// `active` — whether this graph is the thing actually on screen right now
// (EditorPage.vue's own v-show condition, passed through as a prop too):
// this component stays permanently mounted (v-show, never v-if, see
// EditorPage.vue's Teleport notes), so vue-flow's own `fit-view-on-init`
// only ever fires once, at first mount — switching back to this tab later
// (from another main tab, or "← Retour au graphe") left the pan/zoom
// wherever it happened to be. Re-fitting on every `active` transition
// instead covers both cases with one mechanism.
const props = defineProps({ modelValue: { default: null }, active: { type: Boolean, default: true } })
const emit = defineEmits(['update:modelValue', 'preview-from'])
const story = useStoryStore()
const { fitView, screenToFlowCoordinate } = useVueFlow()

watch(
  () => props.active,
  (active) => {
    if (!active) return
    // wait for the v-show display:none -> block flip to actually land in
    // the DOM first — fitView() measures the container, which is still
    // zero-size the instant this watcher fires.
    nextTick(() => fitView({ duration: 300 }))
  },
  { immediate: true },
)

const chapters = story.project.chapters

// markRaw — vue-flow's node-types map is read once, no need for the
// component itself to be reactive (it never changes).
const nodeTypes = { chapter: markRaw(ChapterGraphNode) }

// Recomputed whenever chapters (their `next`/`position`/timeline) change —
// buildChapterGraph is pure (src/project/chapterGraph.js), reading the
// reactive `chapters` array inside a computed gives fine-grained
// reactivity for free.
const graph = computed(() => buildChapterGraph(chapters))

function findChapter(id) {
  return chapters.find((c) => c.id === id)
}

async function persistChapter(chapter) {
  await window.storieAPI.saveChapter({
    rootPath: story.project.rootPath,
    sourceFile: chapter.__sourceFile,
    source: serializeChapter(chapter),
  })
}

// Dragging a new arrow from one node's source handle to another's target
// handle (the <Handle> anchors already rendered by ChapterGraphNode.vue) —
// this is the sole way a `next` entry gets created; nothing infers it.
async function onConnect({ source, target }) {
  if (source === target) return
  const chapter = findChapter(source)
  if (!chapter) return
  if (!chapter.next) chapter.next = []
  chapter.next.push({ to: target })
  await persistChapter(chapter)
}

async function onNodeDragStop({ node }) {
  const chapter = findChapter(node.id)
  if (!chapter) return
  chapter.position = { x: node.position.x, y: node.position.y }
  await persistChapter(chapter)
}

const edgeDialogOpen = ref(false)
const edgeDraft = reactive({ sourceId: null, index: -1, requires: null, label: '' })
const edgeLabelInputRef = ref(null)
// Set right before deleteEdge() closes the dialog — onEdgeDialogHide (fired
// by the same v-model flip) must NOT then also try to write edgeDraft back
// onto chapter.next[edgeDraft.index], since that index either no longer
// exists or (worse) now refers to a different, unrelated edge.
let edgeDeleted = false

function onEdgeClick({ edge }) {
  const [, indexStr] = edge.id.split('->')
  edgeDraft.sourceId = edge.source
  edgeDraft.index = Number(indexStr)
  edgeDraft.requires = edge.data?.requires ?? null
  edgeDraft.label = edge.data?.label || ''
  edgeDeleted = false
  edgeDialogOpen.value = true
}

// Bound to q-dialog's @hide, which fires on every dismissal path (Escape,
// backdrop click, the "Fermer" button) — not just one explicit button click.
// It used to be the other way around (only "Fermer"'s own @click committed
// edgeDraft.requires), so typing a new flag condition and then dismissing
// the dialog any other way silently discarded it.
async function onEdgeDialogHide() {
  if (edgeDeleted) return
  const chapter = findChapter(edgeDraft.sourceId)
  const link = chapter?.next?.[edgeDraft.index]
  if (link) {
    link.requires = edgeDraft.requires
    link.label = edgeDraft.label.trim() || undefined
    await persistChapter(chapter)
  }
}

async function deleteEdge() {
  const chapter = findChapter(edgeDraft.sourceId)
  if (chapter?.next) {
    edgeDeleted = true
    chapter.next.splice(edgeDraft.index, 1)
    await persistChapter(chapter)
  }
  edgeDialogOpen.value = false
}

function previewFrom(chapter) {
  emit('preview-from', chapter.id)
}

function confirmDelete(chapter) {
  Dialog.create({
    title: 'Supprimer ce chapitre ?',
    message: `« ${chapter.title || chapter.id} » sera supprimé du disque. Cette action est irréversible.`,
    cancel: true,
    persistent: true,
    color: 'negative',
  }).onOk(async () => {
    const idx = chapters.findIndex((c) => c.id === chapter.id)
    await window.storieAPI.deleteChapter({
      rootPath: story.project.rootPath,
      sourceFile: chapter.__sourceFile,
      id: chapter.id,
    })
    chapters.splice(idx, 1)

    // Strip any arrow left pointing at the now-deleted chapter, on every
    // other chapter that had one — otherwise `next[].to` would dangle.
    const affected = chapters.filter((c) => (c.next || []).some((link) => link.to === chapter.id))
    for (const other of affected) {
      other.next = other.next.filter((link) => link.to !== chapter.id)
      await persistChapter(other)
    }

    Notify.create({
      type: 'positive',
      message: affected.length
        ? `Chapitre supprimé (${affected.length} flèche${affected.length > 1 ? 's' : ''} pendante${affected.length > 1 ? 's' : ''} retirée${affected.length > 1 ? 's' : ''}).`
        : 'Chapitre supprimé.',
    })
  })
}

// Full deep copy — timeline, next (same outgoing arrows/conditions/labels
// as the original), everything — the author almost always wants a variant
// to tweak, not a blank chapter with the same title. Dropped just below
// and to the right of the original (same cascading idea as a brand new
// chapter) so the two don't sit exactly on top of each other on the graph.
async function duplicateChapter(chapter) {
  const title = `${chapter.title || chapter.id} (copie)`
  const id = generateChapterId(title)
  // eslint-disable-next-line no-unused-vars
  const { __sourceFile, position, ...rest } = chapter
  const clone = JSON.parse(JSON.stringify(rest))
  clone.id = id
  clone.title = title
  clone.position = position ? { x: position.x + 40, y: position.y + 40 } : { x: 40 * chapters.length, y: 40 * (chapters.length % 5) }
  const ok = await persistNewChapter(clone)
  if (ok) emit('update:modelValue', chapters.length - 1)
}

// Enriches buildChapterGraph()'s plain {chapter,isEnding} data with the
// callbacks the node component needs — kept out of chapterGraph.js on
// purpose (it stays a pure, Vue/story-free module).
const displayNodes = computed(() =>
  graph.value.nodes.map((node) => {
    const { chapter, isEnding } = node.data
    const index = chapters.indexOf(chapter)
    return {
      ...node,
      data: {
        chapter,
        isEnding,
        isActive: index === props.modelValue,
        onSelect: () => emit('update:modelValue', index),
        onPreview: () => previewFrom(chapter),
        onDuplicate: () => duplicateChapter(chapter),
        onDelete: () => confirmDelete(chapter),
      },
    }
  }),
)

const newChapterDialog = ref(false)
const newTitle = ref('')
const newTitleInputRef = ref(null)

function slugify(text) {
  return (
    text
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'chapter'
  )
}

// The id only ever needs to be stable+unique (it drives next[].to, the
// i18n bucket filename, __sourceFile...), never something the author reads
// or types — a slug of the title, deduped against every id already in use,
// covers that with zero manual input. Existing hand-typed ids are left
// alone; this only applies going forward.
function generateChapterId(title) {
  const base = slugify(title)
  const existing = new Set(chapters.map((c) => c.id))
  if (!existing.has(base)) return base
  let n = 2
  while (existing.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

// Shared by both creation paths below — persists to disk, pushes into the
// in-memory chapters array, and reports success/failure. Whether to then
// navigate into it (the "+ Nouveau chapitre" button) or leave the graph
// alone (right-click on empty canvas) is the caller's own call.
async function persistNewChapter(chapter) {
  try {
    const result = await window.storieAPI.createChapter({
      rootPath: story.project.rootPath,
      id: chapter.id,
      source: serializeChapter(chapter),
    })
    chapters.push({ ...chapter, __sourceFile: result.sourceFile })
    story.project.manifest = result.manifest
    Notify.create({ type: 'positive', message: 'Chapitre créé.' })
    return true
  } catch (err) {
    Notify.create({ type: 'negative', message: err.message || String(err) })
    return false
  }
}

async function createChapter() {
  const title = newTitle.value.trim()
  if (!title) return
  const id = generateChapterId(title)
  // Small cascading offset so freshly-created chapters don't stack exactly
  // on top of each other — the author drags it wherever it actually
  // belongs right after creating it anyway.
  const position = { x: 40 * chapters.length, y: 40 * (chapters.length % 5) }
  const chapter = { id, title, timeline: [], next: [], position }
  const ok = await persistNewChapter(chapter)
  if (ok) {
    // Opens straight into the new chapter's form — same expectation as
    // clicking any other node, and you almost always want to start writing
    // it immediately after creating it.
    emit('update:modelValue', chapters.length - 1)
    newTitle.value = ''
  }
}

// Right-click-on-canvas creation — dropped exactly under the cursor (no
// title prompt, no navigating in) so it doesn't interrupt whatever the
// author was doing on the graph; they rename/wire it up in place after.
async function onPaneContextMenu(event) {
  event.preventDefault()
  const position = screenToFlowCoordinate({ x: event.clientX, y: event.clientY })
  const title = 'Nouveau chapitre'
  const id = generateChapterId(title)
  await persistNewChapter({ id, title, timeline: [], next: [], position })
}
</script>

<style scoped>
.chapter-graph {
  position: relative;
  width: 100%;
  height: 100%;
}

.flow {
  width: 100%;
  height: 100%;
}

.new-chapter-fab {
  position: absolute;
  top: var(--space-2);
  left: var(--space-2);
  z-index: 5;
}

.new-chapter-card,
.edge-dialog-card {
  min-width: 320px;
  background: var(--color-surface);
  color: var(--color-text);
}

.delete-edge-btn {
  margin-right: auto;
}
</style>
