<template>
  <div class="entry-form">
    <q-select
      dense
      outlined
      emit-value
      map-options
      label="De (qui envoie le SMS)"
      :options="contactOptions"
      v-model="entry.contact"
    />
    <q-input
      dense
      outlined
      type="textarea"
      autogrow
      label="Texte du message"
      placeholder="ex: Coucou ! Ça va ?"
      v-model="entry.text"
    />
    <AssetField v-model="entry.image" label="Photo jointe (optionnel)" />
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
  gap: var(--space-3);
}
</style>
