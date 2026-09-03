<template>
  <div class="effects-builder">
    <p class="intro">{{ t('effectsBuilder.intro') }}</p>

    <div class="section-title">
      {{ t('requiresBuilder.flagsTitle') }}
      <FieldHelp :text="t('effectsBuilder.flagsHelp')" />
    </div>
    <div v-if="!flagRows.length" class="empty-hint">{{ t('effectsBuilder.noFlagChange') }}</div>
    <div v-for="(row, i) in flagRows" :key="i" class="row-card">
      <q-btn dense flat round icon="close" size="sm" class="row-remove" @click="removeFlagRow(i)">
        <q-tooltip>{{ t('common.delete') }}</q-tooltip>
      </q-btn>
      <div class="row-fields">
        <FlagNameField v-model="row.key" @update:model-value="sync" />
        <q-select
          dense
          outlined
          class="mode-select"
          :label="t('effectsBuilder.actionLabel')"
          v-model="row.mode"
          :options="FLAG_EFFECT_MODES"
          emit-value
          map-options
          @update:model-value="sync"
        />
        <q-input
          v-if="row.mode === 'delta'"
          dense
          outlined
          type="number"
          class="num-input"
          label="+/-"
          v-model.number="row.delta"
          @update:model-value="sync"
        />
      </div>
    </div>
    <q-btn
      dense
      flat
      no-caps
      icon="add"
      :label="t('effectsBuilder.addFlagChange')"
      class="btn-ghost"
      @click="addFlagRow"
    />

    <div class="section-title top-gap">
      {{ t('effectsBuilder.collectionsTitle') }}
      <FieldHelp :text="t('effectsBuilder.collectionsHelp')" />
    </div>
    <div v-if="!collectionRows.length" class="empty-hint">
      {{ t('effectsBuilder.noCollectionChange') }}
    </div>
    <div v-for="(row, i) in collectionRows" :key="i" class="row-card">
      <q-btn
        dense
        flat
        round
        icon="close"
        size="sm"
        class="row-remove"
        @click="removeCollectionRow(i)"
      >
        <q-tooltip>{{ t('common.delete') }}</q-tooltip>
      </q-btn>
      <div class="row-fields">
        <FlagNameField v-model="row.flagKey" @update:model-value="sync" />
        <q-select
          dense
          outlined
          class="mode-select"
          :label="t('effectsBuilder.actionLabel')"
          v-model="row.mode"
          :options="COLLECTION_MODES"
          emit-value
          map-options
          @update:model-value="sync"
        />
        <q-input
          dense
          outlined
          class="key-input"
          :label="t('effectsBuilder.itemKeyLabel')"
          :hint="
            row.mode === 'add'
              ? t('effectsBuilder.itemKeyAutoHint')
              : row.mode === 'increment'
                ? t('effectsBuilder.itemKeyRequiredHint')
                : ''
          "
          v-model="row.itemKey"
          @update:model-value="sync"
        />
        <template v-if="row.mode === 'add'">
          <q-select
            dense
            outlined
            class="mode-select"
            v-model="row.valueType"
            :options="VALUE_TYPES"
            emit-value
            map-options
            @update:model-value="sync"
          />
          <q-input
            v-if="row.valueType === 'number'"
            dense
            outlined
            type="number"
            class="num-input"
            :label="t('effectsBuilder.valueLabel')"
            v-model.number="row.value"
            @update:model-value="sync"
          />
          <q-input
            v-else
            dense
            outlined
            class="key-input"
            :label="t('effectsBuilder.valueLabel')"
            v-model="row.value"
            @update:model-value="sync"
          />
        </template>
        <q-input
          v-else-if="row.mode === 'increment'"
          dense
          outlined
          type="number"
          class="num-input"
          :label="t('effectsBuilder.deltaLabel')"
          v-model.number="row.value"
          @update:model-value="sync"
        />
      </div>
    </div>
    <q-btn
      dense
      flat
      no-caps
      icon="add"
      :label="t('effectsBuilder.addCollectionChange')"
      class="btn-ghost"
      @click="addCollectionRow"
    />

    <div class="section-title top-gap">
      {{ t('effectsBuilder.entitiesTitle') }}
      <FieldHelp :text="t('effectsBuilder.entitiesHelp')" />
    </div>
    <div v-if="!entityRows.length" class="empty-hint">
      {{ t('effectsBuilder.noEntityChange') }}
    </div>
    <div v-for="(row, i) in entityRows" :key="i" class="row-card">
      <q-btn dense flat round icon="close" size="sm" class="row-remove" @click="removeEntityRow(i)">
        <q-tooltip>{{ t('common.delete') }}</q-tooltip>
      </q-btn>
      <div class="row-fields">
        <q-select
          dense
          outlined
          class="mode-select"
          :label="t('effectsBuilder.schemaLabel')"
          v-model="row.schemaId"
          :options="schemaOptions"
          emit-value
          map-options
          @update:model-value="sync"
        />
        <q-select
          dense
          outlined
          class="mode-select"
          :label="t('effectsBuilder.actionLabel')"
          v-model="row.mode"
          :options="ENTITY_MODES"
          emit-value
          map-options
          @update:model-value="sync"
        />
        <q-input
          dense
          outlined
          class="key-input"
          :label="t('effectsBuilder.entityIdLabel')"
          :hint="
            row.mode === 'set' || row.mode === 'collectionAdd'
              ? t('effectsBuilder.entityIdAutoHint')
              : ''
          "
          v-model="row.entityId"
          @update:model-value="sync"
        />
        <template v-if="row.mode.startsWith('collection')">
          <q-select
            dense
            outlined
            class="mode-select"
            :label="t('effectsBuilder.collectionFieldLabel')"
            v-model="row.fieldKey"
            :options="collectionFieldOptions(row.schemaId)"
            emit-value
            map-options
            @update:model-value="sync"
          />
          <q-input
            dense
            outlined
            class="key-input"
            :label="t('effectsBuilder.itemKeyLabel')"
            :hint="
              row.mode === 'collectionAdd'
                ? t('effectsBuilder.itemKeyAutoHint')
                : row.mode === 'collectionIncrement'
                  ? t('effectsBuilder.itemKeyRequiredHint')
                  : ''
            "
            v-model="row.itemKey"
            @update:model-value="sync"
          />
          <template v-if="row.mode === 'collectionAdd'">
            <q-select
              dense
              outlined
              class="mode-select"
              v-model="row.valueType"
              :options="VALUE_TYPES"
              emit-value
              map-options
              @update:model-value="sync"
            />
            <q-input
              v-if="row.valueType === 'number'"
              dense
              outlined
              type="number"
              class="num-input"
              :label="t('effectsBuilder.valueLabel')"
              v-model.number="row.value"
              @update:model-value="sync"
            />
            <q-input
              v-else
              dense
              outlined
              class="key-input"
              :label="t('effectsBuilder.valueLabel')"
              v-model="row.value"
              @update:model-value="sync"
            />
          </template>
          <q-input
            v-else-if="row.mode === 'collectionIncrement'"
            dense
            outlined
            type="number"
            class="num-input"
            :label="t('effectsBuilder.deltaLabel')"
            v-model.number="row.value"
            @update:model-value="sync"
          />
        </template>
      </div>
      <div v-if="row.mode === 'set' && schemaFields(row.schemaId).length" class="entity-fields">
        <EntityFieldInput
          v-for="field in schemaFields(row.schemaId)"
          :key="field.key"
          :field="field"
          :model-value="row.fields[field.key]"
          @update:model-value="
            (v) => {
              row.fields[field.key] = v
              sync()
            }
          "
        />
      </div>
    </div>
    <q-btn
      dense
      flat
      no-caps
      icon="add"
      :label="t('effectsBuilder.addEntityChange')"
      class="btn-ghost"
      @click="addEntityRow"
    />

    <div class="section-title top-gap">{{ t('effectsBuilder.widgetsTitle') }}</div>

    <q-expansion-item
      dense-toggle
      :label="t('effectsBuilder.weatherLabel')"
      :caption="t('effectsBuilder.weatherCaption')"
      v-model="sections.weather"
      @update:model-value="sync"
    >
      <div class="grid">
        <q-input
          dense
          outlined
          :label="t('effectsBuilder.cityLabel')"
          v-model="weather.city"
          @update:model-value="sync"
        />
        <q-input
          dense
          outlined
          type="number"
          :label="t('effectsBuilder.tempLabel')"
          v-model.number="weather.temp"
          @update:model-value="sync"
        />
        <q-input
          dense
          outlined
          :label="t('effectsBuilder.conditionLabel')"
          v-model="weather.condition"
          @update:model-value="sync"
        />
        <q-input
          dense
          outlined
          :label="t('effectsBuilder.iconLabel')"
          v-model="weather.icon"
          @update:model-value="sync"
        />
        <q-input
          dense
          outlined
          :label="t('effectsBuilder.captionLabel')"
          v-model="weather.caption"
          @update:model-value="sync"
        />
      </div>
    </q-expansion-item>

    <q-expansion-item
      dense-toggle
      :label="t('effectsBuilder.stepsLabel')"
      :caption="t('effectsBuilder.stepsCaption')"
      v-model="sections.steps"
      @update:model-value="sync"
    >
      <div class="grid">
        <q-input
          dense
          outlined
          type="number"
          :label="t('effectsBuilder.currentStepsLabel')"
          v-model.number="steps.value"
          @update:model-value="sync"
        />
        <q-input
          dense
          outlined
          type="number"
          :label="t('effectsBuilder.goalLabel')"
          v-model.number="steps.goal"
          @update:model-value="sync"
        />
      </div>
    </q-expansion-item>

    <q-expansion-item
      dense-toggle
      :label="t('effectsBuilder.batteryLabel')"
      :caption="t('effectsBuilder.batteryCaption')"
      v-model="sections.battery"
      @update:model-value="sync"
    >
      <q-input
        dense
        outlined
        type="number"
        :label="t('effectsBuilder.batteryPercentLabel')"
        v-model.number="battery.value"
        @update:model-value="sync"
      />
    </q-expansion-item>

    <q-expansion-item
      dense-toggle
      :label="t('effectsBuilder.networkLabel')"
      :caption="t('effectsBuilder.networkCaption')"
      v-model="sections.network"
      @update:model-value="sync"
    >
      <div class="grid">
        <q-input
          dense
          outlined
          type="number"
          :label="t('effectsBuilder.signalLabel')"
          v-model.number="network.signal"
          @update:model-value="sync"
        />
        <q-toggle v-model="network.wifi" label="Wi-Fi" @update:model-value="sync" />
      </div>
    </q-expansion-item>

    <q-expansion-item
      dense-toggle
      :label="t('effectsBuilder.clockLabel')"
      :caption="t('effectsBuilder.clockCaption')"
      v-model="sections.clock"
      @update:model-value="sync"
    >
      <q-select
        dense
        outlined
        :options="CLOCK_MODES"
        v-model="clock.mode"
        emit-value
        map-options
        @update:model-value="sync"
      />
      <q-input
        v-if="clock.mode === 'set'"
        dense
        outlined
        label="HH:MM"
        v-model="clock.value"
        @update:model-value="sync"
      />
    </q-expansion-item>

    <q-expansion-item
      dense-toggle
      :label="t('effectsBuilder.dateLabel')"
      :caption="t('effectsBuilder.dateCaption')"
      v-model="sections.date"
      @update:model-value="sync"
    >
      <q-select
        dense
        outlined
        :options="CLOCK_MODES"
        v-model="date.mode"
        emit-value
        map-options
        @update:model-value="sync"
      />
      <q-input
        v-if="date.mode === 'set'"
        dense
        outlined
        label="JJ/MM/AAAA"
        v-model="date.value"
        @update:model-value="sync"
      />
    </q-expansion-item>

    <div class="section-title top-gap">
      {{ t('effectsBuilder.socialTitle') }}
      <FieldHelp :text="t('effectsBuilder.socialHelp')" />
    </div>
    <div v-if="!socialRows.length" class="empty-hint">{{ t('effectsBuilder.noSocialChange') }}</div>
    <div v-for="(row, i) in socialRows" :key="i" class="row-card">
      <q-btn dense flat round icon="close" size="sm" class="row-remove" @click="removeSocialRow(i)">
        <q-tooltip>{{ t('common.delete') }}</q-tooltip>
      </q-btn>
      <div class="row-fields">
        <q-select
          dense
          outlined
          class="key-input"
          v-model="row.contactId"
          :options="contactOptions"
          emit-value
          map-options
          :label="t('entries.story.characterLabel')"
          @update:model-value="sync"
        >
          <template #selected>
            <span class="selected-row">
              <span class="option-dot" :style="{ background: contactColor(row.contactId) }" />
              {{ contactLabel(row.contactId) }}
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
        <q-input
          dense
          outlined
          type="number"
          class="num-input"
          :label="t('effectsBuilder.followersLabel')"
          v-model.number="row.followers"
          @update:model-value="sync"
        />
        <q-input
          dense
          outlined
          type="number"
          class="num-input"
          :label="t('effectsBuilder.followingLabel')"
          v-model.number="row.following"
          @update:model-value="sync"
        />
      </div>
    </div>
    <q-btn
      dense
      flat
      no-caps
      icon="add"
      :label="t('common.add')"
      class="btn-ghost"
      @click="addSocialRow"
    />

    <div class="section-title top-gap">
      {{ t('effectsBuilder.newFollowersTitle') }}
      <FieldHelp :text="t('effectsBuilder.newFollowersHelp')" />
    </div>
    <q-select
      dense
      outlined
      multiple
      emit-value
      map-options
      :placeholder="t('effectsBuilder.noneOption')"
      :options="contactOptions"
      v-model="newFollowerIds"
      @update:model-value="sync"
    >
      <template #selected-item="scope">
        <q-chip dense removable @remove="scope.removeAtIndex(scope.index)">
          <span class="chip-dot" :style="{ background: contactColor(scope.opt.value) }" />
          {{ scope.opt.label }}
        </q-chip>
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
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import { useContactOptions } from '@/components/shared/useContactOptions'
import FieldHelp from '@/editor/components/FieldHelp.vue'
import FlagNameField from '@/editor/components/FlagNameField.vue'
import EntityFieldInput from '@/editor/components/EntityFieldInput.vue'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
const story = useStoryStore()

