<template>
  <div class="event-list">
    <div class="pane-label">{{ t('eventList.paneLabel') }}</div>

    <div v-if="!events.length" class="empty-hint">{{ t('eventList.empty') }}</div>

    <div
      v-for="(evt, i) in events"
      :key="i"
      class="event-row"
      :class="{ active: i === modelValue }"
      @click="emit('update:modelValue', i)"
    >
      <div class="active-bar" />
      <q-icon name="sensors" size="16px" class="row-icon" />
      <div class="event-info">
        <div class="event-summary" :title="summaryFor(evt)">{{ summaryFor(evt) }}</div>
      </div>
      <q-btn dense flat round icon="delete" size="sm" color="negative" class="row-actions" @click.stop="remove(i)">
        <q-tooltip>{{ t('common.delete') }}</q-tooltip>
      </q-btn>
    </div>

    <div class="pane-label add-label">{{ t('eventList.addEvent') }}</div>
    <div v-for="group in groups" :key="group.id" class="add-group">
      <div class="add-group-header">
        <q-icon v-if="group.icon" :name="group.icon" size="15px" :style="{ color: group.color }" />
        <img v-else-if="group.iconImage" :src="group.iconImage" class="add-group-icon" alt="" />
        <q-icon v-else name="apps" size="15px" />
        <span>{{ group.label }}</span>
      </div>
      <button v-for="trig in group.triggers" :key="trig.name" class="trigger-add-row" @click="addWithTrigger(trig.name)">
        <span>{{ triggerLabel(trig) }}</span>
        <q-icon name="add" size="16px" class="add-icon" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStoryStore } from '@/engine/stores/story'
import { APP_REGISTRY } from '@/engine/apps/registry'
import { triggerDef, commonTriggers, triggersForApp } from '@/engine/events/triggers'
import { useContactOptions } from '@/components/shared/useContactOptions'
import { useEditorI18n } from '@/editor/i18n'
import { triggerLabel } from '@/editor/i18n/sharedOverrides'

defineProps({ modelValue: { type: Number, default: 0 } })
const emit = defineEmits(['update:modelValue'])
const story = useStoryStore()
// Two DIFFERENT i18n systems in play here, deliberately not merged (see
// src/editor/i18n/index.js's header comment): `storyT` translates
// player-facing app names (APP_REGISTRY labels, also shown in-game) via
// the shared vue-i18n instance; `t` is the editor's OWN chrome language.
const { t: storyT } = useI18n()
const { t } = useEditorI18n()
const { contactLabel } = useContactOptions()

// game.events is optional/absent on any project created before this
// feature existed — same lazy-init pattern as GameForm.vue's game.sounds.
if (!story.project.gameConfig.events) story.project.gameConfig.events = []
const events = computed(() => story.project.gameConfig.events)

function remove(i) {
  events.value.splice(i, 1)
  if (i === events.value.length) emit('update:modelValue', Math.max(0, i - 1))
}

// "Commun" first (cross-app triggers — opening/leaving ANY app), then one
// group per app that actually HAS at least one trigger of its own — an app
// with none (Appels/Réglages/Email today) just doesn't show up yet rather
// than offering a dead-end group with nothing in it.
const groups = computed(() => {
  const list = [{ id: 'common', label: t('eventList.common'), triggers: commonTriggers() }]
  for (const app of APP_REGISTRY) {
    const triggers = triggersForApp(app.id)
    if (triggers.length) {
      list.push({ id: app.id, label: storyT(app.labelKey), icon: app.icon, color: app.color, iconImage: app.iconImage, triggers })
    }
  }
  return list
})

// Every leaf in the menu is one exact, already-known trigger — no
// auto-picked default to second-guess, matches the request to see "post
// liké, profil ouvert, etc." laid out directly rather than picking an app
// and hoping the right one got pre-selected.
function addWithTrigger(triggerName) {
  events.value.push({ trigger: triggerName, match: undefined, requires: null, effects: null, then: [] })
  emit('update:modelValue', events.value.length - 1)
}

// A `title` (see EventForm.vue) always wins — without one, several events
// on the same trigger (e.g. 3 different "Photo consultée" reactions) would
// otherwise show up as visually identical rows in the list.
function summaryFor(evt) {
  if (evt.title) return evt.title

  const def = triggerDef(evt.trigger)
  const label = (def ? triggerLabel(def) : '') || evt.trigger || t('eventList.noTrigger')
  const parts = []
  for (const field of def?.matchFields || []) {
    const matchValue = evt.match?.[field.key]
    if (matchValue === undefined || matchValue === null || matchValue === '') continue
    let shown = matchValue
    if (field.optionsFrom === 'apps') shown = storyT(APP_REGISTRY.find((a) => a.id === matchValue)?.labelKey || matchValue)
    else if (field.optionsFrom === 'contacts') shown = contactLabel(matchValue)
    else if (field.optionsFrom === 'photos') shown = String(matchValue).split('/').pop()
    parts.push(shown)
  }
  return parts.length ? `${label} — ${parts.join(', ')}` : label
}
</script>

<style scoped>
.event-list {
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

.add-label {
  margin-top: var(--space-2);
  display: flex;
  align-items: center;
  gap: var(--space-1);
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-3);
}

.empty-hint {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  font-style: italic;
  padding: 0 var(--space-3);
}

.event-row {
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

.event-row:hover {
  background: var(--color-surface-hover);
}

.event-row.active {
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

.event-row.active .active-bar {
  background: var(--color-accent);
}

.row-icon {
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.event-info {
  flex: 1;
  min-width: 0;
}

.event-summary {
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

.event-row:hover .row-actions {
  opacity: 1;
}

.add-group {
  display: flex;
  flex-direction: column;
}

.add-group-header {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3) 2px;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-muted);
}

.add-group-icon {
  width: 15px;
  height: 15px;
  border-radius: 3px;
  object-fit: cover;
}

.trigger-add-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  min-height: var(--row-height);
  padding: var(--space-1) var(--space-3) var(--space-1) var(--space-5);
  border: none;
  background: none;
  color: var(--color-text);
  font-size: var(--text-sm);
  text-align: left;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: background-color var(--transition-fast);
}

.trigger-add-row:hover {
  background: var(--color-surface-hover);
}

.trigger-add-row span {
  flex: 1;
}

.add-icon {
  color: var(--color-text-muted);
}
</style>
