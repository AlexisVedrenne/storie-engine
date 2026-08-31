<template>
  <div class="interaction-list">
    <div class="pane-label">{{ t('editorPage.tabInteractions') }}</div>

    <div v-if="!interactions.length" class="empty-hint">{{ t('interactionList.empty') }}</div>

    <div
      v-for="(def, i) in interactions"
      :key="def.id"
      class="interaction-row"
      :class="{ active: i === modelValue }"
      @click="emit('update:modelValue', i)"
    >
      <div class="active-bar" />
      <q-icon name="touch_app" size="16px" class="row-icon" />
      <div class="interaction-info">
        <div class="interaction-name" :title="def.name || def.id">{{ def.name || def.id }}</div>
        <div class="interaction-id">{{ def.id }} · {{ t('interactionList.stepsCount', { n: (def.steps || []).length }) }}</div>
      </div>
      <q-btn dense flat round icon="delete" size="sm" color="negative" class="row-actions" @click.stop="remove(i)">
        <q-tooltip>{{ t('common.delete') }}</q-tooltip>
      </q-btn>
    </div>

    <q-btn
      class="new-btn"
      dense
      flat
      no-caps
      icon="add"
      :label="t('interactionList.newInteraction')"
      color="primary"
      @click="newDialog = true"
    />

    <q-dialog v-model="newDialog">
      <q-card class="new-card">
        <q-card-section>
          <div class="text-subtitle1">{{ t('interactionList.newInteraction') }}</div>
          <q-input dense outlined :label="t('interactionList.idLabel')" v-model="newId" class="q-mt-sm" />
          <q-input dense outlined :label="t('interactionList.nameLabel')" v-model="newName" class="q-mt-sm" />
          <div v-if="idTaken" class="id-warning">{{ t('interactionList.idTaken') }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" v-close-popup />
          <q-btn
            flat
            :label="t('common.create')"
            color="primary"
            :disable="!newId || !newName || idTaken"
            @click="create"
            v-close-popup
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Dialog } from 'quasar'
import { useStoryStore } from '@/engine/stores/story'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
defineProps({ modelValue: { type: Number, default: 0 } })
const emit = defineEmits(['update:modelValue'])
const story = useStoryStore()

// game.interactions is optional/absent on any project created before this
// feature existed — same lazy-init pattern as game.events (EventList.vue).
if (!story.project.gameConfig.interactions) story.project.gameConfig.interactions = []
const interactions = computed(() => story.project.gameConfig.interactions)

const newDialog = ref(false)
const newId = ref('')
const newName = ref('')
const idTaken = computed(() => interactions.value.some((d) => d.id === newId.value))

function create() {
  interactions.value.push({ id: newId.value, name: newName.value, steps: [] })
  emit('update:modelValue', interactions.value.length - 1)
  newId.value = ''
  newName.value = ''
}

// Same confirm-before-delete protection as Contact/Thread/CustomApp/Locale
// rows already have — this list previously deleted on a single stray click,
// discarding the def's own authored `.steps[]` sequence with it.
function remove(i) {
  const def = interactions.value[i]
  Dialog.create({
    title: t('interactionList.confirmDeleteTitle'),
    message: t('interactionList.confirmDeleteMessage', { name: def.name || def.id }),
    cancel: true,
    persistent: true,
    color: 'negative',
  }).onOk(() => {
    const idx = interactions.value.indexOf(def)
    if (idx === -1) return
    interactions.value.splice(idx, 1)
    if (idx === interactions.value.length) emit('update:modelValue', Math.max(0, idx - 1))
  })
}
</script>

<style scoped>
.interaction-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.pane-label {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  padding: var(--space-2) var(--space-3) var(--space-1);
}

.empty-hint {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  font-style: italic;
  padding: 0 var(--space-3);
}

.interaction-row {
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

.interaction-row:hover {
  background: var(--color-surface-hover);
}

.interaction-row.active {
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

.interaction-row.active .active-bar {
  background: var(--color-accent);
}

.row-icon {
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.interaction-info {
  flex: 1;
  min-width: 0;
}

.interaction-name {
  font-size: var(--text-sm);
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.interaction-id {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.row-actions {
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.interaction-row:hover .row-actions {
  opacity: 1;
}

.new-btn {
  margin-top: var(--space-2);
}

.id-warning {
  color: var(--color-negative, #e05252);
  font-size: var(--text-xs);
  margin-top: var(--space-1);
}
</style>
