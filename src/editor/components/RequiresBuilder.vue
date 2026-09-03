<template>
  <div class="requires-builder">
    <q-btn
      v-if="!revealed"
      dense
      flat
      no-caps
      icon="add"
      :label="t('requiresBuilder.addCondition')"
      class="btn-ghost"
      @click="revealed = true"
    />

    <template v-else>
      <p class="intro">{{ t('requiresBuilder.intro') }}</p>

      <div class="section-title">
        {{ t('requiresBuilder.flagsTitle') }}
        <FieldHelp :text="t('requiresBuilder.flagsHelp')" />
      </div>
      <div v-if="!flagRows.length" class="empty-hint">
        {{ t('requiresBuilder.noFlagCondition') }}
      </div>
      <div v-for="(row, i) in flagRows" :key="i" class="row-card">
        <q-btn dense flat round icon="close" size="sm" class="row-remove" @click="removeFlagRow(i)">
          <q-tooltip>{{ t('requiresBuilder.removeCondition') }}</q-tooltip>
        </q-btn>
        <div class="row-fields">
          <FlagNameField v-model="row.key" @update:model-value="sync" />
          <q-select
            dense
            outlined
            class="mode-select"
            :label="t('requiresBuilder.conditionLabel')"
            v-model="row.mode"
            :options="FLAG_MODES"
            emit-value
            map-options
            @update:model-value="sync"
          />
          <q-toggle
            v-if="row.mode === 'bool'"
            v-model="row.boolValue"
            :label="t('requiresBuilder.trueLabel')"
            @update:model-value="sync"
          />
          <q-input
            v-else-if="row.mode === 'exact'"
            dense
            outlined
            type="number"
            class="num-input"
            :label="t('requiresBuilder.valueLabel')"
            v-model.number="row.exactValue"
            @update:model-value="sync"
          />
          <q-input
            v-else-if="row.mode === 'min'"
            dense
            outlined
            type="number"
            class="num-input"
            label="min"
            v-model.number="row.min"
            @update:model-value="sync"
          />
          <q-input
            v-else-if="row.mode === 'max'"
            dense
            outlined
            type="number"
            class="num-input"
            label="max"
            v-model.number="row.max"
            @update:model-value="sync"
          />
          <template v-else-if="row.mode === 'range'">
            <q-input
              dense
              outlined
              type="number"
              class="num-input"
              label="min"
              v-model.number="row.min"
              @update:model-value="sync"
            />
            <q-input
              dense
              outlined
              type="number"
              class="num-input"
              label="max"
              v-model.number="row.max"
              @update:model-value="sync"
            />
          </template>
        </div>
      </div>
      <q-btn
        dense
        flat
        no-caps
        icon="add"
        :label="t('requiresBuilder.addFlagCondition')"
        class="btn-ghost"
        @click="addFlagRow"
      />

      <div class="section-title">
        {{ t('requiresBuilder.collectionsTitle') }}
        <FieldHelp :text="t('requiresBuilder.collectionsHelp')" />
      </div>
      <div v-if="!collectionRows.length" class="empty-hint">
        {{ t('requiresBuilder.noCollectionCondition') }}
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
          <q-tooltip>{{ t('requiresBuilder.removeCondition') }}</q-tooltip>
        </q-btn>
        <div class="row-fields">
          <FlagNameField v-model="row.flagKey" @update:model-value="sync" />
          <q-toggle
            v-model="row.sizeEnabled"
            :label="t('requiresBuilder.sizeConditionLabel')"
            @update:model-value="sync"
          />
          <template v-if="row.sizeEnabled">
            <q-select
              dense
              outlined
              class="mode-select"
              v-model="row.sizeMode"
              :options="SIZE_MODES"
              emit-value
              map-options
              @update:model-value="sync"
            />
            <q-input
              v-if="row.sizeMode === 'exact'"
              dense
              outlined
              type="number"
              class="num-input"
              :label="t('requiresBuilder.valueLabel')"
              v-model.number="row.sizeExact"
              @update:model-value="sync"
            />
            <q-input
              v-if="row.sizeMode === 'min' || row.sizeMode === 'range'"
              dense
              outlined
              type="number"
              class="num-input"
              label="min"
              v-model.number="row.sizeMin"
              @update:model-value="sync"
            />
            <q-input
              v-if="row.sizeMode === 'max' || row.sizeMode === 'range'"
              dense
              outlined
              type="number"
              class="num-input"
              label="max"
              v-model.number="row.sizeMax"
              @update:model-value="sync"
            />
          </template>
          <q-toggle
            v-model="row.hasEnabled"
            :label="t('requiresBuilder.hasConditionLabel')"
            @update:model-value="sync"
          />
          <q-input
            v-if="row.hasEnabled"
            dense
            outlined
            class="key-input"
            :label="t('requiresBuilder.itemKeyLabel')"
            v-model="row.hasKey"
            @update:model-value="sync"
          />
        </div>
      </div>
      <q-btn
        dense
        flat
        no-caps
        icon="add"
        :label="t('requiresBuilder.addCollectionCondition')"
        class="btn-ghost"
        @click="addCollectionRow"
      />

      <div class="section-title">
        {{ t('requiresBuilder.followingTitle') }}
        <FieldHelp :text="t('requiresBuilder.followingHelp')" />
      </div>
      <div v-if="!followingRows.length" class="empty-hint">
        {{ t('requiresBuilder.noFollowingCondition') }}
      </div>
      <div v-for="(row, i) in followingRows" :key="i" class="row-card">
        <q-btn
          dense
          flat
          round
          icon="close"
          size="sm"
          class="row-remove"
          @click="removeFollowingRow(i)"
        >
          <q-tooltip>{{ t('requiresBuilder.removeCondition') }}</q-tooltip>
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
          <q-toggle
            v-model="row.expected"
            :label="t('requiresBuilder.playerFollows')"
            @update:model-value="sync"
          />
        </div>
      </div>
      <q-btn
        dense
        flat
        no-caps
        icon="add"
        :label="t('requiresBuilder.addFollowingCondition')"
        class="btn-ghost"
        @click="addFollowingRow"
      />

      <div class="section-title">
        {{ t('requiresBuilder.entitiesTitle') }}
        <FieldHelp :text="t('requiresBuilder.entitiesHelp')" />
      </div>
      <div v-if="!entityRows.length" class="empty-hint">
        {{ t('requiresBuilder.noEntityCondition') }}
      </div>
      <div v-for="(row, i) in entityRows" :key="i" class="row-card">
        <q-btn
          dense
          flat
          round
          icon="close"
          size="sm"
          class="row-remove"
          @click="removeEntityRow(i)"
        >
          <q-tooltip>{{ t('requiresBuilder.removeCondition') }}</q-tooltip>
        </q-btn>
        <div class="row-fields">
          <q-select
            dense
            outlined
            class="mode-select"
            :label="t('requiresBuilder.schemaLabel')"
            v-model="row.schemaId"
            :options="schemaOptions"
            emit-value
            map-options
            @update:model-value="sync"
          />
          <q-input
            dense
            outlined
            class="key-input"
            :label="t('requiresBuilder.entityIdLabel')"
            v-model="row.entityId"
            @update:model-value="sync"
          />
          <q-select
            dense
            outlined
            class="key-input"
            :label="t('requiresBuilder.fieldLabel')"
            v-model="row.field"
            :options="fieldOptions(row.schemaId)"
            emit-value
            map-options
            @update:model-value="sync"
          />
          <!-- `collection`-typed field (user request) — size/presence
               checks, same shape/UI as the flag-collection section above,
               instead of the scalar value comparison every other field type
               uses. Which branch shows is decided by the SELECTED field's
               own type, live — switching the dropdown to a different field
               switches this too. -->
          <template v-if="isCollectionField(row)">
            <q-toggle
              v-model="row.sizeEnabled"
              :label="t('requiresBuilder.sizeConditionLabel')"
              @update:model-value="sync"
            />
            <template v-if="row.sizeEnabled">
              <q-select
                dense
                outlined
                class="mode-select"
                v-model="row.sizeMode"
                :options="SIZE_MODES"
                emit-value
                map-options
                @update:model-value="sync"
              />
              <q-input
                v-if="row.sizeMode === 'exact'"
                dense
                outlined
                type="number"
                class="num-input"
                :label="t('requiresBuilder.valueLabel')"
                v-model.number="row.sizeExact"
                @update:model-value="sync"
              />
              <q-input
                v-if="row.sizeMode === 'min' || row.sizeMode === 'range'"
                dense
                outlined
                type="number"
                class="num-input"
                label="min"
                v-model.number="row.sizeMin"
                @update:model-value="sync"
              />
              <q-input
                v-if="row.sizeMode === 'max' || row.sizeMode === 'range'"
                dense
                outlined
                type="number"
                class="num-input"
                label="max"
                v-model.number="row.sizeMax"
                @update:model-value="sync"
              />
            </template>
            <q-toggle
              v-model="row.hasEnabled"
              :label="t('requiresBuilder.hasConditionLabel')"
              @update:model-value="sync"
            />
            <q-input
              v-if="row.hasEnabled"
              dense
              outlined
              class="key-input"
              :label="t('requiresBuilder.itemKeyLabel')"
              v-model="row.hasKey"
              @update:model-value="sync"
            />
          </template>
          <template v-else>
            <q-select
              dense
              outlined
              class="mode-select"
              :label="t('requiresBuilder.conditionLabel')"
              v-model="row.mode"
              :options="FLAG_MODES"
              emit-value
              map-options
              @update:model-value="sync"
            />
            <q-toggle
              v-if="row.mode === 'bool'"
              v-model="row.boolValue"
              :label="t('requiresBuilder.trueLabel')"
              @update:model-value="sync"
            />
            <q-input
              v-else-if="row.mode === 'exact'"
              dense
              outlined
              class="num-input"
              :label="t('requiresBuilder.valueLabel')"
              v-model="row.exactValue"
              @update:model-value="sync"
            />
            <q-input
              v-else-if="row.mode === 'min'"
              dense
              outlined
              type="number"
              class="num-input"
              label="min"
              v-model.number="row.min"
              @update:model-value="sync"
            />
            <q-input
              v-else-if="row.mode === 'max'"
              dense
              outlined
              type="number"
              class="num-input"
              label="max"
              v-model.number="row.max"
              @update:model-value="sync"
            />
            <template v-else-if="row.mode === 'range'">
              <q-input
                dense
                outlined
                type="number"
                class="num-input"
                label="min"
                v-model.number="row.min"
                @update:model-value="sync"
              />
              <q-input
                dense
                outlined
                type="number"
                class="num-input"
                label="max"
                v-model.number="row.max"
                @update:model-value="sync"
              />
            </template>
          </template>
        </div>
      </div>
      <q-btn
        dense
        flat
        no-caps
        icon="add"
        :label="t('requiresBuilder.addEntityCondition')"
        class="btn-ghost"
        @click="addEntityRow"
      />
    </template>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import { useContactOptions } from '@/components/shared/useContactOptions'
