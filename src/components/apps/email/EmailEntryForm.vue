<template>
  <div class="entry-form">
    <q-input
      dense
      outlined
      label="Adresse d'expéditeur"
      hint="Texte libre, pas un contact du projet — ex: support@mabanque.fr"
      placeholder="contact@exemple.com"
      v-model="entry.fromEmail"
    />
    <q-input
      dense
      outlined
      ref="fromNameInputRef"
      label="Nom de l'expéditeur"
      v-model="entry.fromName"
    >
      <template #append>
        <EmojiPickerBtn
          @pick="(e) => (entry.fromName = insertEmojiAtCaret(fromNameInputRef, entry.fromName, e))"
        />
      </template>
    </q-input>
    <q-input dense outlined ref="subjectInputRef" label="Objet" v-model="entry.subject">
      <template #append>
        <EmojiPickerBtn
          @pick="(e) => (entry.subject = insertEmojiAtCaret(subjectInputRef, entry.subject, e))"
        />
      </template>
    </q-input>
    <q-input
      dense
      outlined
      ref="textInputRef"
      type="textarea"
      autogrow
      label="Corps du mail"
      v-model="entry.text"
    >
      <template #append>
        <EmojiPickerBtn
          @pick="(e) => (entry.text = insertEmojiAtCaret(textInputRef, entry.text, e))"
        />
      </template>
    </q-input>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import EmojiPickerBtn from '@/components/shared/EmojiPickerBtn.vue'
import { insertEmojiAtCaret } from '@/components/shared/emojiInsert'

defineProps({ entry: { type: Object, required: true } })
const fromNameInputRef = ref(null)
const subjectInputRef = ref(null)
const textInputRef = ref(null)
</script>

<style scoped>
.entry-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
</style>