// `effects: { flags?, weather?, steps?, stepsGoal?, battery?, network?,
// clock?, date?, social?, newFollower? }` — see NTR docs/story-engine.md
// section 6. Same "rebuild whole object on every change" approach as
// RequiresBuilder.vue, no reactive round-trip watcher.
const props = defineProps({ modelValue: { type: Object, default: null } })
const emit = defineEmits(['update:modelValue'])
// computed, not plain consts — see RequiresBuilder.vue's FLAG_MODES comment.
const FLAG_EFFECT_MODES = computed(() => [
  { label: t('effectsBuilder.modeDelta'), value: 'delta' },
  { label: t('effectsBuilder.modeTrue'), value: 'true' },
  { label: t('effectsBuilder.modeFalse'), value: 'false' },
])
const CLOCK_MODES = computed(() => [
  { label: t('effectsBuilder.clockUnset'), value: 'unset' },
  { label: t('effectsBuilder.clockSet'), value: 'set' },
  { label: t('effectsBuilder.clockClear'), value: 'clear' },
])
const COLLECTION_MODES = computed(() => [
  { label: t('effectsBuilder.modeAdd'), value: 'add' },
  { label: t('effectsBuilder.modeRemove'), value: 'remove' },
  { label: t('effectsBuilder.modeIncrement'), value: 'increment' },
])
const VALUE_TYPES = computed(() => [
  { label: t('effectsBuilder.valueTypeText'), value: 'text' },
  { label: t('effectsBuilder.valueTypeNumber'), value: 'number' },
])
const ENTITY_MODES = computed(() => [
  { label: t('effectsBuilder.modeSet'), value: 'set' },
  { label: t('effectsBuilder.modeRemoveEntity'), value: 'remove' },
  { label: t('effectsBuilder.modeCollectionAdd'), value: 'collectionAdd' },
  { label: t('effectsBuilder.modeCollectionRemove'), value: 'collectionRemove' },
  { label: t('effectsBuilder.modeCollectionIncrement'), value: 'collectionIncrement' },
])
// `collection`-typed schema fields only (user request) — same
// filter-by-field-type precedent as BlockPropertiesForm.vue's own
// scheduleFieldOptions, just a different target type.
function collectionFieldOptions(schemaId) {
  return schemaFields(schemaId)
    .filter((f) => f.type === 'collection')
    .map((f) => ({ label: f.label || f.key, value: f.key }))
}
const schemaOptions = computed(
  () =>
    story.project?.gameConfig?.entitySchemas?.map((s) => ({
      label: s.label || s.id,
      value: s.id,
    })) || [],
)
function schemaFields(schemaId) {
  return story.project?.gameConfig?.entitySchemas?.find((s) => s.id === schemaId)?.fields || []
}

