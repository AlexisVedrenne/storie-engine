<template>
  <div class="event-form">
    <p class="intro">
      {{ t('eventForm.intro') }}
      <FieldHelp :text="t('eventForm.introHelp')" />
    </p>

    <q-input dense outlined ref="titleInputRef" :label="t('eventForm.titleLabel')" v-model="event.title">
      <template #append>
        <EmojiPickerBtn @pick="(e) => (event.title = insertEmojiAtCaret(titleInputRef, event.title, e))" />
      </template>
    </q-input>

    <q-select
      dense
      outlined
      emit-value
      map-options
      :label="t('eventForm.whenLabel')"
      :options="TRIGGER_OPTIONS"
      v-model="event.trigger"
    />

    <div v-if="matchFields.length" class="row">
      <template v-for="field in matchFields" :key="field.key">
        <q-select
          v-if="field.optionsFrom === 'photos'"
          dense
          outlined
          clearable
          use-input
          hide-selected
          fill-input
          input-debounce="0"
          new-value-mode="add-unique"
          emit-value
          map-options
          class="grow"
          :label="matchFieldLabel(event.trigger, field) + t('eventForm.optionalExistingOrFuture')"
          :options="filteredPhotoOptions"
          :model-value="event.match?.[field.key] || null"
          @filter="filterPhotoOptions"
          @update:model-value="(v) => setMatchValue(field.key, v)"
        >
          <template #selected>
            <span v-if="selectedPhotoLabel" class="selected-photo">
              <img :src="resolveAssetUrl(event.match[field.key])" class="photo-thumb" />
              {{ selectedPhotoLabel }}
            </span>
          </template>
          <template #option="scope">
            <q-item v-bind="scope.itemProps">
              <q-item-section avatar>
                <img :src="resolveAssetUrl(scope.opt.value)" class="photo-thumb" />
              </q-item-section>
              <q-item-section>{{ scope.opt.label }}</q-item-section>
            </q-item>
          </template>
          <template #no-option>
            <q-item>
              <q-item-section class="text-grey">{{ t('eventForm.typeFuturePhoto') }}</q-item-section>
            </q-item>
          </template>
        </q-select>
        <q-select
          v-else-if="field.optionsFrom === 'posts'"
          dense
          outlined
          clearable
          use-input
          hide-selected
          fill-input
          input-debounce="0"
          new-value-mode="add-unique"
          emit-value
          map-options
          class="grow"
          :label="matchFieldLabel(event.trigger, field) + t('eventForm.optionalExistingOrFuture')"
          :options="filteredPostOptions"
          :model-value="event.match?.[field.key] || null"
          @filter="filterPostOptions"
          @update:model-value="(v) => setMatchValue(field.key, v)"
        >
          <template #no-option>
            <q-item>
              <q-item-section class="text-grey">{{ t('eventForm.typeFuturePost') }}</q-item-section>
            </q-item>
          </template>
        </q-select>
        <q-select
          v-else-if="optionsFor(field)"
          dense
          outlined
          clearable
          emit-value
          map-options
          class="grow"
          :label="matchFieldLabel(event.trigger, field) + t('eventForm.optionalAny')"
          :options="optionsFor(field)"
          :model-value="event.match?.[field.key] || null"
          @update:model-value="(v) => setMatchValue(field.key, v)"
        />
        <q-input
          v-else-if="field.numeric"
          dense
          outlined
          type="number"
          class="grow"
          :label="matchFieldLabel(event.trigger, field) + t('eventForm.optionalNoMinimum')"
          :model-value="event.match?.[field.key] ?? ''"
          @update:model-value="(v) => setMatchValue(field.key, v === '' ? '' : Number(v))"
        />
        <q-input
          v-else
          dense
          outlined
          class="grow"
          :label="matchFieldLabel(event.trigger, field) + t('eventForm.optionalAny')"
          :model-value="event.match?.[field.key] || ''"
          @update:model-value="(v) => setMatchValue(field.key, v)"
        />
      </template>
    </div>

    <q-tabs
      v-model="activeTab"
      dense
      no-caps
      inline-label
      align="left"
      class="event-tabs"
      active-color="primary"
      indicator-color="primary"
    >
      <q-tab name="then" icon="arrow_forward" :label="t('eventForm.tabThen')" />
      <q-tab name="effects" icon="bolt" :label="t('entries.choice.tabEffects')" />
      <q-tab name="requires" icon="rule" :label="t('entries.choice.tabRequires')" />
    </q-tabs>

    <q-tab-panels v-model="activeTab" animated class="event-panels">
      <q-tab-panel name="then" class="event-panel">
        <p class="tab-help">{{ t('eventForm.tabThenHelp') }}</p>
        <TimelineEditor :entries="ensureThen()" />
      </q-tab-panel>

      <q-tab-panel name="effects" class="event-panel">
        <EffectsBuilder :model-value="event.effects" @update:model-value="(v) => (event.effects = v)" />
      </q-tab-panel>

      <q-tab-panel name="requires" class="event-panel">
        <p class="tab-help">{{ t('eventForm.tabRequiresHelp') }}</p>
        <RequiresBuilder :model-value="event.requires" @update:model-value="(v) => (event.requires = v)" />
      </q-tab-panel>
    </q-tab-panels>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStoryStore } from '@/engine/stores/story'
