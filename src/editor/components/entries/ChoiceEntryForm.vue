<template>
  <div class="entry-form">
    <div class="field-group">
      <div class="section-label">Où arrive la réponse du joueur ?</div>
      <div class="row">
        <q-btn-toggle
          dense
          no-caps
          :model-value="target.mode"
          :options="[
            { label: 'SMS', value: 'contact' },
            { label: 'DM Insta', value: 'thread' },
          ]"
          @update:model-value="setMode"
        />
        <q-select
          v-if="target.mode === 'contact'"
          dense
          outlined
          emit-value
          map-options
          class="target-select"
          label="Contact"
          :options="contactOptions"
          v-model="entry.contact"
        >
          <template #selected>
            <span class="selected-row">
              <span class="option-dot" :style="{ background: contactColor(entry.contact) }" />
              {{ contactLabel(entry.contact) }}
            </span>
          </template>
          <template #option="scope">
            <q-item v-bind="scope.itemProps">
              <q-item-section avatar>
                <span class="option-dot" :style="{ background: contactColor(scope.opt.value) }" />
              </q-item-section>
              <q-item-section>{{ scope.opt.label }}</q-item-section>
            </q-item>
          </template>
        </q-select>
        <q-select
          v-else
          dense
          outlined
          emit-value
          map-options
          class="target-select"
          label="Conversation (1:1 ou groupe)"
          :options="threadOptions"
          v-model="entry.thread"
        >
          <template #selected>
            <span class="selected-row">
              <span
                v-if="!isGroupThread(entry.thread)"
                class="option-dot"
                :style="{ background: contactColor(entry.thread) }"
              />
              <q-icon v-else name="group" size="16px" class="option-icon" />
              {{ threadLabel(entry.thread) }}
            </span>
          </template>
          <template #option="scope">
            <q-item v-bind="scope.itemProps">
              <q-item-section avatar>
                <span
                  v-if="!scope.opt.group"
                  class="option-dot"
                  :style="{ background: contactColor(scope.opt.value) }"
                />
                <q-icon v-else name="group" size="16px" class="option-icon" />
              </q-item-section>
              <q-item-section>{{ scope.opt.label }}</q-item-section>
            </q-item>
          </template>
        </q-select>
      </div>
    </div>

    <q-input
      dense
      outlined
      label="Question posée au joueur"
      placeholder="ex: Que réponds-tu ?"
      v-model="entry.prompt"
    />

    <div class="section-title">
      Options de réponse
      <FieldHelp
        text="Chaque option devient un bouton proposé au joueur. Le texte choisi part comme sa réponse."
      />
    </div>
    <q-expansion-item
      v-for="(option, i) in entry.options"
      :key="i"
      v-model="expandedOptions[i]"
      class="option-card"
    >
      <template #header>
        <q-item-section
          >Option {{ i + 1
          }}{{ option.text ? ' — ' + option.text : ' (texte vide)' }}</q-item-section
        >
        <q-item-section side>
          <q-btn
            dense
            flat
            round
            icon="close"
            size="sm"
            color="negative"
            :disable="entry.options.length <= 1"
            @click.stop="removeOption(i)"
          >
            <q-tooltip>
              {{
                entry.options.length <= 1
                  ? "Un choix a besoin d'au moins une option"
                  : 'Supprimer cette option'
              }}
            </q-tooltip>
          </q-btn>
        </q-item-section>
      </template>

      <div class="option-body">
        <q-input
          dense
          outlined
          label="Texte du bouton"
          placeholder="ex: Ok, j'arrive"
          v-model="option.text"
        />

        <RoutePickerField
          v-model="option.route"
          label="Mène vers la route (optionnel — pour un choix clé)"
        />

        <q-tabs
          :model-value="tabFor(i)"
          dense
          no-caps
          inline-label
          align="left"
          class="option-tabs"
          active-color="primary"
          indicator-color="primary"
          @update:model-value="(v) => (activeTabs[i] = v)"
        >
          <q-tab name="then" icon="arrow_forward" label="Juste après" />
          <q-tab name="effects" icon="bolt" label="Conséquences" />
          <q-tab name="requires" icon="rule" label="Condition" />
        </q-tabs>

        <q-tab-panels :model-value="tabFor(i)" animated class="option-panels">
          <q-tab-panel name="then" class="option-panel">
            <p class="tab-help">
              Ce qui se joue immédiatement après ce choix (ex: la réponse du contact) — tous les
              types d'entrée sont disponibles ici, comme dans la timeline principale.
            </p>
            <TimelineEditor
              :entries="ensureThen(option)"
              :breadcrumb="[...breadcrumb, optionSegment(option, i)]"
            />
          </q-tab-panel>

          <q-tab-panel name="effects" class="option-panel">
            <p class="tab-help">
              Change des stats/l'état du jeu quand le joueur choisit cette option (indépendant de ce
              qui s'affiche juste après).
            </p>
            <EffectsBuilder
              :model-value="option.effects"
              @update:model-value="(v) => (option.effects = v)"
            />
          </q-tab-panel>

          <q-tab-panel name="requires" class="option-panel">
            <p class="tab-help">
              Cette option n'est proposée que si toutes ces conditions sont vraies. Garde toujours
              au moins une option sans condition, sinon le choix peut se retrouver vide.
            </p>
            <RequiresBuilder
              :model-value="option.requires"
              @update:model-value="(v) => (option.requires = v)"
            />
          </q-tab-panel>
        </q-tab-panels>
      </div>
    </q-expansion-item>
    <q-btn
      dense
      flat
      no-caps
      icon="add"
      label="Ajouter une option"
      class="btn-ghost"
      @click="addOption"
    />
  </div>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { useContactOptions } from '@/editor/composables/useContactOptions'
