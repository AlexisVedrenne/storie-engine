<template>
  <div class="comments-field">
    <div class="section-title">Commentaires (optionnel)</div>
    <div v-if="!comments.length" class="empty-hint">Aucun commentaire écrit à la main.</div>
    <div v-for="(c, i) in comments" :key="i" class="row">
      <q-select
        dense
        outlined
        emit-value
        map-options
        class="author-select"
        label="Auteur"
        :options="contactOptions"
        v-model="c.author"
        @update:model-value="sync"
      >
        <template #selected>
          <span class="selected-row">
            <span class="option-dot" :style="{ background: contactColor(c.author) }" />
            {{ contactLabel(c.author) }}
          </span>
        </template>
        <template #option="scope">
          <q-item v-bind="scope.itemProps">
            <q-item-section avatar>
              <span class="option-dot" :style="{ background: contactColor(scope.opt.value) }" />
            </q-item-section>
            <q-item-section>{{ scope.opt.label }}</q-item-section>
          </q-item>
        </template>
      </q-select>
      <q-input
        dense
        outlined
        class="text-input"
        placeholder="Texte du commentaire"
        v-model="c.text"
        @update:model-value="sync"
      />
      <q-btn dense flat round icon="close" size="sm" @click="removeComment(i)">
        <q-tooltip>Retirer</q-tooltip>
      </q-btn>
    </div>
    <q-btn
      dense
      flat
      no-caps
      icon="add"
      label="Ajouter un commentaire"
      class="btn-ghost"
      @click="addComment"
    />
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
import { useContactOptions } from '@/editor/composables/useContactOptions'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  commentsCount: { type: Number, default: undefined },
})
const emit = defineEmits(['update:modelValue', 'update:commentsCount'])
const { contactOptions, contactColor, contactLabel } = useContactOptions()

const comments = reactive((props.modelValue || []).map((c) => reactive({ ...c })))

function addComment() {
  comments.push(reactive({ author: contactOptions.value[0]?.value || '', text: '' }))
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
  gap: var(--space-2);
}

.section-title {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
}

.empty-hint {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  font-style: italic;
}

.row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.author-select {
  flex: 0 0 160px;
}

.selected-row {
  display: inline-flex;
  align-items: center;
}

.option-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-right: var(--space-1);
}

.text-input {
  flex: 1;
}
</style>
