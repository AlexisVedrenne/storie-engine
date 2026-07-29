<template>
  <div class="contact-list">
    <div class="pane-label">Contacts</div>

    <div
      v-for="(contact, i) in contacts"
      :key="contact.id"
      class="contact-row"
      :class="{ active: i === modelValue }"
      @click="emit('update:modelValue', i)"
    >
      <div class="active-bar" />
      <div class="swatch" :style="{ background: contact.color || '#999999' }" />
      <div class="contact-info">
        <div class="contact-name" :title="contact.name || contact.id">{{ contact.name || contact.id }}</div>
        <div class="contact-id">{{ contact.id }}</div>
      </div>
      <div class="row-actions">
        <q-btn
          v-if="contact.id !== 'me'"
          dense
          flat
          round
          icon="delete"
          size="sm"
          color="negative"
          @click.stop="confirmDelete(contact)"
        >
          <q-tooltip>Supprimer</q-tooltip>
        </q-btn>
        <q-icon v-else name="lock" size="16px" class="locked-icon">
          <q-tooltip>Le contact « me » est requis par le moteur — non supprimable.</q-tooltip>
        </q-icon>
      </div>
    </div>

    <q-btn
      class="new-contact-btn"
      dense
      flat
      no-caps
      icon="add"
      label="Nouveau contact"
      color="primary"
      @click="newDialog = true"
    />

    <q-dialog v-model="newDialog">
      <q-card class="new-card">
        <q-card-section>
          <div class="text-subtitle1">Nouveau contact</div>
          <q-input dense outlined label="Identifiant (id)" v-model="newId" class="q-mt-sm" />
          <q-input dense outlined ref="newNameInputRef" label="Nom" v-model="newName" class="q-mt-sm">
            <template #append>
              <EmojiPickerBtn @pick="(e) => (newName = insertEmojiAtCaret(newNameInputRef, newName, e))" />
            </template>
          </q-input>
          <q-input dense outlined label="Couleur (hex)" placeholder="#4c8bf5" v-model="newColor" class="q-mt-sm" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn flat label="Créer" color="primary" :disable="!newId || !newName" @click="createContact" v-close-popup />
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
import { serializeContacts } from '@/project/serializeChapter'
import EmojiPickerBtn from '@/editor/components/EmojiPickerBtn.vue'
import { insertEmojiAtCaret } from '@/editor/utils/emojiInsert'

defineProps({ modelValue: { type: Number, default: 0 } })
const emit = defineEmits(['update:modelValue'])
const story = useStoryStore()

const contacts = story.project.contacts
const newDialog = ref(false)
const newId = ref('')
const newName = ref('')
const newNameInputRef = ref(null)
const newColor = ref('#4c8bf5')

async function persist() {
  await window.storieAPI.saveContacts({ rootPath: story.project.rootPath, source: serializeContacts(contacts) })
}

function confirmDelete(contact) {
  const refs = findReferences(story.project, { type: 'contact', id: contact.id })
  if (refs.length) {
    Dialog.create({
      title: 'Suppression impossible',
      message: `« ${contact.name || contact.id} » est encore référencé :\n\n${refs.join('\n')}`,
      ok: true,
      color: 'primary',
    })
    return
  }
  Dialog.create({
    title: 'Supprimer ce contact ?',
    message: `« ${contact.name || contact.id} » sera supprimé du disque. Cette action est irréversible.`,
    cancel: true,
    persistent: true,
    color: 'negative',
  }).onOk(async () => {
    const idx = contacts.findIndex((c) => c.id === contact.id)
    contacts.splice(idx, 1)
    await persist()
    Notify.create({ type: 'positive', message: 'Contact supprimé.' })
  })
}

async function createContact() {
  const id = newId.value.trim()
  if (!id || contacts.some((c) => c.id === id)) return
  contacts.push({ id, name: newName.value.trim() || id, color: newColor.value || '#999999' })
  await persist()
  newId.value = ''
  newName.value = ''
  newColor.value = '#4c8bf5'
  Notify.create({ type: 'positive', message: 'Contact créé.' })
}
</script>

<style scoped>
.contact-list {
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

.contact-row {
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

.contact-row:hover {
  background: var(--color-surface-hover);
}

.contact-row.active {
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

.contact-row.active .active-bar {
  background: var(--color-accent);
}

.swatch {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
}

.contact-info {
  flex: 1;
  min-width: 0;
}

.contact-name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.contact-id {
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

.contact-row:hover .row-actions,
.contact-row.active .row-actions {
  opacity: 1;
}

.locked-icon {
  color: var(--color-text-muted);
  cursor: help;
}

.new-contact-btn {
  margin-top: var(--space-2);
  justify-content: flex-start;
}

.new-card {
  min-width: 320px;
  background: var(--color-surface);
  color: var(--color-text);
}
</style>
