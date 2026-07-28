<template>
  <div class="entry-form">
    <q-select
      dense
      outlined
      emit-value
      map-options
      label="Conversation Instagram (1:1 ou groupe)"
      :options="threadOptions"
      v-model="entry.thread"
    />
    <q-select dense outlined emit-value map-options label="De (qui envoie le message)" :options="fromOptions" v-model="entry.from" />
    <q-input
      dense
      outlined
      type="textarea"
      autogrow
      label="Texte du message"
      placeholder="ex: Je préfère te le dire en privé 😉"
      v-model="entry.text"
    />
    <AssetField v-model="entry.image" label="Photo jointe (optionnel)" :contact-id="entry.from" />
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
  gap: var(--space-3);
}
</style>
