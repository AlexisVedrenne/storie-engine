<template>
  <div class="entry-form">
    <q-select
      dense
      outlined
      emit-value
      map-options
      :label="t('entries.appDm.appLabel')"
      :options="appOptions"
      v-model="entry.app"
    />
    <q-select
      dense
      outlined
      emit-value
      map-options
      :label="t('entries.appDm.threadLabel')"
      :options="threadOptions"
      v-model="entry.thread"
    >
      <template #selected>
        <span class="selected-row">
          <span
            v-if="!isGroupThread(entry.thread)"
            class="option-dot"
            :style="{ background: contactColor(entry.thread) }"
          />
          <q-icon v-else name="group" size="16px" class="option-icon" />
          {{ threadLabel(entry.thread) }}
        </span>
      </template>
      <template #option="scope">
        <q-item v-bind="scope.itemProps">
          <q-item-section avatar>
            <span
              v-if="!scope.opt.group"
              class="option-dot"
              :style="{ background: contactColor(scope.opt.value) }"
            />
            <q-icon v-else name="group" size="16px" class="option-icon" />
          </q-item-section>
          <q-item-section>{{ scope.opt.label }}</q-item-section>
        </q-item>
      </template>
    </q-select>
    <q-select
      dense
      outlined
      emit-value
      map-options
      :label="t('entries.appDm.fromLabel')"
      :options="fromOptions"
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
    <q-input
      dense
      outlined
      ref="textInputRef"
      type="textarea"
      autogrow
      :label="t('entries.appDm.textLabel')"
      :placeholder="t('entries.appDm.textPlaceholder')"
      v-model="entry.text"
    >
      <template #append>
        <EmojiPickerBtn
          @pick="(e) => (entry.text = insertEmojiAtCaret(textInputRef, entry.text, e))"
        />
      </template>
    </q-input>
    <AssetField
      v-model="entry.image"
      :label="t('entries.appDm.imageLabel')"
      :contact-id="entry.from"
    />
  </div>
</template>

<script setup>
// Mirrors DmEntryForm.vue's shape (thread/from/text/image) plus an `app`
// picker (which per-app message bucket, see story.js's appThreads). The
// thread picker itself IS DmEntryForm's own `threadOptions`/`isGroupThread`/
// `threadLabel` (project.threads + contacts, the Threads editor tab) — a
// group's id/name/participants are project-wide reference data, not
// something to re-author per app.
import { computed, ref } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import { useContactOptions } from '@/components/shared/useContactOptions'
import AssetField from '@/editor/components/AssetField.vue'
import EmojiPickerBtn from '@/components/shared/EmojiPickerBtn.vue'
import { insertEmojiAtCaret } from '@/components/shared/emojiInsert'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
defineProps({ entry: { type: Object, required: true } })
const story = useStoryStore()
const {
  contactOptions: fromOptions,
  threadOptions,
  contactColor,
  contactLabel,
  isGroupThread,
  threadLabel,
} = useContactOptions()
const textInputRef = ref(null)

const appOptions = computed(() =>
  (story.project?.customApps || []).map((a) => ({ label: a.label || a.id, value: a.id })),
)
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

.option-icon {
  margin-right: var(--space-1);
  color: var(--color-text-muted);
}
</style>
