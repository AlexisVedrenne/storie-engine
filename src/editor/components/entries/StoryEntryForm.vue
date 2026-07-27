<template>
  <div class="entry-form">
    <q-select dense outlined emit-value map-options label="Contact" :options="contactOptions" v-model="entry.contact" />
    <AssetField v-model="entry.media" label="Média (optionnel — sinon emoji sur fond coloré)" />
    <div class="row">
      <q-input dense outlined label="Emoji" v-model="entry.emoji" class="emoji-input" />
      <q-input dense outlined label="Couleur de fond (#hex)" v-model="entry.bg" />
    </div>
    <q-input dense outlined label="Légende (optionnel)" v-model="entry.caption" />
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

.row {
  display: flex;
  gap: 8px;
}

.emoji-input {
  width: 100px;
}
</style>
