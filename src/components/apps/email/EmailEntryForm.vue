<template>
  <div class="entry-form">
    <q-select
      dense
      outlined
      emit-value
      map-options
      label="De (qui envoie l'email)"
      :options="contactOptions"
      v-model="entry.from"
    >
      <template #selected>
        <span class="selected-row">
          <span class="option-dot" :style="{ background: contactColor(entry.from) }" />
          {{ contactLabel(entry.from) }}
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
    <q-input dense outlined ref="subjectInputRef" label="Objet" v-model="entry.subject">
      <template #append>
        <EmojiPickerBtn @pick="(e) => (entry.subject = insertEmojiAtCaret(subjectInputRef, entry.subject, e))" />
      </template>
    </q-input>
    <q-input dense outlined ref="textInputRef" type="textarea" autogrow label="Texte de l'email" v-model="entry.text">
      <template #append>
        <EmojiPickerBtn @pick="(e) => (entry.text = insertEmojiAtCaret(textInputRef, entry.text, e))" />
      </template>
    </q-input>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useContactOptions } from '@/components/shared/useContactOptions'
import EmojiPickerBtn from '@/components/shared/EmojiPickerBtn.vue'
import { insertEmojiAtCaret } from '@/components/shared/emojiInsert'

defineProps({ entry: { type: Object, required: true } })
const { contactOptionsNoMe: contactOptions, contactColor, contactLabel } = useContactOptions()
const subjectInputRef = ref(null)
const textInputRef = ref(null)
</script>

<style scoped>
.entry-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
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
</style>