import FieldHelp from '@/editor/components/FieldHelp.vue'
import FlagNameField from '@/editor/components/FlagNameField.vue'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()

// `requires: { flags?: { key: value|bool|{min}|{max}|{min,max} }, collections?: { flagKey: { size?, has? } }, following?: { contactId: bool } } | null`
// See NTR docs/story-engine.md section 5. Edits build a fresh `requires`
// object on every change and assign it back via v-model — no reactive
// round-trip watcher needed since nothing re-derives rows after mount.
const props = defineProps({ modelValue: { type: Object, default: null } })
const emit = defineEmits(['update:modelValue'])
const story = useStoryStore()
// computed, not a plain const — labels re-evaluate when the editor's own
// language switches (t() calls inside).
const FLAG_MODES = computed(() => [
  { label: t('requiresBuilder.modeBool'), value: 'bool' },
  { label: t('requiresBuilder.modeExact'), value: 'exact' },
  { label: t('requiresBuilder.modeMin'), value: 'min' },
  { label: t('requiresBuilder.modeMax'), value: 'max' },
  { label: t('requiresBuilder.modeRange'), value: 'range' },
])
const SIZE_MODES = computed(() => [
  { label: t('requiresBuilder.modeExact'), value: 'exact' },
  { label: t('requiresBuilder.modeMin'), value: 'min' },
  { label: t('requiresBuilder.modeMax'), value: 'max' },
  { label: t('requiresBuilder.modeRange'), value: 'range' },
])

