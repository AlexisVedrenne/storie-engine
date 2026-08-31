<template>
  <div class="automation-list">
    <div class="pane-label">{{ t('editorPage.reactionsSubAutomations') }}</div>

    <div v-if="!automations.length" class="empty-hint">{{ t('automationList.empty') }}</div>

    <div
      v-for="(def, i) in automations"
      :key="def.id"
      class="automation-row"
      :class="{ active: i === modelValue }"
      @click="emit('update:modelValue', i)"
    >
      <div class="active-bar" />
      <q-icon name="bolt" size="16px" class="row-icon" />
      <div class="automation-info">
        <div class="automation-name" :title="def.label || def.id">{{ def.label || def.id }}</div>
      </div>
      <q-btn
        dense
        flat
        round
        icon="delete"
        size="sm"
        color="negative"
        class="row-actions"
        @click.stop="remove(i)"
      >
        <q-tooltip>{{ t('common.delete') }}</q-tooltip>
      </q-btn>
    </div>

    <q-btn
      class="new-btn"
      dense
      flat
      no-caps
      icon="add"
      :label="t('automationList.newAutomation')"
      color="primary"
      @click="create"
    />
  </div>
</template>

<script setup>
// Mirrors EntitySchemaList.vue's own list/select/create/delete shape exactly
// — one more catalog living in game.automations (see story.js's
// evaluateAutomations for the runtime side, AutomationForm.vue for the
// per-rule editor).
import { computed } from 'vue'
import { Dialog } from 'quasar'
import { useStoryStore } from '@/engine/stores/story'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
defineProps({ modelValue: { type: Number, default: 0 } })
const emit = defineEmits(['update:modelValue'])
const story = useStoryStore()

if (!story.project.gameConfig.automations) story.project.gameConfig.automations = []
const automations = computed(() => story.project.gameConfig.automations)

function create() {
  const id = `automation-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  automations.value.push({
    id,
    label: '',
    requires: null,
    action: { type: 'none' },
    repeatMode: 'once',
    repeatCount: 1,
  })
  emit('update:modelValue', automations.value.length - 1)
}

// Same confirm-before-delete protection as Contact/Thread/CustomApp/Locale
// rows already have — this list previously deleted on a single stray click.
function remove(i) {
  const def = automations.value[i]
  Dialog.create({
    title: t('automationList.confirmDeleteTitle'),
    message: t('automationList.confirmDeleteMessage', { name: def.label || def.id }),
    cancel: true,
    persistent: true,
    color: 'negative',
  }).onOk(() => {
    const idx = automations.value.indexOf(def)
    if (idx === -1) return
    automations.value.splice(idx, 1)
    if (idx === automations.value.length) emit('update:modelValue', Math.max(0, idx - 1))
  })
}
</script>

<style scoped>
.automation-list {
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

.automation-row {
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

.automation-row:hover {
  background: var(--color-surface-hover);
}

.automation-row.active {
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

.automation-row.active .active-bar {
  background: var(--color-accent);
}

.row-icon {
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.automation-info {
  flex: 1;
  min-width: 0;
}

.automation-name {
  font-size: var(--text-sm);
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-actions {
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.automation-row:hover .row-actions {
  opacity: 1;
}

.new-btn {
  margin-top: var(--space-2);
}
</style>
