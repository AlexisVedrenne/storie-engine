<template>
  <div class="entry-form">
    <p class="intro">{{ t('entries.timeskip.intro') }}</p>
    <div class="row">
      <q-input dense outlined :label="t('entries.timeskip.clockLabel')" placeholder="08:00" v-model="entry.clock" />
      <q-input dense outlined :label="t('entries.timeskip.dateLabel')" placeholder="19/07/2026" v-model="entry.date" />
    </div>
    <q-input
      dense
      outlined
      ref="labelInputRef"
      :label="t('entries.timeskip.labelLabel')"
      :placeholder="t('entries.timeskip.labelPlaceholder')"
      v-model="entry.label"
    >
      <template #append>
        <EmojiPickerBtn @pick="(e) => (entry.label = insertEmojiAtCaret(labelInputRef, entry.label, e))" />
      </template>
    </q-input>
    <div class="toggle-row">
      <q-toggle
        :model-value="entry.blocking !== false"
        :label="t('entries.timeskip.blockingLabel')"
        @update:model-value="(v) => (entry.blocking = v ? undefined : false)"
      />
      <FieldHelp :text="t('entries.timeskip.blockingHelp')" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import FieldHelp from '@/editor/components/FieldHelp.vue'
import EmojiPickerBtn from '@/components/shared/EmojiPickerBtn.vue'
import { insertEmojiAtCaret } from '@/components/shared/emojiInsert'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
defineProps({ entry: { type: Object, required: true } })
const labelInputRef = ref(null)
</script>

<style scoped>
.entry-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.intro {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.row {
  display: flex;
  gap: var(--space-3);
}

.toggle-row {
  display: flex;
  align-items: center;
}
</style>