const { contactOptions, contactColor, contactLabel } = useContactOptions()

function flagRowFrom(key, expected) {
  if (typeof expected === 'boolean')
    return reactive({ key, mode: 'bool', boolValue: expected, exactValue: 0, min: 0, max: 0 })
  if (expected && typeof expected === 'object') {
    if ('min' in expected && 'max' in expected)
      return reactive({
        key,
        mode: 'range',
        boolValue: true,
        exactValue: 0,
        min: expected.min,
        max: expected.max,
      })
    if ('min' in expected)
      return reactive({
        key,
        mode: 'min',
        boolValue: true,
        exactValue: 0,
        min: expected.min,
        max: 0,
      })
    if ('max' in expected)
      return reactive({
        key,
        mode: 'max',
        boolValue: true,
        exactValue: 0,
        min: 0,
        max: expected.max,
      })
  }
  return reactive({
    key,
    mode: 'exact',
    boolValue: true,
    exactValue: expected ?? 0,
    min: 0,
    max: 0,
  })
}

const flagRows = reactive(
  Object.entries(props.modelValue?.flags || {}).map(([key, expected]) =>
    flagRowFrom(key, expected),
  ),
)

// { collections: { flagKey: { size?: number|{min,max}, has?: itemKey } } } —
// `size`/`has` are independent checks on the SAME collection flag, both
// optional, both shown on one row (not a mode toggle like the flag rows
// above, since an author might reasonably want both at once — "at least 3
// items AND contains 'sword'").
function collectionRowFrom(flagKey, cond) {
  const row = reactive({
    flagKey,
    sizeEnabled: cond.size !== undefined,
    sizeMode: 'exact',
    sizeExact: 0,
    sizeMin: 0,
    sizeMax: 0,
    hasEnabled: cond.has !== undefined,
    hasKey: cond.has || '',
  })
  if (typeof cond.size === 'number') {
    row.sizeMode = 'exact'
    row.sizeExact = cond.size
  } else if (cond.size && typeof cond.size === 'object') {
    if ('min' in cond.size && 'max' in cond.size) {
      row.sizeMode = 'range'
      row.sizeMin = cond.size.min
      row.sizeMax = cond.size.max
    } else if ('min' in cond.size) {
      row.sizeMode = 'min'
      row.sizeMin = cond.size.min
    } else if ('max' in cond.size) {
      row.sizeMode = 'max'
      row.sizeMax = cond.size.max
    }
  }
  return row
}
const collectionRows = reactive(
  Object.entries(props.modelValue?.collections || {}).map(([flagKey, cond]) =>
    collectionRowFrom(flagKey, cond),
  ),
)

