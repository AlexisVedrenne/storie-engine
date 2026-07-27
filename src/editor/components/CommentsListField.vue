<template>
  <div class="comments-field">
    <div class="section-title">Commentaires</div>
    <div v-for="(c, i) in comments" :key="i" class="row">
      <q-select
        dense
        outlined
        emit-value
        map-options
        class="author-select"
        :options="contactOptions"
        v-model="c.author"
        @update:model-value="sync"
      />
      <q-input dense outlined class="text-input" v-model="c.text" @update:model-value="sync" />
      <q-btn dense flat round icon="close" size="sm" @click="removeComment(i)" />
    </div>
    <q-btn dense flat icon="add" label="Ajouter un commentaire" @click="addComment" />
    <q-input
      dense
      outlined
      type="number"
      label="Nombre de commentaires affiché (optionnel — sinon = nombre réel ci-dessus)"
      :model-value="commentsCount"
      @update:model-value="(v) => emit('update:commentsCount', v === '' ? undefined : Number(v))"
    />
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { useStoryStore } from '@/engine/stores/story'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  commentsCount: { type: Number, default: undefined },
})
const emit = defineEmits(['update:modelValue', 'update:commentsCount'])
const story = useStoryStore()
const contactOptions = story.contactsList.map((c) => ({ label: c.name, value: c.id }))

const comments = reactive((props.modelValue || []).map((c) => reactive({ ...c })))

function addComment() {
  comments.push(reactive({ author: contactOptions[0]?.value || '', text: '' }))
  sync()
}
function removeComment(i) {
  comments.splice(i, 1)
  sync()
}
function sync() {
  emit(
    'update:modelValue',
    comments.filter((c) => c.author && c.text).map((c) => ({ author: c.author, text: c.text })),
  )
}
</script>

<style scoped>
.comments-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-title {
  font-size: 11px;
  text-transform: uppercase;
  opacity: 0.6;
}

.row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.author-select {
  width: 160px;
}

.text-input {
  flex: 1;
}
</style>
