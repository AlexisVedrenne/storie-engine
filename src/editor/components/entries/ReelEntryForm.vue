<template>
  <div class="entry-form">
    <q-select dense outlined emit-value map-options label="Auteur" :options="contactOptions" v-model="entry.author" />
    <AssetField v-model="entry.media" label="Média (vidéo/image)" />
    <q-input dense outlined label="Légende (optionnel)" v-model="entry.caption" />
    <q-input dense outlined label="Musique (optionnel)" v-model="entry.music" />
    <q-input dense outlined type="number" label="Likes (optionnel — sinon aléatoire)" v-model.number="entry.likes" />
    <CommentsListField
      v-model="entry.comments"
      :comments-count="entry.commentsCount"
      @update:comments-count="(v) => (entry.commentsCount = v)"
    />
  </div>
</template>

<script setup>
import { useStoryStore } from '@/engine/stores/story'
import AssetField from '@/editor/components/AssetField.vue'
import CommentsListField from '@/editor/components/CommentsListField.vue'

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
