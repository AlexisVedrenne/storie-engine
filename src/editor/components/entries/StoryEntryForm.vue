<template>
  <div class="entry-form">
    <q-select dense outlined emit-value map-options label="Personnage" :options="contactOptions" v-model="entry.contact" />
    <AssetField v-model="entry.media" label="Image (optionnel — sinon emoji sur fond coloré)" :contact-id="entry.contact" />
    <div class="row">
      <q-input dense outlined label="Emoji" placeholder="☕" v-model="entry.emoji" class="emoji-input" />
      <q-input dense outlined label="Couleur de fond" placeholder="#e91e63" v-model="entry.bg" />
    </div>
    <q-input dense outlined label="Légende (optionnel)" placeholder="ex: petit dej du dimanche" v-model="entry.caption" />
  </div>
</template>

<script setup>
import { useContactOptions } from '@/editor/composables/useContactOptions'
import AssetField from '@/editor/components/AssetField.vue'

defineProps({ entry: { type: Object, required: true } })
const { contactOptionsNoMe: contactOptions } = useContactOptions()
</script>

<style scoped>
.entry-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.row {
  display: flex;
  gap: var(--space-3);
}

.emoji-input {
  width: 100px;
}
</style>
