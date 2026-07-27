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
  </q-select>
</template>

<script setup>
import { ref } from 'vue'
import { useStoryStore } from '@/engine/stores/story'

// Combobox over every flag already used anywhere in the project
// (story.allFlagNames, see src/engine/stores/story.js) — picks an existing
// flag from a dropdown instead of retyping its exact name by hand every
// time (typo-prone), while `new-value-mode="add-unique"` still lets you
// type a brand new flag name freely.
defineProps({ modelValue: { type: String, default: '' } })
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
</script>

<style scoped>
.flag-name-field {
  flex: 1;
  min-width: 140px;
}
</style>