const { contactOptions, contactColor, contactLabel } = useContactOptions()
const initial = props.modelValue || {}

const flagRows = reactive(
  Object.entries(initial.flags || {}).map(([key, v]) =>
    reactive(
      typeof v === 'boolean'
        ? { key, mode: v ? 'true' : 'false', delta: 0 }
        : { key, mode: 'delta', delta: v },
    ),
  ),
)

// `effects.collections` is a LIST of ops (see story.js's applyEffects), not
// an object keyed by flag — a single effect can touch the same collection
// more than once (two separate ledger entries in one `effect` block).
const collectionRows = reactive(
  (initial.collections || []).map((op) =>
    reactive({
      flagKey: op.flagKey || '',
      mode: op.mode || 'add',
      itemKey: op.itemKey || '',
      valueType: typeof op.value === 'number' ? 'number' : 'text',
      value: op.value ?? '',
    }),
  ),
)

// `effects.entities` is a LIST of ops too (see story.js's applyEffects),
// same "one effect can touch more than one entity" reasoning as collections.
const entityRows = reactive(
  (initial.entities || []).map((op) =>
    reactive({
      schemaId: op.schemaId || '',
      mode: op.mode || 'set',
      entityId: op.entityId || '',
      fields: reactive({ ...op.fields }),
      // Only meaningful for the 3 `collection*` modes (a collection-typed
      // field's own push/remove/increment ops — user request) — same shape
      // as `collectionRows` above, just entity-field-scoped instead of
      // global-flag-scoped.
      fieldKey: op.fieldKey || '',
      itemKey: op.itemKey || '',
      valueType: typeof op.value === 'number' ? 'number' : 'text',
      value: op.value ?? '',
    }),
  ),
)

