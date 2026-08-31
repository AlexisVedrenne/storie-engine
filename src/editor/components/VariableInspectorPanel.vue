<template>
  <div class="variable-inspector" :class="{ collapsed }">
    <button
      class="inspector-toggle"
      type="button"
      @click="collapsed = !collapsed"
      :aria-label="t('variableInspector.toggle')"
    >
      <q-icon :name="collapsed ? 'chevron_left' : 'chevron_right'" size="18px" />
    </button>
    <div v-if="!collapsed" class="inspector-body">
      <div class="inspector-title">
        {{ t('variableInspector.title') }}
        <FieldHelp :text="t('variableInspector.help')" />
      </div>
      <div v-if="!variables.length" class="inspector-empty">{{ t('variableInspector.empty') }}</div>
      <div v-for="v in variables" :key="rowKey(v)" class="inspector-row">
        <div class="inspector-name">{{ labelFor(v) }}</div>
        <div class="inspector-value">{{ valueFor(v) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Live variable inspector (pilier 07) — while authoring a custom app
// screen, shows the CURRENT value of every flag/entity field that screen's
// own blocks actually reference (see collectScreenVariables.js), so an
// invisible display condition or action guard isn't a total black box.
// Reads `phone.editorActiveScreen` (set by CustomAppEditor.vue whenever its
// own screen selection changes — see that field's own comment in phone.js
// for why it isn't the LIVE preview's own current screen instead) and
// `story`'s actual live state directly, so values update in real time as
// the author clicks around the preview (a button applying an effect, a
// seed instance changing).
import { computed, ref } from 'vue'
import { usePhoneStore } from '@/engine/stores/phone'
import { useStoryStore } from '@/engine/stores/story'
import { collectScreenVariables } from '@/engine/customApps/collectScreenVariables'
import FieldHelp from '@/editor/components/FieldHelp.vue'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
const phone = usePhoneStore()
const story = useStoryStore()
const collapsed = ref(false)

const variables = computed(() => collectScreenVariables(phone.editorActiveScreen?.blocks))

function rowKey(v) {
  return v.kind === 'entity'
    ? `entity:${v.schemaId}:${v.entityId}:${v.fieldKey}`
    : `${v.kind}:${v.key}`
}

function findSchema(schemaId) {
  return story.project?.gameConfig?.entitySchemas?.find((s) => s.id === schemaId)
}
function schemaLabel(schemaId) {
  return findSchema(schemaId)?.label || schemaId
}
function fieldLabel(schemaId, fieldKey) {
  return findSchema(schemaId)?.fields?.find((f) => f.key === fieldKey)?.label || fieldKey
}
function resolvedEntityId(schemaId, entityId) {
  if (entityId && entityId !== '*') return entityId
  return story.entityItems(schemaId)[0]?.id || null
}

function labelFor(v) {
  if (v.kind === 'flag' || v.kind === 'collection') return v.key
  return `${schemaLabel(v.schemaId)} · ${fieldLabel(v.schemaId, v.fieldKey)}`
}

function valueFor(v) {
  if (v.kind === 'flag') {
    const val = story.flags[v.key]
    return val === undefined ? t('variableInspector.unset') : String(val)
  }
  if (v.kind === 'collection') {
    const col = story.flagCollections[v.key]
    return t('variableInspector.collectionCount', { n: col ? Object.keys(col).length : 0 })
  }
  const id = resolvedEntityId(v.schemaId, v.entityId)
  if (!id) return t('variableInspector.noInstance')
  const val = story.entities?.[v.schemaId]?.[id]?.[v.fieldKey]
  return val === undefined || val === '' ? t('variableInspector.unset') : String(val)
}
</script>

<style scoped>
.variable-inspector {
  display: flex;
  align-items: stretch;
  height: 100%;
  max-height: 100%;
}

.inspector-toggle {
  flex-shrink: 0;
  width: 22px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-muted);
  cursor: pointer;
}

.inspector-toggle:hover {
  background: var(--color-surface-hover, var(--color-surface));
}

.inspector-body {
  width: 220px;
  overflow-y: auto;
  padding: var(--space-3);
  margin-left: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
}

.inspector-title {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  margin-bottom: var(--space-2);
}

.inspector-empty {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  font-style: italic;
}

.inspector-row {
  padding: var(--space-1) 0;
  border-bottom: 1px solid var(--color-border);
}

.inspector-row:last-child {
  border-bottom: none;
}

.inspector-name {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  overflow-wrap: break-word;
}

.inspector-value {
  font-size: var(--text-sm);
  font-weight: 600;
  overflow-wrap: break-word;
}
</style>
