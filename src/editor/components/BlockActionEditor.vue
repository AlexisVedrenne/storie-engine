<template>
  <div class="prop-group-label">{{ t('blockProps.groupAction') }}</div>
  <q-select
    dense
    outlined
    emit-value
    map-options
    :label="t('blockProps.actionTypeLabel')"
    :model-value="action.type"
    :options="actionOptions"
    @update:model-value="setActionType"
  />
  <template v-if="action.type === 'effect'">
    <p class="tab-help">{{ t('blockProps.actionEffectHelp') }}</p>
    <EffectsBuilder
      :model-value="action.effects"
      @update:model-value="(v) => (action.effects = v)"
    />
  </template>
  <template v-else-if="action.type === 'navigateScreen'">
    <q-select
      dense
      outlined
      emit-value
      map-options
      :label="t('blockProps.actionNavigateScreenLabel')"
      :options="screenOptions"
      v-model="action.screenId"
    />
  </template>
  <template v-else-if="action.type === 'event'">
    <p class="tab-help">{{ t('blockProps.actionEventHelp') }}</p>
    <q-input
      dense
      outlined
      :label="t('blockProps.actionEventButtonIdLabel')"
      :hint="t('blockProps.actionEventButtonIdHint')"
      v-model="action.buttonId"
    />
  </template>
  <template v-else-if="action.type === 'toast'">
    <p class="tab-help">{{ t('blockProps.actionToastHelp') }}</p>
    <q-input
      dense
      outlined
      :label="t('blockProps.actionToastTextLabel')"
      v-model="action.toastText"
    />
  </template>
  <template v-else-if="action.type === 'openSheet'">
    <p class="tab-help">{{ t('blockProps.actionOpenSheetHelp') }}</p>
    <q-select
      dense
      outlined
      emit-value
      map-options
      :label="t('blockProps.actionOpenSheetLabel')"
      :options="sheetOptions"
      v-model="action.sheetId"
    />
  </template>
  <p v-else-if="action.type === 'closeSheet'" class="tab-help">
    {{ t('blockProps.actionCloseSheetHelp') }}
  </p>
  <template v-else-if="action.type === 'openApp'">
    <p class="tab-help">{{ t('blockProps.actionOpenAppHelp') }}</p>
    <q-select
      dense
      outlined
      emit-value
      map-options
      :label="t('blockProps.actionOpenAppLabel')"
      :options="appOptions"
      v-model="action.appId"
    />
    <q-select
      v-if="openAppScreenOptions.length"
      dense
      outlined
      emit-value
      map-options
      clearable
      :label="t('blockProps.actionOpenAppScreenLabel')"
      :hint="t('blockProps.actionOpenAppScreenHint')"
      :options="openAppScreenOptions"
      v-model="action.screenId"
    />
  </template>
  <template v-else-if="action.type === 'requestInput'">
    <p class="tab-help">{{ t('blockProps.actionRequestInputHelp') }}</p>
    <q-input dense outlined :label="t('blockProps.labelLabel')" v-model="action.label" />
    <FormTargetFields :target="action" />
  </template>
  <template v-else-if="action.type === 'triggerEntry'">
    <p class="tab-help">{{ t('blockProps.actionTriggerEntryHelp') }}</p>
    <TimelineEditor :entries="ensureThen()" />
  </template>
  <template v-else-if="action.type === 'wait'">
    <p class="tab-help">{{ t('blockProps.actionWaitHelp') }}</p>
    <q-input
      dense
      outlined
      type="number"
      :label="t('blockProps.actionWaitMsLabel')"
      suffix="ms"
      :model-value="action.ms ?? 1000"
      @update:model-value="(v) => (action.ms = v === null || v === '' ? 1000 : Number(v))"
    />
  </template>
  <template v-else-if="action.type === 'sequence'">
    <p class="tab-help">{{ t('blockProps.actionSequenceHelp') }}</p>
    <div v-for="(step, i) in ensureSteps()" :key="i" class="sequence-step-row">
      <div class="sequence-step-header">
        <span class="prop-group-label">{{
          t('blockProps.actionSequenceStepN', { n: i + 1 })
        }}</span>
        <q-btn dense flat round icon="close" size="sm" @click="removeStep(i)">
          <q-tooltip>{{ t('common.delete') }}</q-tooltip>
        </q-btn>
      </div>
      <BlockActionEditor
        :target="action.steps"
        :action-key="i"
        :screens="screens"
        :sheets="sheets"
        :help-text="t('blockProps.actionNone')"
      />
    </div>
    <q-btn
      dense
      flat
      no-caps
      icon="add"
      :label="t('blockProps.actionSequenceAddStep')"
      class="btn-ghost"
      @click="addStep"
    />
  </template>
  <p v-else class="tab-help">{{ helpText }}</p>

  <q-expansion-item
    v-if="action.type !== 'none'"
    dense
    :label="t('blockProps.actionGuardTitle')"
    class="spacing-section"
  >
    <div class="spacing-body condition-body">
      <p class="tab-help">{{ t('blockProps.actionGuardHelp') }}</p>
      <RequiresBuilder
        :model-value="action.requires"
        @update:model-value="(v) => (action.requires = v)"
      />
      <q-input
        dense
        outlined
        :label="t('blockProps.actionOnFailToastLabel')"
        :hint="t('blockProps.actionOnFailToastHint')"
        v-model="action.onFailToast"
      />
    </div>
  </q-expansion-item>