const sections = reactive({
  weather: Boolean(initial.weather),
  steps: initial.steps !== undefined || initial.stepsGoal !== undefined,
  battery: initial.battery !== undefined,
  network: Boolean(initial.network),
  clock: 'clock' in initial,
  date: 'date' in initial,
})

const weather = reactive({ ...initial.weather })
const steps = reactive({ value: initial.steps, goal: initial.stepsGoal })
const battery = reactive({ value: initial.battery })
const network = reactive({ signal: initial.network?.signal, wifi: initial.network?.wifi ?? true })
const clock = reactive({
  mode: initial.clock === null ? 'clear' : initial.clock ? 'set' : 'unset',
  value: initial.clock || '',
})
const date = reactive({
  mode: initial.date === null ? 'clear' : initial.date ? 'set' : 'unset',
  value: initial.date || '',
})

const socialRows = reactive(
  Object.entries(initial.social || {}).map(([contactId, d]) =>
    reactive({ contactId, followers: d.followers, following: d.following }),
  ),
)
const newFollowerIds = ref(
  Array.isArray(initial.newFollower)
    ? [...initial.newFollower]
    : initial.newFollower
      ? [initial.newFollower]
      : [],
)

function addFlagRow() {
  flagRows.push(reactive({ key: '', mode: 'delta', delta: 1 }))
}
function removeFlagRow(i) {
  flagRows.splice(i, 1)
  sync()
}
function addCollectionRow() {
  collectionRows.push(
    reactive({ flagKey: '', mode: 'add', itemKey: '', valueType: 'text', value: '' }),
  )
}
function removeCollectionRow(i) {
  collectionRows.splice(i, 1)
  sync()
}
function addEntityRow() {
  entityRows.push(
    reactive({
      schemaId: schemaOptions.value[0]?.value || '',
      mode: 'set',
      entityId: '',
      fields: reactive({}),
      fieldKey: '',
      itemKey: '',
      valueType: 'text',
      value: '',
    }),
  )
}
function removeEntityRow(i) {
  entityRows.splice(i, 1)
  sync()
}
function addSocialRow() {
  socialRows.push(
    reactive({ contactId: contactOptions.value[0]?.value || '', followers: 0, following: 0 }),
  )
}
function removeSocialRow(i) {
  socialRows.splice(i, 1)
  sync()
}

