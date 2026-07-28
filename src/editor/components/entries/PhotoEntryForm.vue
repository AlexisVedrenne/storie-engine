<template>
  <div class="entry-form">
    <q-select dense outlined emit-value map-options label="Envoyée par" :options="contactOptions" v-model="entry.from" />
    <AssetField v-model="entry.url" label="Image" :contact-id="entry.from" />
    <q-input dense outlined label="Légende (optionnel)" placeholder="ex: Le café de ce matin" v-model="entry.caption" />
  </div>
</template>

<script setup>
import { useContactOptions } from '@/editor/composables/useContactOptions'
import AssetField from '@/editor/components/AssetField.vue'

defineProps({ entry: { type: Object, required: true } })
const { contactOptions } = useContactOptions()
</script>

<style scoped>
.entry-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
</style>
