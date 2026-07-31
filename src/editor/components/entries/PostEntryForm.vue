<template>
  <div class="entry-form">
    <q-select
      dense
      outlined
      emit-value
      map-options
      :label="t('entries.post.authorLabel')"
      :options="contactOptions"
      v-model="entry.author"
    >
      <template #selected>
        <span class="selected-row">
          <span class="option-dot" :style="{ background: contactColor(entry.author) }" />
          {{ contactLabel(entry.author) }}
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
      ref="contentInputRef"
      type="textarea"
      autogrow
      :label="t('entries.post.captionLabel')"
      :placeholder="t('entries.post.captionPlaceholder')"
      v-model="entry.content"
    >
      <template #append>
        <EmojiPickerBtn @pick="(e) => (entry.content = insertEmojiAtCaret(contentInputRef, entry.content, e))" />
      </template>
    </q-input>
    <q-input
      dense
      outlined
      :label="t('entries.post.idLabel')"
      :placeholder="t('entries.post.idPlaceholder')"
      v-model="entry.id"
    />
    <AssetField v-model="entry.image" :label="t('entries.post.imageLabel')" :contact-id="entry.author" />
    <q-input
      dense
      outlined
      type="number"
      :label="t('entries.post.likesLabel')"
      v-model.number="entry.likes"
    />
    <CommentsListField
      v-model="entry.comments"
      :comments-count="entry.commentsCount"
      @update:comments-count="(v) => (entry.commentsCount = v)"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useContactOptions } from '@/components/shared/useContactOptions'
import AssetField from '@/editor/components/AssetField.vue'
import CommentsListField from '@/editor/components/CommentsListField.vue'
import EmojiPickerBtn from '@/components/shared/EmojiPickerBtn.vue'
import { insertEmojiAtCaret } from '@/components/shared/emojiInsert'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
defineProps({ entry: { type: Object, required: true } })
const { contactOptions, contactColor, contactLabel } = useContactOptions()
const contentInputRef = ref(null)
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
