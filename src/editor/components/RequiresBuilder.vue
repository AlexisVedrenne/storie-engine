<template>
  <div class="requires-builder">
    <div class="section-title">Conditions (flags)</div>
    <div v-for="(row, i) in flagRows" :key="i" class="row">
      <q-input dense outlined class="key-input" v-model="row.key" label="Flag" @update:model-value="sync" />
      <q-select
        dense
        outlined
        class="mode-select"
        v-model="row.mode"
        :options="FLAG_MODES"
        emit-value
        map-options
        @update:model-value="sync"
      />
      <template v-if="row.mode === 'bool'">
        <q-toggle v-model="row.boolValue" label="vrai" @update:model-value="sync" />
      </template>
      <template v-else-if="row.mode === 'exact'">
        <q-input dense outlined type="number" class="num-input" v-model.number="row.exactValue" @update:model-value="sync" />
      </template>
      <template v-else-if="row.mode === 'min'">
        <q-input dense outlined type="number" class="num-input" label="min" v-model.number="row.min" @update:model-value="sync" />
      </template>
      <template v-else-if="row.mode === 'max'">
        <q-input dense outlined type="number" class="num-input" label="max" v-model.number="row.max" @update:model-value="sync" />
      </template>
      <template v-else-if="row.mode === 'range'">
        <q-input dense outlined type="number" class="num-input" label="min" v-model.number="row.min" @update:model-value="sync" />
        <q-input dense outlined type="number" class="num-input" label="max" v-model.number="row.max" @update:model-value="sync" />
      </template>
      <q-btn dense flat round icon="close" size="sm" @click="removeFlagRow(i)" />
    </div>
    <q-btn dense flat icon="add" label="Ajouter une condition de flag" @click="addFlagRow" />

    <div class="section-title">Conditions (abonnements)</div>
    <div v-for="(row, i) in followingRows" :key="i" class="row">
      <q-select
        dense
        outlined
        class="key-input"
        v-model="row.contactId"
        :options="contactOptions"
        emit-value
        map-options
        label="Contact"
        @update:model-value="sync"
      />
      <q-toggle v-model="row.expected" label="suit" @update:model-value="sync" />
      <q-btn dense flat round icon="close" size="sm" @click="removeFollowingRow(i)" />
    </div>
    <q-btn dense flat icon="add" label="Ajouter une condition d'abonnement" @click="addFollowingRow" />
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { useStoryStore } from '@/engine/stores/story'

// `requires: { flags?: { key: value|bool|{min}|{max}|{min,max} }, following?: { contactId: bool } } | null`
// See NTR docs/story-engine.md section 5. Edits build a fresh `requires`
// object on every change and assign it back via v-model — no reactive
// round-trip watcher needed since nothing re-derives rows after mount.
const props = defineProps({ modelValue: { type: Object, default: null } })
const emit = defineEmits(['update:modelValue'])
const story = useStoryStore()

const FLAG_MODES = [
  { label: 'booléen (true/false)', value: 'bool' },
  { label: 'égal à', value: 'exact' },
  { label: 'minimum', value: 'min' },
  { label: 'maximum', value: 'max' },
  { label: 'plage (min-max)', value: 'range' },
]

const contactOptions = story.contactsList.map((c) => ({ label: c.name, value: c.id }))

function flagRowFrom(key, expected) {
  if (typeof expected === 'boolean') return reactive({ key, mode: 'bool', boolValue: expected, exactValue: 0, min: 0, max: 0 })
  if (expected && typeof expected === 'object') {
    if ('min' in expected && 'max' in expected) return reactive({ key, mode: 'range', boolValue: true, exactValue: 0, min: expected.min, max: expected.max })
    if ('min' in expected) return reactive({ key, mode: 'min', boolValue: true, exactValue: 0, min: expected.min, max: 0 })
    if ('max' in expected) return reactive({ key, mode: 'max', boolValue: true, exactValue: 0, min: 0, max: expected.max })
  }
  return reactive({ key, mode: 'exact', boolValue: true, exactValue: expected ?? 0, min: 0, max: 0 })
}

const flagRows = reactive(
  Object.entries(props.modelValue?.flags || {}).map(([key, expected]) => flagRowFrom(key, expected)),
)
const followingRows = reactive(
  Object.entries(props.modelValue?.following || {}).map(([contactId, expected]) => reactive({ contactId, expected })),
)

function addFlagRow() {
  flagRows.push(reactive({ key: '', mode: 'bool', boolValue: true, exactValue: 0, min: 0, max: 0 }))
}
function removeFlagRow(i) {
  flagRows.splice(i, 1)
  sync()
}
function addFollowingRow() {
  followingRows.push(reactive({ contactId: contactOptions[0]?.value || '', expected: true }))
}
function removeFollowingRow(i) {
  followingRows.splice(i, 1)
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
  const following = {}
  for (const row of followingRows) {
    if (!row.contactId) continue
    following[row.contactId] = row.expected
  }
  const hasFlags = Object.keys(flags).length > 0
  const hasFollowing = Object.keys(following).length > 0
  if (!hasFlags && !hasFollowing) {
    emit('update:modelValue', null)
    return
  }
  emit('update:modelValue', {
    ...(hasFlags ? { flags } : {}),
    ...(hasFollowing ? { following } : {}),
  })
}
</script>

<style scoped>
.requires-builder {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-title {
  font-size: 11px;
  text-transform: uppercase;
  opacity: 0.6;
  margin-top: 8px;
}

.row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.key-input {
  flex: 1;
  min-width: 120px;
}

.mode-select {
  width: 160px;
}

.num-input {
  width: 90px;
}
</style>
