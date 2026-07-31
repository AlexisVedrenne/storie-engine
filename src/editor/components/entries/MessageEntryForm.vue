<template>
  <div class="entry-form">
    <q-select
      dense
      outlined
      emit-value
      map-options
      :label="t('entries.message.fromLabel')"
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
    <q-input
      dense
      outlined
      ref="textInputRef"
      type="textarea"
      autogrow
      :label="t('entries.message.textLabel')"
      :placeholder="t('entries.message.textPlaceholder')"
      v-model="entry.text"
    >
      <template #append>
        <EmojiPickerBtn @pick="(e) => (entry.text = insertEmojiAtCaret(textInputRef, entry.text, e))" />
      </template>
    </q-input>
    <AssetField
      v-model="entry.image"
      :label="t('entries.message.imageLabel')"
      :contact-id="entry.contact"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useContactOptions } from '@/components/shared/useContactOptions'
import AssetField from '@/editor/components/AssetField.vue'
import EmojiPickerBtn from '@/components/shared/EmojiPickerBtn.vue'
import { insertEmojiAtCaret } from '@/components/shared/emojiInsert'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
defineProps({ entry: { type: Object, required: true } })
const { contactOptionsNoMe: contactOptions, contactColor, contactLabel } = useContactOptions()
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