</template>

<script setup>
// Extracted from ButtonBlock's own properties form (the original, only
// consumer) so a `lookup` result's own action editor doesn't duplicate this
// wholesale — same fixed action catalog wherever it's offered, one
// implementation. `target[actionKey]` (default `actionKey: 'action'`) is
// read and MUTATED DIRECTLY, same "props mutated in place" convention every
// other editor form in this project already uses. `actionKey` generalizes
// beyond the default `.action` field so a `sequence`'s own STEPS (a plain
// array, each element itself an action-shaped object — see the roadmap's
// own `steps: [{type:'effect',...}, {type:'toast',...}]` example) can be
// edited the exact same way: passing `:target="action.steps" :action-key="i"`
// reads/writes `action.steps[i]` directly, letting this component recurse
// into itself for a sequence's own steps (Vue auto-registers an SFC's own
// filename as a recursive self-reference, no explicit import needed).
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStoryStore } from '@/engine/stores/story'
import EffectsBuilder from '@/editor/components/EffectsBuilder.vue'
import RequiresBuilder from '@/editor/components/RequiresBuilder.vue'
import FormTargetFields from '@/editor/components/FormTargetFields.vue'
// `triggerEntry`'s own `then` array is authored with the SAME full timeline
// editor a chapter uses — same reuse precedent as EventForm.vue's own
// `then` tab (`<TimelineEditor :entries="ensureThen()" />`), not a smaller
// purpose-built editor for what's structurally the exact same concept.
import TimelineEditor from '@/editor/components/TimelineEditor.vue'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
// Runtime vue-i18n instance (not useEditorI18n's editor-chrome tree) —
// resolves a native app's player-facing `labelKey` for the openApp target
// picker, same precedent as GameForm.vue's own `storyT`/`appLabel`.
const { t: storyT } = useI18n()
const story = useStoryStore()

const props = defineProps({
  target: { type: [Object, Array], required: true },
  // Which field of `target` holds the action — default `'action'` (a
  // button block, a lookup result); a `sequence` step passes its own
  // numeric index into `target.steps` instead. See the file-level comment.
  actionKey: { type: [String, Number], default: 'action' },
  // Every screen of the app being edited (id + display label) — populates
  // the navigateScreen/openApp screen pickers.
  screens: { type: Array, default: () => [] },
  // Every `sheet` block anywhere in the app (id + display label) —
  // populates the openSheet target picker.
  sheets: { type: Array, default: () => [] },
  // Shown when no action is set — the caller's own "what does this do by
  // default" copy (a button vs. a lookup result reads differently).
  helpText: { type: String, default: '' },
  // Kinds to hide from the dropdown — for a caller with no app-screen
  // context to inject() from (an automation, evaluated from inside the
  // Pinia store itself, not a mounted block component). Everything else
  // here mounts inside CustomAppRenderer, so this defaults to empty.
  excludeKinds: { type: Array, default: () => [] },
})

// Read-only — every real caller already guarantees `target[actionKey]`
// exists before this ever mounts (a button/lookup-result's own default
// block always sets `action: {type:'none'}`, `addStep()` below always
// pushes one too), so this never actually needs to CREATE the object
// itself; the `{type:'none'}` fallback only guards template rendering
// against a value that's momentarily absent, it's never written back
// (a computed with a side effect trips vue/no-side-effects-in-computed-properties).
const action = computed(() => props.target[props.actionKey] || { type: 'none' })