const followingRows = reactive(
  Object.entries(props.modelValue?.following || {}).map(([contactId, expected]) =>
    reactive({ contactId, expected }),
  ),
)

// { entities: [{ schemaId, entityId, field, value }] } — a LIST (not an
// object keyed by name like `flags` above) since schemaId+entityId+field
// isn't a natural single key the way a flag name is. Reuses the exact same
// bool/exact/min/max/range row shape as flagRowFrom — same comparison
// semantics, different data source (see checkConditions() in story.js).
//
// A `collection`-typed field (user request: "conditionner l'affichage par
// rapport à la collection, comme pour les flags") can't be compared this
// way at all — its value is a `{itemKey: value}` map, not a scalar — so
// every row ALSO carries the exact same sizeEnabled/size*/hasEnabled/hasKey
// fields collectionRowFrom below uses; which set the template actually
// shows is decided live off the SELECTED field's own type (see
// isCollectionField below), not frozen at whatever the row loaded with, so
// switching the field dropdown to a different field immediately switches
// the row's own UI to match.
function entityRowFrom(cond) {
  const base = { schemaId: cond.schemaId, entityId: cond.entityId ?? '*', field: cond.field }
  const collectionFields = {
    sizeEnabled: cond.size !== undefined,
    sizeMode: 'exact',
    sizeExact: 0,
    sizeMin: 0,
    sizeMax: 0,
    hasEnabled: cond.has !== undefined,
    hasKey: cond.has || '',
  }
  if (typeof cond.size === 'number') {
    collectionFields.sizeMode = 'exact'
    collectionFields.sizeExact = cond.size
  } else if (cond.size && typeof cond.size === 'object') {
    if ('min' in cond.size && 'max' in cond.size) {
      collectionFields.sizeMode = 'range'
      collectionFields.sizeMin = cond.size.min
      collectionFields.sizeMax = cond.size.max
    } else if ('min' in cond.size) {
      collectionFields.sizeMode = 'min'
      collectionFields.sizeMin = cond.size.min
    } else if ('max' in cond.size) {
      collectionFields.sizeMode = 'max'
      collectionFields.sizeMax = cond.size.max
    }
  }
  const expected = cond.value
  if (typeof expected === 'boolean')
    return reactive({
      ...base,
      ...collectionFields,
      mode: 'bool',
      boolValue: expected,
      exactValue: '',
      min: 0,
      max: 0,
    })
  if (expected && typeof expected === 'object') {
    if ('min' in expected && 'max' in expected)
      return reactive({
        ...base,
        ...collectionFields,
        mode: 'range',
        boolValue: true,
        exactValue: '',
        ...expected,
      })
    if ('min' in expected)
      return reactive({
        ...base,
        ...collectionFields,
        mode: 'min',
        boolValue: true,
        exactValue: '',
        min: expected.min,
        max: 0,
      })
    if ('max' in expected)
      return reactive({
        ...base,
        ...collectionFields,
        mode: 'max',
        boolValue: true,
        exactValue: '',
        min: 0,
        max: expected.max,
      })
  }
  return reactive({
    ...base,
    ...collectionFields,
    mode: 'exact',
    boolValue: true,
    exactValue: expected ?? '',
    min: 0,
    max: 0,
  })
}
const entityRows = reactive((props.modelValue?.entities || []).map(entityRowFrom))

