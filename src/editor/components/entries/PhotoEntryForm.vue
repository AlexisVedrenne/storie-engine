<template>
  <div class="entry-form">
    <q-select
      dense
      outlined
      emit-value
      map-options
      :label="t('entries.photo.fromLabel')"
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
    <AssetField v-model="entry.url" :label="t('entries.photo.imageLabel')" :contact-id="entry.from" />
    <q-input
      dense
      outlined
      ref="captionInputRef"
      :label="t('entries.photo.captionLabel')"
      :placeholder="t('entries.photo.captionPlaceholder')"
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
import { useContactOptions } from '@/components/shared/useContactOptions'
import AssetField from '@/editor/components/AssetField.vue'
import EmojiPickerBtn from '@/components/shared/EmojiPickerBtn.vue'
import { insertEmojiAtCaret } from '@/components/shared/emojiInsert'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
defineProps({ entry: { type: Object, required: true } })
const { contactOptions, contactColor, contactLabel } = useContactOptions()
const captionInputRef = ref(null)
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