const actionOptions = computed(() =>
  [
    { label: t('blockProps.actionNone'), value: 'none' },
    { label: t('blockProps.actionEffect'), value: 'effect' },
    { label: t('blockProps.actionNavigateScreen'), value: 'navigateScreen' },
    { label: t('blockProps.actionEvent'), value: 'event' },
    { label: t('blockProps.actionToast'), value: 'toast' },
    { label: t('blockProps.actionOpenSheet'), value: 'openSheet' },
    { label: t('blockProps.actionCloseSheet'), value: 'closeSheet' },
    { label: t('blockProps.actionOpenApp'), value: 'openApp' },
    { label: t('blockProps.actionRequestInput'), value: 'requestInput' },
    { label: t('blockProps.actionTriggerEntry'), value: 'triggerEntry' },
    { label: t('blockProps.actionWait'), value: 'wait' },
    { label: t('blockProps.actionSequence'), value: 'sequence' },
  ].filter((opt) => !props.excludeKinds.includes(opt.value)),
)

// Switching kind replaces the action object wholesale (not just its
// `type`) — keeps stale fields from a previous kind (e.g. `effects` while
// now `navigateScreen`) from lingering unused in the saved block.
// `requires`/`onFailToast` are orthogonal to which kind is picked (a guard
// on TOP of whatever the action does), so they're carried over instead of
// wiped on every switch — except for 'none', which drops them: nothing
// decorative has anything for a condition to guard.
function setActionType(type) {
  const prev = props.target[props.actionKey] || {}
  const base =
    type === 'none' ? { type } : { type, requires: prev.requires, onFailToast: prev.onFailToast }
  if (type === 'effect') props.target[props.actionKey] = { ...base, effects: prev.effects || {} }
  else if (type === 'navigateScreen')
    props.target[props.actionKey] = { ...base, screenId: prev.screenId || '' }
  else if (type === 'event')
    props.target[props.actionKey] = { ...base, buttonId: prev.buttonId || '' }
  else if (type === 'toast')
    props.target[props.actionKey] = { ...base, toastText: prev.toastText || '' }
  else if (type === 'openSheet')
    props.target[props.actionKey] = { ...base, sheetId: prev.sheetId || '' }
  else if (type === 'closeSheet') props.target[props.actionKey] = { ...base }
  else if (type === 'openApp')
    props.target[props.actionKey] = {
      ...base,
      appId: prev.appId || '',
      screenId: prev.screenId || '',
    }
  else if (type === 'requestInput')
    props.target[props.actionKey] = {
      ...base,
      label: prev.label || '',
      target: prev.target || 'flag',
      flagKey: prev.flagKey || '',
      inputType: prev.inputType || 'text',
      schemaId: prev.schemaId || '',
      entityId: prev.entityId || '*',
      fieldKey: prev.fieldKey || '',
    }
  else if (type === 'triggerEntry')
    props.target[props.actionKey] = { ...base, then: prev.then || [] }
  else if (type === 'wait') props.target[props.actionKey] = { ...base, ms: prev.ms ?? 1000 }
  else if (type === 'sequence') props.target[props.actionKey] = { ...base, steps: prev.steps || [] }
  else props.target[props.actionKey] = { type: 'none' }
}

function ensureThen() {
  if (!action.value.then) action.value.then = []
  return action.value.then
}
function ensureSteps() {
  if (!action.value.steps) action.value.steps = []
  return action.value.steps
}
function addStep() {
  ensureSteps().push({ type: 'none' })
}
function removeStep(i) {
  action.value.steps.splice(i, 1)
}

const screenOptions = computed(() =>
  props.screens.map((s) => ({ label: s.label || s.id, value: s.id })),
)
const sheetOptions = computed(() =>
  props.sheets.map((s) => ({ label: s.label || s.id, value: s.id })),
)
const appOptions = computed(() =>
  (story.mergedAppRegistry || []).map((app) => ({
    label: app.labelKey ? storyT(app.labelKey) : app.label,
    value: app.id,
  })),
)
const openAppScreenOptions = computed(() => {
  const app = story.project?.customApps?.find((a) => a.id === action.value.appId)
  return (app?.screens || []).map((s) => ({ label: s.label || s.id, value: s.id }))
})
</script>

<style scoped>
.sequence-step-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.sequence-step-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
