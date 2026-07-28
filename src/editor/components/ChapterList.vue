<template>
  <div class="chapter-list">
    <div class="pane-label">Chapitres</div>

    <div
      v-for="(chapter, i) in chapters"
      :key="chapter.id"
      class="chapter-row"
      :class="{ active: i === modelValue }"
      @click="emit('update:modelValue', i)"
    >
      <div class="active-bar" />
      <div class="chapter-info">
        <div class="chapter-title" :title="chapter.title || chapter.id">{{ chapter.title || chapter.id }}</div>
        <div class="chapter-id">{{ chapter.id }}</div>
      </div>
      <div class="row-actions">
        <q-btn dense flat round icon="arrow_upward" size="sm" :disable="i === 0" @click.stop="moveUp(i)">
          <q-tooltip>Monter</q-tooltip>
        </q-btn>
        <q-btn dense flat round icon="arrow_downward" size="sm" :disable="i === chapters.length - 1" @click.stop="moveDown(i)">
          <q-tooltip>Descendre</q-tooltip>
        </q-btn>
        <q-btn dense flat round icon="play_arrow" size="sm" color="primary" @click.stop="previewFrom(chapter)">
          <q-tooltip>Prévisualiser depuis ce chapitre</q-tooltip>
        </q-btn>
        <q-btn dense flat round icon="delete" size="sm" color="negative" @click.stop="confirmDelete(chapter)">
          <q-tooltip>Supprimer</q-tooltip>
        </q-btn>
      </div>
    </div>

    <q-btn
      class="new-chapter-btn"
      dense
      flat
      no-caps
      icon="add"
      label="Nouveau chapitre"
      color="primary"
      @click="newChapterDialog = true"
    />

    <q-dialog v-model="newChapterDialog">
      <q-card class="new-chapter-card">
        <q-card-section>
          <div class="text-subtitle1">Nouveau chapitre</div>
          <q-input dense outlined label="Identifiant (id)" v-model="newId" class="q-mt-sm" />
          <q-input dense outlined label="Titre" v-model="newTitle" class="q-mt-sm" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn flat label="Créer" color="primary" :disable="!newId" @click="createChapter" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Dialog, Notify } from 'quasar'
import { useStoryStore } from '@/engine/stores/story'
import { serializeChapter } from '@/project/serializeChapter'

defineProps({ modelValue: { type: Number, default: 0 } })
const emit = defineEmits(['update:modelValue', 'preview-from'])
const story = useStoryStore()

const chapters = story.project.chapters
const newChapterDialog = ref(false)
const newId = ref('')
const newTitle = ref('')

async function persistOrder() {
  const chapterOrder = chapters.map((c) => c.id)
  story.project.manifest.chapterOrder = chapterOrder
  await window.storieAPI.reorderChapters({ rootPath: story.project.rootPath, chapterOrder })
}

async function moveUp(i) {
  if (i === 0) return
  const [item] = chapters.splice(i, 1)
  chapters.splice(i - 1, 0, item)
  await persistOrder()
}
async function moveDown(i) {
  if (i === chapters.length - 1) return
  const [item] = chapters.splice(i, 1)
  chapters.splice(i + 1, 0, item)
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
    newId.value = ''
    newTitle.value = ''
    Notify.create({ type: 'positive', message: 'Chapitre créé.' })
  } catch (err) {
    Notify.create({ type: 'negative', message: err.message || String(err) })
  }
}
</script>

<style scoped>
.chapter-list {
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

.chapter-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-1);
  min-height: var(--row-height);
  padding: var(--space-2) var(--space-2) var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.chapter-row:hover {
  background: var(--color-surface-hover);
}

.chapter-row.active {
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

.chapter-row.active .active-bar {
  background: var(--color-accent);
}

.chapter-info {
  flex: 1;
  min-width: 0;
}

.chapter-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chapter-id {
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: var(--color-text-muted);
}

.row-actions {
  display: flex;
  align-items: center;
  gap: 0;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.chapter-row:hover .row-actions,
.chapter-row.active .row-actions {
  opacity: 1;
}

.new-chapter-btn {
  margin-top: var(--space-2);
  justify-content: flex-start;
}

.new-chapter-card {
  min-width: 320px;
  background: var(--color-surface);
  color: var(--color-text);
}
</style>
