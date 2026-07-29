<template>
  <div class="entry-form">
    <q-select
      dense
      outlined
      emit-value
      map-options
      label="Personnage"
      :options="contactOptions"
      v-model="entry.contact"
    >
      <template #selected>
        <span class="selected-row">
          <span class="option-dot" :style="{ background: contactColor(entry.contact) }" />
          {{ contactLabel(entry.contact) }}
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
    <AssetField
      v-model="entry.media"
      label="Image (optionnel — sinon emoji sur fond coloré)"
      :contact-id="entry.contact"
    />
    <div class="row">
      <q-input
        dense
        outlined
        label="Emoji"
        placeholder="☕"
        v-model="entry.emoji"
        class="emoji-input"
      />
      <q-input dense outlined label="Couleur de fond" placeholder="#e91e63" v-model="entry.bg" />
    </div>
    <q-input
      dense
      outlined
      ref="captionInputRef"
      label="Légende (optionnel)"
      placeholder="ex: petit dej du dimanche"
      v-model="entry.caption"
    >
      <template #append>
        <EmojiPickerBtn @pick="(e) => (entry.caption = insertEmojiAtCaret(captionInputRef, entry.caption, e))" />
      </template>
    </q-input>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useContactOptions } from '@/editor/composables/useContactOptions'
import AssetField from '@/editor/components/AssetField.vue'
import EmojiPickerBtn from '@/editor/components/EmojiPickerBtn.vue'
import { insertEmojiAtCaret } from '@/editor/utils/emojiInsert'

defineProps({ entry: { type: Object, required: true } })
const { contactOptionsNoMe: contactOptions, contactColor, contactLabel } = useContactOptions()
const captionInputRef = ref(null)
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