function schemaFields(schemaId) {
  return story.project?.gameConfig?.entitySchemas?.find((s) => s.id === schemaId)?.fields || []
}
const schemaOptions = computed(() =>
  (story.project?.gameConfig?.entitySchemas || []).map((s) => ({
    label: s.label || s.id,
    value: s.id,
  })),
)
function fieldOptions(schemaId) {
  return schemaFields(schemaId).map((f) => ({ label: f.label || f.key, value: f.key }))
}
function isCollectionField(row) {
  return schemaFields(row.schemaId).find((f) => f.key === row.field)?.type === 'collection'
}

// Collapsed behind a single "+ Ajouter une condition" row when there's
// nothing set yet — RequiresBuilder renders at 3 nesting levels (chapter,
// every timeline entry, every choice option, see docs/ui-ux-audit.md point
// 3) and the full intro+2-sections form is ~15 lines of empty boilerplate
// repeated at each one. Stays revealed once true (including after the user
// removes their last row mid-edit) so it never collapses out from under
// them while they're actively working in it.
const revealed = ref(
  flagRows.length > 0 ||
    collectionRows.length > 0 ||
    followingRows.length > 0 ||
    entityRows.length > 0,
)

function addFlagRow() {
  flagRows.push(reactive({ key: '', mode: 'bool', boolValue: true, exactValue: 0, min: 0, max: 0 }))
}
function removeFlagRow(i) {
  flagRows.splice(i, 1)
  sync()
}
function addCollectionRow() {
  collectionRows.push(
    reactive({
      flagKey: '',
      sizeEnabled: false,
      sizeMode: 'exact',
      sizeExact: 0,
      sizeMin: 0,
      sizeMax: 0,
      hasEnabled: false,
      hasKey: '',
    }),
  )
}
function removeCollectionRow(i) {
  collectionRows.splice(i, 1)
  sync()
}
function addFollowingRow() {
  followingRows.push(reactive({ contactId: contactOptions.value[0]?.value || '', expected: true }))
}
function removeFollowingRow(i) {
  followingRows.splice(i, 1)
  sync()
}
function addEntityRow() {
  entityRows.push(
    reactive({
      schemaId: schemaOptions.value[0]?.value || '',
      entityId: '*',
      field: '',
      mode: 'bool',
      boolValue: true,
      exactValue: '',
      min: 0,
      max: 0,
      sizeEnabled: false,
      sizeMode: 'exact',
      sizeExact: 0,
      sizeMin: 0,
      sizeMax: 0,
      hasEnabled: false,
      hasKey: '',
    }),
  )
}
function removeEntityRow(i) {
  entityRows.splice(i, 1)
  sync()
}

