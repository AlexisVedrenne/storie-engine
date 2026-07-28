<template>
  <div class="thread-list">
    <div class="pane-label">Groupes</div>

    <div
      v-for="(thread, i) in threads"
      :key="thread.id"
      class="thread-row"
      :class="{ active: i === modelValue }"
      @click="emit('update:modelValue', i)"
    >
      <div class="active-bar" />
      <q-icon name="groups" size="16px" class="thread-icon" />
      <div class="thread-info">
        <div class="thread-name">{{ thread.name || thread.id }}</div>
        <div class="thread-id">{{ thread.id }}</div>
      </div>
      <div class="row-actions">
        <q-btn dense flat round icon="delete" size="sm" color="negative" @click.stop="confirmDelete(thread)">
          <q-tooltip>Supprimer</q-tooltip>
        </q-btn>
      </div>
    </div>

    <q-btn
      class="new-thread-btn"
      dense
      flat
      no-caps
      icon="add"
      label="Nouveau thread"
      color="primary"
      @click="newDialog = true"
    />

    <q-dialog v-model="newDialog">
      <q-card class="new-card">
        <q-card-section>
          <div class="text-subtitle1">Nouveau thread (groupe)</div>
          <q-input dense outlined label="Identifiant (id)" v-model="newId" class="q-mt-sm" />
          <q-input dense outlined label="Nom du groupe" v-model="newName" class="q-mt-sm" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn flat label="Créer" color="primary" :disable="!newId || !newName" @click="createThread" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Dialog, Notify } from 'quasar'
import { useStoryStore } from '@/engine/stores/story'
import { findReferences } from '@/project/findReferences'
import { serializeThreads } from '@/project/serializeChapter'

defineProps({ modelValue: { type: Number, default: 0 } })
const emit = defineEmits(['update:modelValue'])
const story = useStoryStore()

const threads = story.project.threads
const newDialog = ref(false)
const newId = ref('')
const newName = ref('')

async function persist() {
  await window.storieAPI.saveThreads({ rootPath: story.project.rootPath, source: serializeThreads(threads) })
}

function confirmDelete(thread) {
  const refs = findReferences(story.project, { type: 'thread', id: thread.id })
  if (refs.length) {
    Dialog.create({
      title: 'Suppression impossible',
      message: `« ${thread.name || thread.id} » est encore référencé :\n\n${refs.join('\n')}`,
      ok: true,
    })
    return
  }
  Dialog.create({
    title: 'Supprimer ce thread ?',
    message: `« ${thread.name || thread.id} » sera supprimé du disque. Cette action est irréversible.`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    const idx = threads.findIndex((t) => t.id === thread.id)
    threads.splice(idx, 1)
    await persist()
    Notify.create({ type: 'positive', message: 'Thread supprimé.' })
  })
}

async function createThread() {
  const id = newId.value.trim()
  if (!id || threads.some((t) => t.id === id)) return
  threads.push({ id, name: newName.value.trim() || id, participants: ['me'], group: true })
  await persist()
  newId.value = ''
  newName.value = ''
  Notify.create({ type: 'positive', message: 'Thread créé.' })
}
</script>

<style scoped>
.thread-list {
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

.thread-row {
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

.thread-row:hover {
  background: var(--color-surface-hover);
}

.thread-row.active {
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

.thread-row.active .active-bar {
  background: var(--color-accent);
}

.thread-icon {
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.thread-info {
  flex: 1;
  min-width: 0;
}

.thread-name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.thread-id {
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: var(--color-text-muted);
}

.row-actions {
  display: flex;
  align-items: center;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.thread-row:hover .row-actions,
.thread-row.active .row-actions {
  opacity: 1;
}

.new-thread-btn {
  margin-top: var(--space-2);
  justify-content: flex-start;
}

.new-card {
  min-width: 320px;
  background: var(--color-surface);
  color: var(--color-text);
}
</style>
