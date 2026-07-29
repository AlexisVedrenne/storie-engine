<template>
  <q-select
    dense
    outlined
    use-input
    hide-selected
    fill-input
    input-debounce="0"
    new-value-mode="add-unique"
    class="flag-name-field"
    :model-value="modelValue"
    :options="filteredOptions"
    label="Nom du flag"
    placeholder="ex: trustClara"
    @filter="filterFn"
    @update:model-value="(v) => emit('update:modelValue', v)"
  >
    <template #no-option>
      <q-item>
        <q-item-section class="text-grey">Tape pour créer un nouveau flag</q-item-section>
      </q-item>
    </template>
    <!-- Purely visual — the option's underlying value is still the plain
         key string (see story.allFlagNames), this just shows the author's
         label + observed usage from story.flagCatalog next to it so
         picking from the list doesn't require remembering what a cryptic
         key like `trustClara` actually tracks. -->
    <template #option="scope">
      <q-item v-bind="scope.itemProps">
        <q-item-section>
          <q-item-label>{{ scope.opt }}</q-item-label>
          <q-item-label v-if="catalogHint(scope.opt)" caption>{{ catalogHint(scope.opt) }}</q-item-label>
        </q-item-section>
      </q-item>
    </template>
  </q-select>
  <div v-if="selectedHint" class="flag-hint">
    <q-icon name="info" size="12px" />
    {{ selectedHint }}
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useStoryStore } from '@/engine/stores/story'

// Combobox over every flag already used anywhere in the project
// (story.allFlagNames, see src/engine/stores/story.js) — picks an existing
// flag from a dropdown instead of retyping its exact name by hand every
// time (typo-prone), while `new-value-mode="add-unique"` still lets you
// type a brand new flag name freely.
const props = defineProps({ modelValue: { type: String, default: '' } })
const emit = defineEmits(['update:modelValue'])
const story = useStoryStore()

const filteredOptions = ref(story.allFlagNames)
function filterFn(val, update) {
  update(() => {
    if (!val) {
      filteredOptions.value = story.allFlagNames
      return
    }
    const needle = val.toLowerCase()
    filteredOptions.value = story.allFlagNames.filter((f) => f.toLowerCase().includes(needle))
  })
}

// Label + observed type/range for a flag key, e.g. "Confiance de Clara —
// numérique, modifié entre -2 et 12" — see collectFlags.js: the range only
// counts EFFECTS that set the flag, never a condition that merely reads it
// (a `>= 3` check elsewhere doesn't mean the flag has ever been 3).
function hintFor(key) {
  const entry = story.flagCatalog.find((f) => f.key === key)
  if (!entry) return ''
  const parts = []
  if (entry.label) parts.push(entry.label)
  if (entry.isNumeric) parts.push(`numérique, modifié entre ${entry.min} et ${entry.max}`)
  else if (entry.isBoolean) parts.push('booléen')
  if (entry.neverModified) parts.push('⚠ lu, jamais modifié par un effet')
  return parts.join(' — ')
}
function catalogHint(key) {
  return hintFor(key)
}
const selectedHint = computed(() => (props.modelValue ? hintFor(props.modelValue) : ''))
</script>

<style scoped>
.flag-name-field {
  flex: 1;
  min-width: 140px;
}

.flag-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  margin-top: 2px;
}
</style>
