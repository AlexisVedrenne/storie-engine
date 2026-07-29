<template>
  <div class="events-editor">
    <p class="intro">
      Réagit à une action du joueur (pas à la timeline d'un chapitre) — ouvrir une app, consulter
      une photo... Réutilise les mêmes conditions/effets que partout ailleurs.
      <FieldHelp text="Voir docs/roadmap-modular-apps-events.md — un event n'est pas un deuxième système narratif : ses conséquences (onglet 'Ensuite') sont jouées par le même moteur que la timeline d'un chapitre." />
    </p>

    <div v-if="!events.length" class="empty-state">Aucun event pour l'instant.</div>

    <div class="cards">
      <div v-for="(evt, i) in events" :key="i" class="card" :class="{ open: expanded[i] }">
        <div class="card-header" @click="toggle(i)">
          <q-icon :name="expanded[i] ? 'expand_less' : 'expand_more'" size="18px" class="chevron" />
          <q-icon name="sensors" size="16px" class="type-icon" />
          <span class="summary" :title="summaryFor(evt)">{{ summaryFor(evt) }}</span>
          <div class="spacer" />
          <div class="row-actions">
            <q-btn dense flat round icon="arrow_upward" size="sm" :disable="i === 0" @click.stop="moveUp(i)">
              <q-tooltip>Monter</q-tooltip>
            </q-btn>
            <q-btn dense flat round icon="arrow_downward" size="sm" :disable="i === events.length - 1" @click.stop="moveDown(i)">
              <q-tooltip>Descendre</q-tooltip>
            </q-btn>
            <q-btn dense flat round icon="delete" size="sm" color="negative" @click.stop="remove(i)">
              <q-tooltip>Supprimer</q-tooltip>
            </q-btn>
          </div>
        </div>

        <div v-if="expanded[i]" class="card-body">
          <div class="row">
            <q-select
              dense
              outlined
              emit-value
              map-options
              class="grow"
              label="Quand"
              :options="TRIGGER_OPTIONS"
              v-model="evt.trigger"
            />
            <q-select
              v-if="matchFieldFor(evt.trigger)?.key === 'app'"
              dense
              outlined
              clearable
              emit-value
              map-options
              class="grow"
              :label="matchFieldFor(evt.trigger).label + ' (optionnel — vide = n’importe laquelle)'"
              :options="appOptions"
              :model-value="evt.match?.app || null"
              @update:model-value="(v) => setMatchValue(evt, v)"
            />
            <q-input
              v-else-if="matchFieldFor(evt.trigger)"
              dense
              outlined
              class="grow"
              :label="matchFieldFor(evt.trigger).label + ' (optionnel — vide = n’importe laquelle)'"
              :model-value="evt.match?.[matchFieldFor(evt.trigger).key] || ''"
              @update:model-value="(v) => setMatchValue(evt, v)"
            />
          </div>

          <q-tabs
            :model-value="tabFor(i)"
            dense
            no-caps
            inline-label
            align="left"
            class="event-tabs"
            active-color="primary"
            indicator-color="primary"
            @update:model-value="(v) => (activeTabs[i] = v)"
          >
            <q-tab name="then" icon="arrow_forward" label="Ensuite" />
            <q-tab name="effects" icon="bolt" label="Conséquences" />
            <q-tab name="requires" icon="rule" label="Condition" />
          </q-tabs>

          <q-tab-panels :model-value="tabFor(i)" animated class="event-panels">
            <q-tab-panel name="then" class="event-panel">
              <p class="tab-help">
                Ce qui se joue quand cet event se déclenche — mêmes types d'entrée que dans une
                timeline de chapitre.
              </p>
              <TimelineEditor :entries="ensureThen(evt)" />
            </q-tab-panel>

            <q-tab-panel name="effects" class="event-panel">
              <EffectsBuilder :model-value="evt.effects" @update:model-value="(v) => (evt.effects = v)" />
            </q-tab-panel>

            <q-tab-panel name="requires" class="event-panel">
              <p class="tab-help">
                Ne se déclenche que si ces conditions sont vraies au moment de l'action du joueur.
              </p>
              <RequiresBuilder :model-value="evt.requires" @update:model-value="(v) => (evt.requires = v)" />
            </q-tab-panel>
          </q-tab-panels>
        </div>
      </div>
    </div>

    <q-btn dense flat no-caps icon="add" label="Ajouter un event" color="primary" class="add-btn" @click="addEvent" />
  </div>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStoryStore } from '@/engine/stores/story'