function sync() {
  const effects = {}

  const flags = {}
  for (const row of flagRows) {
    if (!row.key) continue
    if (row.mode === 'true') flags[row.key] = true
    else if (row.mode === 'false') flags[row.key] = false
    else flags[row.key] = row.delta
  }
  if (Object.keys(flags).length) effects.flags = flags

  const collections = []
  for (const row of collectionRows) {
    if (!row.flagKey) continue
    if (row.mode === 'remove') {
      if (!row.itemKey) continue // nothing to target without a key
      collections.push({ flagKey: row.flagKey, mode: 'remove', itemKey: row.itemKey })
    } else if (row.mode === 'increment') {
      if (!row.itemKey) continue // no auto-generated key makes sense for "increment THIS counter"
      collections.push({
        flagKey: row.flagKey,
        mode: 'increment',
        itemKey: row.itemKey,
        value: Number(row.value) || 0,
      })
    } else {
      collections.push({
        flagKey: row.flagKey,
        mode: 'add',
        itemKey: row.itemKey || undefined,
        value: row.valueType === 'number' ? Number(row.value) || 0 : row.value,
      })
    }
  }
  if (collections.length) effects.collections = collections

  const entities = []
  for (const row of entityRows) {
    if (!row.schemaId) continue
    if (row.mode === 'remove') {
      if (!row.entityId) continue // nothing to target without an id
      entities.push({ schemaId: row.schemaId, mode: 'remove', entityId: row.entityId })
    } else if (row.mode === 'collectionRemove') {
      if (!row.entityId || !row.fieldKey || !row.itemKey) continue // nothing to target
      entities.push({
        schemaId: row.schemaId,
        mode: 'collectionRemove',
        entityId: row.entityId,
        fieldKey: row.fieldKey,
        itemKey: row.itemKey,
      })
    } else if (row.mode === 'collectionIncrement') {
      if (!row.entityId || !row.fieldKey || !row.itemKey) continue // no auto-generated key makes sense for "increment THIS counter"
      entities.push({
        schemaId: row.schemaId,
        mode: 'collectionIncrement',
        entityId: row.entityId,
        fieldKey: row.fieldKey,
        itemKey: row.itemKey,
        value: Number(row.value) || 0,
      })
    } else if (row.mode === 'collectionAdd') {
      if (!row.fieldKey) continue
      entities.push({
        schemaId: row.schemaId,
        mode: 'collectionAdd',
        entityId: row.entityId || undefined,
        fieldKey: row.fieldKey,
        itemKey: row.itemKey || undefined,
        value: row.valueType === 'number' ? Number(row.value) || 0 : row.value,
      })
    } else {
      const fields = {}
      for (const field of schemaFields(row.schemaId)) {
        const v = row.fields[field.key]
        if (v === undefined || v === '') continue
        fields[field.key] = field.type === 'number' ? Number(v) || 0 : v
      }
      entities.push({
        schemaId: row.schemaId,
        mode: 'set',
        entityId: row.entityId || undefined,
        fields,
      })
    }
  }
  if (entities.length) effects.entities = entities

  if (sections.weather) {
    const w = {}
    for (const k of ['city', 'temp', 'condition', 'icon', 'caption']) {
      if (weather[k] !== undefined && weather[k] !== '') w[k] = weather[k]
    }
    if (Object.keys(w).length) effects.weather = w
  }
  if (sections.steps) {
    if (steps.value !== undefined && steps.value !== null) effects.steps = steps.value
    if (steps.goal !== undefined && steps.goal !== null) effects.stepsGoal = steps.goal
  }
  if (sections.battery && battery.value !== undefined && battery.value !== null) {
    effects.battery = battery.value
  }
  if (sections.network) {
    const n = {}
    if (network.signal !== undefined && network.signal !== null) n.signal = network.signal
    if (network.wifi !== undefined) n.wifi = network.wifi
    if (Object.keys(n).length) effects.network = n
  }
  if (sections.clock) {
    effects.clock = clock.mode === 'clear' ? null : clock.mode === 'set' ? clock.value : undefined
    if (effects.clock === undefined) delete effects.clock
  }
  if (sections.date) {
    effects.date = date.mode === 'clear' ? null : date.mode === 'set' ? date.value : undefined
    if (effects.date === undefined) delete effects.date
  }

  const social = {}
  for (const row of socialRows) {
    if (!row.contactId) continue
    const d = {}
    if (row.followers) d.followers = row.followers
    if (row.following) d.following = row.following
    if (Object.keys(d).length) social[row.contactId] = d
  }
  if (Object.keys(social).length) effects.social = social

  if (newFollowerIds.value.length === 1) effects.newFollower = newFollowerIds.value[0]
  else if (newFollowerIds.value.length > 1) effects.newFollower = [...newFollowerIds.value]

  emit('update:modelValue', Object.keys(effects).length ? effects : undefined)
}
</script>

