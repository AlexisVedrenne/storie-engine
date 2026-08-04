<template>
  <div class="entry-form">
    <p class="intro">{{ t('entries.timeskip.intro') }}</p>
    <div class="row">
      <q-input
        dense
        outlined
        :label="t('entries.timeskip.clockLabel')"
        placeholder="08:00"
        v-model="entry.clock"
      />
      <q-input
        dense
        outlined
        :label="t('entries.timeskip.dateLabel')"
        placeholder="19/07/2026"
        v-model="entry.date"
      />
    </div>
    <q-input
      dense
      outlined
      ref="labelInputRef"
      :label="t('entries.timeskip.labelLabel')"
      :placeholder="t('entries.timeskip.labelPlaceholder')"
      :hint="t('entries.timeskip.labelHelp')"
      v-model="entry.label"
    >
      <template #append>
        <EmojiPickerBtn
          @pick="(e) => (entry.label = insertEmojiAtCaret(labelInputRef, entry.label, e))"
        />
      </template>
    </q-input>
    <div class="toggle-row">
      <q-toggle
        :model-value="entry.blocking !== false"
        :disable="!!entry.landApp"
        :label="t('entries.timeskip.blockingLabel')"
        @update:model-value="(v) => (entry.blocking = v ? undefined : false)"
      />
      <FieldHelp
        :text="
          entry.landApp
            ? t('entries.timeskip.blockingLandAppHelp')
            : t('entries.timeskip.blockingHelp')
        "
      />
    </div>

    <q-select
      dense
      outlined
      emit-value
      map-options
      clearable
      :label="t('entries.timeskip.landAppLabel')"
      :hint="t('entries.timeskip.landAppHelp')"
      :options="appOptions"
      :model-value="entry.landApp || null"
      @update:model-value="setLandApp"
    />

    <template v-if="landThreadOptions">
      <q-select
        dense
        outlined
        emit-value
        map-options
        clearable
        :label="t('entries.timeskip.landThreadLabel')"
        :hint="t('entries.timeskip.landThreadHelp')"
        :options="landThreadOptions"
        v-model="entry.landThread"
      />
    </template>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import FieldHelp from '@/editor/components/FieldHelp.vue'
import EmojiPickerBtn from '@/components/shared/EmojiPickerBtn.vue'
import { insertEmojiAtCaret } from '@/components/shared/emojiInsert'
import { useStoryStore } from '@/engine/stores/story'
import { useContactOptions } from '@/components/shared/useContactOptions'
import { appHasBlockType } from '@/engine/customApps/appHasModule'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
const { t: storyT } = useI18n()
const story = useStoryStore()
const { threadOptions, contactOptionsNoMe } = useContactOptions()
const props = defineProps({ entry: { type: Object, required: true } })
const labelInputRef = ref(null)

// Every app (built-in + this project's own custom ones), same catalog/order
// GameForm.vue's own Applications panel lists — "land directly on an app"
// makes sense for any of them, not just custom ones.
function appLabel(app) {
  return app.labelKey ? storyT(app.labelKey) : app.label
}
const appOptions = computed(() =>
  story.orderedApps.map((app) => ({ label: appLabel(app), value: app.id })),
)

function setLandApp(v) {
  props.entry.landApp = v || undefined
  // Picking a different app (or clearing it) invalidates whatever thread
  // was chosen for the PREVIOUS app — never carry it over silently.
  props.entry.landThread = undefined
}

// Which thread options (if any) make sense for the currently chosen
// landApp — null hides the picker entirely. Native SMS ('messages') is
// 1:1-only (no group threads), same restriction MessageEntryForm's own
// contact picker already has, so it gets contactOptionsNoMe rather than the
// full threadOptions. Native Pixly DM ('social') and a custom app's own
// `conversations` block both support groups — same threadOptions
// useContactOptions() already gives DmEntryForm/ChoiceEntryForm/
// ConversationsBlock. A custom app only qualifies if it actually places a
// `conversations` block (appHasBlockType — same check TimelineEditor.vue/
// ChoiceEntryForm.vue use to hide THEIR own app-scoped options elsewhere);
// every other app (Journal, Gallery, Calls, Settings...) has no thread
// concept at all, so this is null for them.
const landThreadOptions = computed(() => {
  if (!props.entry.landApp) return null
  if (props.entry.landApp === 'messages') return contactOptionsNoMe.value
  if (props.entry.landApp === 'social') return threadOptions.value
  const app = story.project?.customApps?.find((a) => a.id === props.entry.landApp)
  return appHasBlockType(app, 'conversations') ? threadOptions.value : null
})
</script>

<style scoped>
.entry-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.intro {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.row {
  display: flex;
  gap: var(--space-3);
}

.toggle-row {
  display: flex;
  align-items: center;
}
</style>
