<template>
  <div class="entry-form">
    <q-select
      dense
      outlined
      emit-value
      map-options
      label="Contact"
      :options="contactOptions"
      v-model="entry.contact"
    />
    <q-input dense outlined type="textarea" autogrow label="Texte" v-model="entry.text" />
    <AssetField v-model="entry.image" label="Image (optionnel)" />
  </div>
</template>

<script setup>
import { useStoryStore } from '@/engine/stores/story'
import AssetField from '@/editor/components/AssetField.vue'

defineProps({ entry: { type: Object, required: true } })
const story = useStoryStore()
const contactOptions = story.contactsList.filter((c) => c.id !== 'me').map((c) => ({ label: c.name, value: c.id }))
</script>

<style scoped>
.entry-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