function sync() {
  const flags = {}
  for (const row of flagRows) {
    if (!row.key) continue
    if (row.mode === 'bool') flags[row.key] = row.boolValue
    else if (row.mode === 'exact') flags[row.key] = row.exactValue
    else if (row.mode === 'min') flags[row.key] = { min: row.min }
    else if (row.mode === 'max') flags[row.key] = { max: row.max }
    else if (row.mode === 'range') flags[row.key] = { min: row.min, max: row.max }
  }
  const collections = {}
  for (const row of collectionRows) {
    if (!row.flagKey) continue
    const cond = {}
    if (row.sizeEnabled) {
      if (row.sizeMode === 'exact') cond.size = row.sizeExact
      else if (row.sizeMode === 'min') cond.size = { min: row.sizeMin }
      else if (row.sizeMode === 'max') cond.size = { max: row.sizeMax }
      else if (row.sizeMode === 'range') cond.size = { min: row.sizeMin, max: row.sizeMax }
    }
    if (row.hasEnabled && row.hasKey) cond.has = row.hasKey
    if (Object.keys(cond).length) collections[row.flagKey] = cond
  }
  const following = {}
  for (const row of followingRows) {
    if (!row.contactId) continue
    following[row.contactId] = row.expected
  }
  const entities = []
  for (const row of entityRows) {
    if (!row.schemaId || !row.field) continue
    if (isCollectionField(row)) {
      const cond = { schemaId: row.schemaId, entityId: row.entityId || '*', field: row.field }
      if (row.sizeEnabled) {
        if (row.sizeMode === 'exact') cond.size = row.sizeExact
        else if (row.sizeMode === 'min') cond.size = { min: row.sizeMin }
        else if (row.sizeMode === 'max') cond.size = { max: row.sizeMax }
        else if (row.sizeMode === 'range') cond.size = { min: row.sizeMin, max: row.sizeMax }
      }
      if (row.hasEnabled && row.hasKey) cond.has = row.hasKey
      if (cond.size !== undefined || cond.has !== undefined) entities.push(cond)
      continue
    }
    let value
    if (row.mode === 'bool') value = row.boolValue
    else if (row.mode === 'exact') value = row.exactValue
    else if (row.mode === 'min') value = { min: row.min }
    else if (row.mode === 'max') value = { max: row.max }
    else if (row.mode === 'range') value = { min: row.min, max: row.max }
    entities.push({
      schemaId: row.schemaId,
      entityId: row.entityId || '*',
      field: row.field,
      value,
    })
  }
  const hasFlags = Object.keys(flags).length > 0
  const hasCollections = Object.keys(collections).length > 0
  const hasFollowing = Object.keys(following).length > 0
  const hasEntities = entities.length > 0
  if (!hasFlags && !hasCollections && !hasFollowing && !hasEntities) {
    emit('update:modelValue', null)
    return
  }
  emit('update:modelValue', {
    ...(hasFlags ? { flags } : {}),
    ...(hasCollections ? { collections } : {}),
    ...(hasFollowing ? { following } : {}),
    ...(hasEntities ? { entities } : {}),
  })
}
</script>

<style scoped>
.requires-builder {
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

.empty-hint {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  font-style: italic;
}

.row-card {
  position: relative;
  display: flex;
  align-items: flex-start;
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

.option-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-right: var(--space-1);
}

.mode-select {
  flex: 0 0 150px;
}

.num-input {
  flex: 0 0 90px;
}
</style>
