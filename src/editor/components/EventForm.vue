<template>
  <div class="event-form">
    <p class="intro">
      Réagit à une action du joueur (pas à la timeline d'un chapitre) — ouvrir une app, liker un
      post... Réutilise les mêmes conditions/effets que partout ailleurs.
      <FieldHelp text="Voir docs/roadmap-modular-apps-events.md — un event n'est pas un deuxième système narratif : ses conséquences (onglet 'Ensuite') sont jouées par le même moteur que la timeline d'un chapitre." />
    </p>

    <q-input dense outlined ref="titleInputRef" label="Titre (optionnel — pour s'y retrouver dans la liste)" v-model="event.title">
      <template #append>
        <EmojiPickerBtn @pick="(e) => (event.title = insertEmojiAtCaret(titleInputRef, event.title, e))" />
      </template>
    </q-input>

    <q-select
      dense
      outlined
      emit-value
      map-options
      label="Quand"
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
          :label="field.label + ' (optionnel — existante ou à venir)'"
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
              <q-item-section class="text-grey">Tape le chemin d'une photo à venir (ex: images/erwan/plage.jpg)</q-item-section>
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
          :label="field.label + ' (optionnel — existante ou à venir)'"
          :options="filteredPostOptions"
          :model-value="event.match?.[field.key] || null"
          @filter="filterPostOptions"
          @update:model-value="(v) => setMatchValue(field.key, v)"
        >
          <template #no-option>
            <q-item>
              <q-item-section class="text-grey">Tape l'id d'une publication à venir (défini dans son propre champ Id)</q-item-section>
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
          :label="field.label + ' (optionnel — vide = n’importe lequel)'"
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
          :label="field.label + ' (optionnel — vide = aucun minimum)'"
          :model-value="event.match?.[field.key] ?? ''"
          @update:model-value="(v) => setMatchValue(field.key, v === '' ? '' : Number(v))"
        />
        <q-input
          v-else
          dense
          outlined
          class="grow"
          :label="field.label + ' (optionnel — vide = n’importe lequel)'"
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
      <q-tab name="then" icon="arrow_forward" label="Ensuite" />
      <q-tab name="effects" icon="bolt" label="Conséquences" />
      <q-tab name="requires" icon="rule" label="Condition" />
    </q-tabs>

    <q-tab-panels v-model="activeTab" animated class="event-panels">
      <q-tab-panel name="then" class="event-panel">
        <p class="tab-help">
          Ce qui se joue quand cet event se déclenche — mêmes types d'entrée que dans une timeline
          de chapitre.
        </p>
        <TimelineEditor :entries="ensureThen()" />
      </q-tab-panel>

      <q-tab-panel name="effects" class="event-panel">
        <EffectsBuilder :model-value="event.effects" @update:model-value="(v) => (event.effects = v)" />
      </q-tab-panel>

      <q-tab-panel name="requires" class="event-panel">
        <p class="tab-help">
          Ne se déclenche que si ces conditions sont vraies au moment de l'action du joueur.
        </p>
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
import { useContactOptions } from '@/editor/composables/useContactOptions'
import RequiresBuilder from '@/editor/components/RequiresBuilder.vue'
import EffectsBuilder from '@/editor/components/EffectsBuilder.vue'
import TimelineEditor from '@/editor/components/TimelineEditor.vue'
import EmojiPickerBtn from '@/editor/components/EmojiPickerBtn.vue'
import { insertEmojiAtCaret } from '@/editor/utils/emojiInsert'
import FieldHelp from '@/editor/components/FieldHelp.vue'

const props = defineProps({ event: { type: Object, required: true } })
const { t } = useI18n()
const story = useStoryStore()
const { contactOptions } = useContactOptions()
const titleInputRef = ref(null)

const TRIGGER_OPTIONS = TRIGGERS.map((def) => ({ label: def.label, value: def.name }))
const activeTab = ref('then')

const matchFields = computed(() => triggerDef(props.event.trigger)?.matchFields || [])

const appOptions = computed(() => APP_REGISTRY.map((app) => ({ label: t(app.labelKey), value: app.id })))
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
