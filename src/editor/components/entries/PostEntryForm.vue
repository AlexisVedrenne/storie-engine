<template>
  <div class="entry-form">
    <q-select dense outlined emit-value map-options label="Auteur de la publication" :options="contactOptions" v-model="entry.author" />
    <q-input
      dense
      outlined
      type="textarea"
      autogrow
      label="Légende"
      placeholder="ex: dernière lumière du soir ✨"
      v-model="entry.content"
    />
    <AssetField v-model="entry.image" label="Image (optionnel)" :contact-id="entry.author" />
    <q-input dense outlined type="number" label="Nombre de likes (optionnel — sinon aléatoire)" v-model.number="entry.likes" />
    <CommentsListField
      v-model="entry.comments"
      :comments-count="entry.commentsCount"
      @update:comments-count="(v) => (entry.commentsCount = v)"
    />
  </div>
</template>

<script setup>
import { useContactOptions } from '@/editor/composables/useContactOptions'
import AssetField from '@/editor/components/AssetField.vue'
import CommentsListField from '@/editor/components/CommentsListField.vue'

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
