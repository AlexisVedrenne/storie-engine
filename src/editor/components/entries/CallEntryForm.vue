<template>
  <div class="entry-form">
    <q-select
      dense
      outlined
      emit-value
      map-options
      :label="t('entries.call.contactLabel')"
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

    <div class="section-title">
      {{ t('entries.call.scriptTitle') }}
      <FieldHelp :text="t('entries.call.scriptHelp')" />
    </div>
    <div v-if="!scriptRows.length" class="empty-hint">
      {{ t('entries.call.noLines') }}
    </div>
    <div v-for="(line, i) in scriptRows" :key="i" class="row">
      <span class="line-number">{{ i + 1 }}</span>
      <q-select
        dense
        outlined
        emit-value
        map-options
        class="from-select"
        :options="fromOptions"
        v-model="line.from"
        @update:model-value="sync"
      >
        <template #selected>
          <span class="selected-row">
            <span class="option-dot" :style="{ background: contactColor(line.from) }" />
            {{ contactLabel(line.from) }}
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
        :ref="(el) => (lineTextRefs[i] = el)"
        class="text-input"
        :placeholder="t('entries.call.linePlaceholder')"
        v-model="line.text"
        @update:model-value="sync"
      >
        <template #append>
          <EmojiPickerBtn @pick="(e) => { line.text = insertEmojiAtCaret(lineTextRefs[i], line.text, e); sync() }" />
        </template>
      </q-input>
      <q-btn dense flat round icon="close" size="sm" @click="removeLine(i)">
        <q-tooltip>{{ t('entries.call.removeLine') }}</q-tooltip>
      </q-btn>
    </div>
    <q-btn
      dense
      flat
      no-caps
      icon="add"
      :label="t('entries.call.addLine')"
      class="btn-ghost"
      @click="addLine"
    />
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { useContactOptions } from '@/components/shared/useContactOptions'
import FieldHelp from '@/editor/components/FieldHelp.vue'
import EmojiPickerBtn from '@/components/shared/EmojiPickerBtn.vue'
import { insertEmojiAtCaret } from '@/components/shared/emojiInsert'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
const props = defineProps({ entry: { type: Object, required: true } })
const {
  contactOptions: contactOptionsAll,
  contactOptionsNoMe: contactOptions,
  contactColor,
  contactLabel,
} = useContactOptions()
const fromOptions = contactOptionsAll

const scriptRows = reactive((props.entry.script || []).map((l) => reactive({ ...l })))
// Plain object (not reactive) — per-row DOM ref bag for EmojiPickerBtn's
// caret insertion, keyed by row index since v-for can't bind one static
// template ref per line.
const lineTextRefs = {}

function addLine() {
  scriptRows.push(reactive({ from: 'me', text: '' }))
  sync()
}
function removeLine(i) {
  scriptRows.splice(i, 1)
  sync()
}
function sync() {
  props.entry.script = scriptRows.map((l) => ({ from: l.from, text: l.text }))
}
</script>

<style scoped>
.entry-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.section-title {
  display: flex;
  align-items: center;
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

.line-number {
  flex-shrink: 0;
  width: 18px;
  text-align: center;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.from-select {
  flex: 0 0 140px;
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