import { ENGINE_TRIGGERS } from '@/engine/events/eventManager'
import { APP_REGISTRY } from '@/engine/apps/registry'
import RequiresBuilder from '@/editor/components/RequiresBuilder.vue'
import EffectsBuilder from '@/editor/components/EffectsBuilder.vue'
import TimelineEditor from '@/editor/components/TimelineEditor.vue'
import FieldHelp from '@/editor/components/FieldHelp.vue'

const story = useStoryStore()
const { t } = useI18n()

// Same registry HomeScreen.vue/GameForm.vue read — an author picking which
// app an "app.opened" event should match against gets the real, current
// app list (built-in or plugged-in) instead of typing a raw id they have
// no way of knowing.
const appOptions = computed(() => APP_REGISTRY.map((app) => ({ label: t(app.labelKey), value: app.id })))

// Friendly label per trigger, and which single `match` key (if any) it's
// worth exposing a field for — matchEvent.js's `match` is a generic
// shallow filter, but with only 2 real engine triggers today a full
// dynamic key/value list would be over-built; adding a 3rd trigger means
// adding one entry here too, same deliberate weight as ENGINE_TRIGGERS
// itself (see eventManager.js's own comment).
const TRIGGER_LABELS = {
  'app.opened': 'Application ouverte',
  'photo.viewed': 'Photo consultée',
}
const TRIGGER_OPTIONS = ENGINE_TRIGGERS.map((t) => ({ label: TRIGGER_LABELS[t] || t, value: t }))
const MATCH_FIELD_BY_TRIGGER = {
  'app.opened': { key: 'app', label: 'Id de l’application' },
  'photo.viewed': { key: 'photoId', label: 'Id de la photo' },
}
function matchFieldFor(trigger) {
  return MATCH_FIELD_BY_TRIGGER[trigger] || null
}
function setMatchValue(evt, value) {
  const field = matchFieldFor(evt.trigger)
  if (!field) return
  if (!value) {
    delete evt.match?.[field.key]
    if (evt.match && !Object.keys(evt.match).length) evt.match = undefined
    return
  }
  if (!evt.match) evt.match = {}
  evt.match[field.key] = value
}

// game.events is optional/absent on any project created before this
// feature existed — same lazy-init pattern as GameForm.vue's game.sounds.
if (!story.project.gameConfig.events) story.project.gameConfig.events = []
const events = computed(() => story.project.gameConfig.events)

const expanded = reactive({})
function toggle(i) {
  expanded[i] = !expanded[i]
}
const activeTabs = reactive({})
function tabFor(i) {
  return activeTabs[i] || 'then'
}

function ensureThen(evt) {
  if (!evt.then) evt.then = []
  return evt.then
}

function addEvent() {
  events.value.push({ trigger: ENGINE_TRIGGERS[0], match: undefined, requires: null, effects: null, then: [] })
  expanded[events.value.length - 1] = true
}
function remove(i) {
  events.value.splice(i, 1)
}
function moveUp(i) {
  if (i === 0) return
  const [item] = events.value.splice(i, 1)
  events.value.splice(i - 1, 0, item)
}
function moveDown(i) {
  if (i === events.value.length - 1) return
  const [item] = events.value.splice(i, 1)
  events.value.splice(i + 1, 0, item)
}

function summaryFor(evt) {
  const label = TRIGGER_LABELS[evt.trigger] || evt.trigger || '(sans trigger)'
  const field = matchFieldFor(evt.trigger)
  const matchValue = field ? evt.match?.[field.key] : null
  if (!matchValue) return label
  const appLabel = field.key === 'app' ? appOptions.value.find((o) => o.value === matchValue)?.label : null
  return `${label} — ${appLabel || matchValue}`
}
</script>

<style scoped>
.events-editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.intro {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  line-height: 1.5;
}

.empty-state {
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  padding: var(--space-6);
  text-align: center;
}

.cards {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-surface);
}

.card.open {
  border-color: var(--color-accent);
}

.card-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--row-height);
  padding: 0 var(--space-2) 0 var(--space-1);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.card-header:hover {
  background: var(--color-surface-hover);
}

.chevron {
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.type-icon {
  color: var(--color-text-muted);
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

.card-header:hover .row-actions {
  opacity: 1;
}

.card-body {
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  border-top: 1px solid var(--color-border);
  background: var(--color-bg);
}

.row {
  display: flex;
  gap: var(--space-3);
}

.grow {
  flex: 1;
}

.event-tabs {
  border-bottom: 1px solid var(--color-border);
}

.event-panels {
  background: transparent;
}

.event-panel {
  padding: var(--space-3) 0 0;
}

.tab-help {
  margin: 0 0 var(--space-2);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  line-height: 1.5;
}

.add-btn {
  margin-top: var(--space-1);
  justify-content: flex-start;
}
</style>
