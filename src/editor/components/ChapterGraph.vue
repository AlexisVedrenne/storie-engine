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
      :nodes-draggable="false"
      :nodes-connectable="false"
      :edges-updatable="false"
      :edges-focusable="false"
      fit-view-on-init
      class="flow"
    >
      <Controls :show-interactive="false" />
    </VueFlow>

    <q-dialog v-model="newChapterDialog">
      <q-card class="new-chapter-card">
        <q-card-section>
          <div class="text-subtitle1">Nouveau chapitre</div>
          <q-input dense outlined label="Identifiant (id)" v-model="newId" class="q-mt-sm" />
          <q-input dense outlined label="Titre" v-model="newTitle" class="q-mt-sm" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn
            flat
            label="Créer"
            color="primary"
            :disable="!newId"
            @click="createChapter"
            v-close-popup
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { computed, markRaw, ref } from 'vue'
import { VueFlow } from '@vue-flow/core'
import { Controls } from '@vue-flow/controls'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import { Dialog, Notify } from 'quasar'
import { useStoryStore } from '@/engine/stores/story'
import { useRouteOptions } from '@/editor/composables/useRouteOptions'
import { buildChapterGraph } from '@/project/chapterGraph'
import { serializeChapter } from '@/project/serializeChapter'
import ChapterGraphNode from '@/editor/components/ChapterGraphNode.vue'

// `null` = nothing selected (the graph's default, full-bleed state driven
// by EditorPage.vue) — no strict `type` so Vue doesn't warn on that value.
const props = defineProps({ modelValue: { default: null } })
const emit = defineEmits(['update:modelValue', 'preview-from'])
const story = useStoryStore()
const { routeColor } = useRouteOptions()

const chapters = story.project.chapters
const routes = story.project.routes

// markRaw — vue-flow's node-types map is read once, no need for the
// component itself to be reactive (it never changes).
const nodeTypes = { chapter: markRaw(ChapterGraphNode) }

// Recomputed whenever chapters/routes/timelines change — buildChapterGraph
// is pure (src/project/chapterGraph.js), reading the reactive `chapters`/
// `routes` arrays inside a computed gives fine-grained reactivity for free
// (same as the old ChapterList.vue's `visibleChapters` computed did).
const graph = computed(() => buildChapterGraph(chapters, routes))

// Chapters filed under the same route, in chapterOrder's relative order —
// same "nearest visible sibling" swap logic ChapterList.vue used, just
// keyed off a route id directly instead of a "current folder" ref (there's
// no folder concept anymore, the graph shows everything at once).
function sameRouteSiblings(routeId) {
  return chapters
    .map((chapter, index) => ({ chapter, index }))
    .filter(({ chapter }) => (chapter.route || '') === (routeId || ''))
}
function siblingPosition(index, routeId) {
  return sameRouteSiblings(routeId).findIndex((s) => s.index === index)
}

async function persistOrder() {
  const chapterOrder = chapters.map((c) => c.id)
  story.project.manifest.chapterOrder = chapterOrder
  await window.storieAPI.reorderChapters({ rootPath: story.project.rootPath, chapterOrder })
}

// Swaps with the nearest sibling of the SAME route (not the array-adjacent
// chapter) — leaves every other chapter's position untouched, result is
// still the real play order. See ChapterList.vue's prior version of this
// same logic (superseded by this file).
async function moveUp(index) {
  const routeId = chapters[index].route
  const siblings = sameRouteSiblings(routeId)
  const si = siblingPosition(index, routeId)
  if (si <= 0) return
  const otherIndex = siblings[si - 1].index
  ;[chapters[index], chapters[otherIndex]] = [chapters[otherIndex], chapters[index]]
  await persistOrder()
}
async function moveDown(index) {
  const routeId = chapters[index].route
  const siblings = sameRouteSiblings(routeId)
  const si = siblingPosition(index, routeId)
  if (si === -1 || si >= siblings.length - 1) return
  const otherIndex = siblings[si + 1].index
  ;[chapters[index], chapters[otherIndex]] = [chapters[otherIndex], chapters[index]]
  await persistOrder()
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
    story.project.manifest.chapterOrder = chapters.map((c) => c.id)
    Notify.create({ type: 'positive', message: 'Chapitre supprimé.' })
  })
}

// Enriches buildChapterGraph()'s plain {chapter,index,route,isEnding} data
// with the callbacks/derived flags the node component needs — kept out of
// chapterGraph.js on purpose (it stays a pure, Vue/story-free module).
const displayNodes = computed(() =>
  graph.value.nodes.map((node) => {
    const { chapter, index, route, isEnding } = node.data
    const siblings = sameRouteSiblings(route)
    const si = siblingPosition(index, route)
    return {
      ...node,
      data: {
        chapter,
        isEnding,
        color: routeColor(route),
        isActive: index === props.modelValue,
        canMoveUp: si > 0,
        canMoveDown: si !== -1 && si < siblings.length - 1,
        onSelect: () => emit('update:modelValue', index),
        onMoveUp: () => moveUp(index),
        onMoveDown: () => moveDown(index),
        onPreview: () => previewFrom(chapter),
        onDelete: () => confirmDelete(chapter),
      },
    }
  }),
)

const newChapterDialog = ref(false)
const newId = ref('')
const newTitle = ref('')

async function createChapter() {
  const id = newId.value.trim()
  if (!id) return
  const title = newTitle.value.trim() || id
  const chapter = { id, title, requires: null, timeline: [] }
  try {
    const result = await window.storieAPI.createChapter({
      rootPath: story.project.rootPath,
      id,
      source: serializeChapter(chapter),
    })
    chapters.push({ ...chapter, __sourceFile: result.sourceFile })
    story.project.manifest = result.manifest
    // Opens straight into the new chapter's form — same expectation as
    // clicking any other node, and you almost always want to start writing
    // it immediately after creating it.
    emit('update:modelValue', chapters.length - 1)
    newId.value = ''
    newTitle.value = ''
    Notify.create({ type: 'positive', message: 'Chapitre créé.' })
  } catch (err) {
    Notify.create({ type: 'negative', message: err.message || String(err) })
  }
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

.new-chapter-card {
  min-width: 320px;
  background: var(--color-surface);
  color: var(--color-text);
}
</style>