import { TRIGGERS, triggerDef } from '@/engine/events/triggers'
import { APP_REGISTRY } from '@/engine/apps/registry'
import { collectPhotoOptions } from '@/project/collectPhotoOptions'
import { collectPostOptions } from '@/project/collectPostOptions'
import { resolveAssetUrl } from '@/engine/assets'
import { useContactOptions } from '@/components/shared/useContactOptions'
import RequiresBuilder from '@/editor/components/RequiresBuilder.vue'
import EffectsBuilder from '@/editor/components/EffectsBuilder.vue'
import TimelineEditor from '@/editor/components/TimelineEditor.vue'
import EmojiPickerBtn from '@/components/shared/EmojiPickerBtn.vue'
import { insertEmojiAtCaret } from '@/components/shared/emojiInsert'
import FieldHelp from '@/editor/components/FieldHelp.vue'
import { useEditorI18n } from '@/editor/i18n'
import { triggerLabel, matchFieldLabel } from '@/editor/i18n/sharedOverrides'

const props = defineProps({ event: { type: Object, required: true } })
// Two DIFFERENT i18n systems, deliberately not merged — see EventList.vue's
// identical split and src/editor/i18n/index.js's header comment.
const { t: storyT } = useI18n()
const { t } = useEditorI18n()
const story = useStoryStore()
const { contactOptions } = useContactOptions()
const titleInputRef = ref(null)

// computed, not a plain const — triggerLabel() re-evaluates when the
// editor's own language switches, same reason every other *_OPTIONS list
// converted during the i18n pass is a computed now.
const TRIGGER_OPTIONS = computed(() => TRIGGERS.map((def) => ({ label: triggerLabel(def), value: def.name })))
const activeTab = ref('then')

const matchFields = computed(() => triggerDef(props.event.trigger)?.matchFields || [])

const appOptions = computed(() => APP_REGISTRY.map((app) => ({ label: storyT(app.labelKey), value: app.id })))
const interactionOptions = computed(() =>
  (story.project?.gameConfig?.interactions || []).map((def) => ({ label: def.name || def.id, value: def.id })),
)
// Recomputed from the whole project on every access rather than cached —
// cheap (a handful of chapters/photos) and always reflects the latest
// authored content without a separate invalidation step.
const photoOptions = computed(() =>
  collectPhotoOptions(story.project).map((p) => ({
    label: p.caption || p.url.split('/').pop(),
    value: p.url,
  })),
)
const postOptions = computed(() =>
  collectPostOptions(story.project).map((p) => ({
    label: p.content ? `${p.id} — ${p.content}` : p.id,
    value: p.id,
  })),
)

// Combobox filter handlers (use-input + new-value-mode="add-unique") —
// same pattern as FlagNameField.vue's own combobox: lists known
// photos/posts, but typing a value not in the list still works (for
// content the author plans to add later, already knowing its path/id).
const filteredPhotoOptions = ref(photoOptions.value)
function filterPhotoOptions(val, update) {
  update(() => {
    if (!val) {
      filteredPhotoOptions.value = photoOptions.value
      return
    }
    const needle = val.toLowerCase()
    filteredPhotoOptions.value = photoOptions.value.filter((o) => o.label.toLowerCase().includes(needle))
  })
}
const filteredPostOptions = ref(postOptions.value)
function filterPostOptions(val, update) {
  update(() => {
    if (!val) {
      filteredPostOptions.value = postOptions.value
      return
    }
    const needle = val.toLowerCase()
    filteredPostOptions.value = postOptions.value.filter((o) => o.label.toLowerCase().includes(needle))
  })
}

function optionsFor(field) {
  if (field.optionsFrom === 'apps') return appOptions.value
  if (field.optionsFrom === 'contacts') return contactOptions.value
  if (field.optionsFrom === 'interactions') return interactionOptions.value
  return null
}

const selectedPhotoLabel = computed(() => {
  const field = matchFields.value.find((f) => f.optionsFrom === 'photos')
  const url = field ? props.event.match?.[field.key] : null
  if (!url) return ''
  return photoOptions.value.find((o) => o.value === url)?.label || url
})

function setMatchValue(key, value) {
  if (value === '' || value === null || value === undefined) {
    if (props.event.match) delete props.event.match[key]
    if (props.event.match && !Object.keys(props.event.match).length) props.event.match = undefined
    return
  }
  if (!props.event.match) props.event.match = {}
  props.event.match[key] = value
}

function ensureThen() {
  if (!props.event.then) props.event.then = []
  return props.event.then
}
</script>

<style scoped>
.event-form {
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

.row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.grow {
  flex: 1;
  min-width: 200px;
}

.photo-thumb {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  object-fit: cover;
  margin-right: var(--space-2);
}

.selected-photo {
  display: inline-flex;
  align-items: center;
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
</style>