import RequiresBuilder from '@/editor/components/RequiresBuilder.vue'
import EffectsBuilder from '@/editor/components/EffectsBuilder.vue'
import TimelineEditor from '@/editor/components/TimelineEditor.vue'
import FieldHelp from '@/editor/components/FieldHelp.vue'
import RoutePickerField from '@/editor/components/RoutePickerField.vue'

// `breadcrumb` — see docs/ui-ux-audit.md point 2 / TimelineEditor.vue's own
// prop of the same name. Forwarded here (not built by TimelineEditor
// itself) because TimelineEditor only knows about the choice ENTRY, not
// which option is being edited — this component owns that next segment.
const props = defineProps({
  entry: { type: Object, required: true },
  breadcrumb: { type: Array, default: () => [] },
})
const {
  contactOptionsNoMe: contactOptions,
  threadOptions,
  contactColor,
  contactLabel,
  isGroupThread,
  threadLabel,
} = useContactOptions()

// Controls each option's q-expansion-item (previously uncontrolled) so a
// breadcrumb click can collapse it programmatically — see optionSegment()
// below.
const expandedOptions = reactive({})

function optionSegment(option, i) {
  return {
    label: `Option ${i + 1}${option.text ? ' — ' + option.text : ''}`,
    collapse: () => (expandedOptions[i] = false),
  }
}

const target = computed(() => ({ mode: props.entry.thread ? 'thread' : 'contact' }))

function setMode(mode) {
  if (mode === 'contact') {
    props.entry.thread = undefined
    if (!props.entry.contact) props.entry.contact = contactOptions.value[0]?.value
  } else {
    props.entry.contact = undefined
    if (!props.entry.thread) props.entry.thread = threadOptions.value[0]?.value
  }
}

function ensureThen(option) {
  if (!option.then) option.then = []
  return option.then
}

// Which tab is open per option — UI-only, kept out of `option` itself so it
// never gets written to disk (serializeChapter would otherwise persist it
// as story data). Defaults to "then" (see docs/phase2-plan.md follow-up):
// that's the section people actually reach for most, and it was easy to
// miss buried under Condition/Conséquences when everything was stacked.
const activeTabs = reactive({})
function tabFor(i) {
  return activeTabs[i] || 'then'
}

function addOption() {
  if (!props.entry.options) props.entry.options = []
  props.entry.options.push({ text: '', then: [] })
  expandedOptions[props.entry.options.length - 1] = true
}
function removeOption(i) {
  props.entry.options.splice(i, 1)
}
</script>

<style scoped>
.entry-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.target-select {
  flex: 1;
}

.selected-row {
  display: inline-flex;
  align-items: center;
}

.option-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-right: var(--space-1);
}

.option-icon {
  margin-right: var(--space-1);
  color: var(--color-text-muted);
}

.section-label {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.section-title {
  display: flex;
  align-items: center;
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  margin-top: var(--space-1);
}

.option-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.option-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
}

.option-tabs {
  border-bottom: 1px solid var(--color-border);
}

.option-panels {
  background: transparent;
}

.option-panel {
  padding: var(--space-3) 0 0;
}

.tab-help {
  margin: 0 0 var(--space-2);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  line-height: 1.5;
}
</style>
