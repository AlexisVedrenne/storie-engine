<template>
  <div class="entry-form">
    <p class="intro">{{ t('entries.hallucination.intro') }}</p>

    <div class="section-title">
      {{ t('entries.hallucination.messagesTitle') }}
      <FieldHelp :text="t('entries.hallucination.messagesHelp')" />
    </div>
    <div v-if="!messageRows.length" class="empty-hint">
      {{ t('entries.hallucination.noMessages') }}
    </div>
    <div v-for="(msg, i) in messageRows" :key="i" class="row">
      <span class="line-number">{{ i + 1 }}</span>
      <q-select
        dense
        outlined
        emit-value
        map-options
        class="from-select"
        :options="contactOptions"
        v-model="msg.from"
        @update:model-value="sync"
      >
        <template #selected>
          <span class="selected-row">
            <span class="option-dot" :style="{ background: contactColor(msg.from) }" />
            {{ contactLabel(msg.from) }}
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
        :ref="(el) => (msgTextRefs[i] = el)"
        class="text-input"
        :placeholder="t('entries.hallucination.messagePlaceholder')"
        v-model="msg.text"
        @update:model-value="sync"
      >
        <template #append>
          <EmojiPickerBtn
            @pick="
              (e) => {
                msg.text = insertEmojiAtCaret(msgTextRefs[i], msg.text, e)
                sync()
              }
            "
          />
        </template>
      </q-input>
      <q-btn dense flat round icon="close" size="sm" @click="removeMessage(i)">
        <q-tooltip>{{ t('entries.hallucination.removeMessage') }}</q-tooltip>
      </q-btn>
    </div>
    <q-btn
      dense
      flat
      no-caps
      icon="add"
      :label="t('entries.hallucination.addMessage')"
      class="btn-ghost"
      @click="addMessage"
    />

    <div class="row-effects">
      <q-select
        dense
        outlined
        emit-value
        map-options
        class="grow"
        :label="t('entries.hallucination.enterEffectLabel')"
        :options="effectOptions"
        :model-value="entry.enterEffect || 'glitch'"
        @update:model-value="(v) => (entry.enterEffect = v)"
      />
      <q-select
        dense
        outlined
        emit-value
        map-options
        class="grow"
        :label="t('entries.hallucination.exitEffectLabel')"
        :options="effectOptions"
        :model-value="entry.exitEffect || 'glitch'"
        @update:model-value="(v) => (entry.exitEffect = v)"
      />
    </div>

    <div class="toggle-row">
      <q-toggle
        :model-value="entry.blocking !== false"
        :label="t('entries.hallucination.blockingLabel')"
        @update:model-value="(v) => (entry.blocking = v ? undefined : false)"
      />
      <FieldHelp :text="t('entries.hallucination.blockingHelp')" />
    </div>
  </div>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { VFX_KINDS } from '@/engine/effects/vfxKinds'
import { useContactOptions } from '@/components/shared/useContactOptions'
import FieldHelp from '@/editor/components/FieldHelp.vue'
import EmojiPickerBtn from '@/components/shared/EmojiPickerBtn.vue'
import { insertEmojiAtCaret } from '@/components/shared/emojiInsert'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
const props = defineProps({ entry: { type: Object, required: true } })
const { contactOptions, contactColor, contactLabel } = useContactOptions()

// Same VFX_KINDS a `vfx` entry's own EFFECT_OPTIONS reads — a new kind
// added there shows up here too, no separate list to keep in sync.
const effectOptions = computed(() =>
  VFX_KINDS.map((kind) => ({ label: t(`entries.vfx.kinds.${kind}`), value: kind })),
)

// Same reactive-local-rows-plus-sync() shape as CallEntryForm.vue's own
// script editor — `messages` isn't a script (no per-line duration/blocking
// concept), just an ordered from/text list, but the add/remove UX is
// identical.
const messageRows = reactive((props.entry.messages || []).map((m) => reactive({ ...m })))
const msgTextRefs = {}

function addMessage() {
  messageRows.push(reactive({ from: 'me', text: '' }))
  sync()
}
function removeMessage(i) {
  messageRows.splice(i, 1)
  sync()
}
function sync() {
  props.entry.messages = messageRows.map((m) => ({ from: m.from, text: m.text }))
}
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

.row-effects {
  display: flex;
  gap: var(--space-3);
}

.grow {
  flex: 1;
}

.toggle-row {
  display: flex;
  align-items: center;
}
</style>
