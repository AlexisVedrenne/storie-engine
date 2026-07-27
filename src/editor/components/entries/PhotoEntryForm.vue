<template>
  <div class="entry-form">
    <q-select dense outlined emit-value map-options label="De" :options="contactOptions" v-model="entry.from" />
    <AssetField v-model="entry.url" label="Image" />
    <q-input dense outlined label="Légende (optionnel)" v-model="entry.caption" />
  </div>
</template>

<script setup>
import { useStoryStore } from '@/engine/stores/story'
import AssetField from '@/editor/components/AssetField.vue'

defineProps({ entry: { type: Object, required: true } })
const story = useStoryStore()
const contactOptions = story.contactsList.map((c) => ({ label: c.name, value: c.id }))
</script>

<style scoped>
.entry-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
