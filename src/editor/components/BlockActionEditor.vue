<template>
  <div class="prop-group-label">{{ t('blockProps.groupAction') }}</div>
  <q-btn-toggle
    dense
    no-caps
    :model-value="ensureAction().type"
    :options="[
      { label: t('blockProps.actionNone'), value: 'none' },
      { label: t('blockProps.actionEffect'), value: 'effect' },
      { label: t('blockProps.actionNavigateScreen'), value: 'navigateScreen' },
      { label: t('blockProps.actionEvent'), value: 'event' },
      { label: t('blockProps.actionToast'), value: 'toast' },
      { label: t('blockProps.actionOpenSheet'), value: 'openSheet' },
      { label: t('blockProps.actionCloseSheet'), value: 'closeSheet' },
      { label: t('blockProps.actionOpenApp'), value: 'openApp' },
    ]"
    @update:model-value="setActionType"
  />
  <template v-if="target.action.type === 'effect'">
    <p class="tab-help">{{ t('blockProps.actionEffectHelp') }}</p>
    <EffectsBuilder
      :model-value="target.action.effects"
      @update:model-value="(v) => (target.action.effects = v)"
    />
  </template>
  <template v-else-if="target.action.type === 'navigateScreen'">
    <q-select
      dense
      outlined
      emit-value
      map-options
      :label="t('blockProps.actionNavigateScreenLabel')"
      :options="screenOptions"
      v-model="target.action.screenId"
    />
  </template>
  <template v-else-if="target.action.type === 'event'">
    <p class="tab-help">{{ t('blockProps.actionEventHelp') }}</p>
    <q-input
      dense
      outlined
      :label="t('blockProps.actionEventButtonIdLabel')"
      :hint="t('blockProps.actionEventButtonIdHint')"
      v-model="target.action.buttonId"
    />
  </template>
  <template v-else-if="target.action.type === 'toast'">
    <p class="tab-help">{{ t('blockProps.actionToastHelp') }}</p>
    <q-input
      dense
      outlined
      :label="t('blockProps.actionToastTextLabel')"
      v-model="target.action.toastText"
    />
  </template>
  <template v-else-if="target.action.type === 'openSheet'">
    <p class="tab-help">{{ t('blockProps.actionOpenSheetHelp') }}</p>
    <q-select
      dense
      outlined
      emit-value
      map-options
      :label="t('blockProps.actionOpenSheetLabel')"
      :options="sheetOptions"
      v-model="target.action.sheetId"
    />
  </template>
  <p v-else-if="target.action.type === 'closeSheet'" class="tab-help">
    {{ t('blockProps.actionCloseSheetHelp') }}
  </p>
  <template v-else-if="target.action.type === 'openApp'">
    <p class="tab-help">{{ t('blockProps.actionOpenAppHelp') }}</p>
    <q-select
      dense
      outlined
      emit-value
      map-options
      :label="t('blockProps.actionOpenAppLabel')"
      :options="appOptions"
      v-model="target.action.appId"
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
      v-model="target.action.screenId"
    />
  </template>
  <p v-else class="tab-help">{{ helpText }}</p>

  <q-expansion-item
    v-if="target.action.type !== 'none'"
    dense
    :label="t('blockProps.actionGuardTitle')"
    class="spacing-section"
  >
    <div class="spacing-body condition-body">
      <p class="tab-help">{{ t('blockProps.actionGuardHelp') }}</p>
      <RequiresBuilder
        :model-value="target.action.requires"
        @update:model-value="(v) => (target.action.requires = v)"
      />
      <q-input
        dense
        outlined
        :label="t('blockProps.actionOnFailToastLabel')"
        :hint="t('blockProps.actionOnFailToastHint')"
        v-model="target.action.onFailToast"
      />
    </div>
  </q-expansion-item>
</template>

<script setup>
// Extracted from ButtonBlock's own properties form (the original, only
// consumer) so a `lookup` result's own action editor doesn't duplicate this
// ~130-line block wholesale — same fixed action catalog wherever it's
// offered, one implementation. `target` is the actual object being edited
// (a button block, or one `lookup` result) — its `.action` field is read
// and MUTATED DIRECTLY, same "props mutated in place" convention every
// other editor form in this project already uses (BlockPropertiesForm's own
// `block` prop, EntitySchemaForm's `def`, etc.), not a v-model/emit
// indirection layer.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStoryStore } from '@/engine/stores/story'
import EffectsBuilder from '@/editor/components/EffectsBuilder.vue'
import RequiresBuilder from '@/editor/components/RequiresBuilder.vue'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
// Runtime vue-i18n instance (not useEditorI18n's editor-chrome tree) —
// resolves a native app's player-facing `labelKey` for the openApp target
// picker, same precedent as GameForm.vue's own `storyT`/`appLabel`.
const { t: storyT } = useI18n()
const story = useStoryStore()

const props = defineProps({
  target: { type: Object, required: true },
  // Every screen of the app being edited (id + display label) — populates
  // the navigateScreen/openApp screen pickers.
  screens: { type: Array, default: () => [] },
  // Every `sheet` block anywhere in the app (id + display label) —
  // populates the openSheet target picker.
  sheets: { type: Array, default: () => [] },
  // Shown when no action is set — the caller's own "what does this do by
  // default" copy (a button vs. a lookup result reads differently).
  helpText: { type: String, default: '' },
})

function ensureAction() {
  if (!props.target.action) props.target.action = { type: 'none' }
  return props.target.action
}

// Switching kind replaces the action object wholesale (not just its
// `type`) — keeps stale fields from a previous kind (e.g. `effects` while
// now `navigateScreen`) from lingering unused in the saved block.
// `requires`/`onFailToast` are orthogonal to which kind is picked (a guard
// on TOP of whatever the action does), so they're carried over instead of
// wiped on every switch — except for 'none', which drops them: nothing
// decorative has anything for a condition to guard.
function setActionType(type) {
  const prev = props.target.action || {}
  const base =
    type === 'none' ? { type } : { type, requires: prev.requires, onFailToast: prev.onFailToast }
  if (type === 'effect') props.target.action = { ...base, effects: prev.effects || {} }
  else if (type === 'navigateScreen')
    props.target.action = { ...base, screenId: prev.screenId || '' }
  else if (type === 'event') props.target.action = { ...base, buttonId: prev.buttonId || '' }
  else if (type === 'toast') props.target.action = { ...base, toastText: prev.toastText || '' }
  else if (type === 'openSheet') props.target.action = { ...base, sheetId: prev.sheetId || '' }
  else if (type === 'closeSheet') props.target.action = { ...base }
  else if (type === 'openApp')
    props.target.action = { ...base, appId: prev.appId || '', screenId: prev.screenId || '' }
  else props.target.action = { type: 'none' }
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
  const app = story.project?.customApps?.find((a) => a.id === props.target.action?.appId)
  return (app?.screens || []).map((s) => ({ label: s.label || s.id, value: s.id }))
})
</script>