<style scoped>
.effects-builder {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.intro {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  margin: 0;
  line-height: 1.5;
}

.section-title {
  display: flex;
  align-items: center;
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  margin-top: var(--space-2);
}

.section-title.top-gap {
  margin-top: var(--space-4);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}

.empty-hint {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  font-style: italic;
}

.row-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: var(--space-2);
  padding: var(--space-3);
  padding-right: var(--space-6);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.row-fields {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

/* Grid, not flex-wrap, for the schema's OWN dynamic field list — an
   unknown number of fields of unknown width needs would otherwise fight
   each other for space in a wrapping flex row (a text field stuck at the
   same cramped width as a number field next to it). `auto-fill` gives
   each field a fair floor width; a `text` field opts into spanning the
   full row via `.entity-field--wide` (see EntityFieldInput.vue). */
.entity-fields {
  flex-basis: 100%;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--space-3);
  margin-top: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px dashed var(--color-border);
}

.row-remove {
  position: absolute;
  top: var(--space-1);
  right: var(--space-1);
}

.key-input {
  flex: 1 1 160px;
  min-width: 140px;
}

.selected-row {
  display: inline-flex;
  align-items: center;
}

.option-dot,
.chip-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-right: var(--space-1);
}

.mode-select {
  flex: 0 0 170px;
}

.num-input {
  flex: 0 0 100px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
  padding: var(--space-2) var(--space-1);
}
</style>
