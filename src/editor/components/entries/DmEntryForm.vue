<template>
  <div class="entry-form">
    <q-select dense outlined emit-value map-options label="Thread (DM)" :options="threadOptions" v-model="entry.thread" />
    <q-select dense outlined emit-value map-options label="De" :options="fromOptions" v-model="entry.from" />
    <q-input dense outlined type="textarea" autogrow label="Texte" v-model="entry.text" />
    <AssetField v-model="entry.image" label="Image (optionnel)" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import AssetField from '@/editor/components/AssetField.vue'

defineProps({ entry: { type: Object, required: true } })
const story = useStoryStore()

const threadOptions = computed(() => {
  const groups = (story.project?.threads || []).map((t) => ({ label: `${t.name} (groupe)`, value: t.id }))
  const oneToOne = story.contactsList.filter((c) => c.id !== 'me').map((c) => ({ label: `${c.name} (1:1)`, value: c.id }))
  return [...groups, ...oneToOne]
})

const fromOptions = computed(() => [
  { label: 'Moi', value: 'me' },
  ...story.contactsList.filter((c) => c.id !== 'me').map((c) => ({ label: c.name, value: c.id })),
])
</script>

<style scoped>
.entry-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
