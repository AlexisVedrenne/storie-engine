<template>
  <div class="thread-form">
    <div class="panel">
      <div class="section-label">
        {{ t('threadForm.title') }}
        <FieldHelp :text="t('threadForm.help')" />
      </div>
      <div class="row">
        <q-input dense outlined disabled label="Id" :model-value="thread.id" class="id-input" />
        <q-input
          dense
          outlined
          ref="nameInputRef"
          :label="t('threadList.groupNameLabel')"
          v-model="thread.name"
          class="grow"
        >
          <template #append>
            <EmojiPickerBtn
              @pick="(e) => (thread.name = insertEmojiAtCaret(nameInputRef, thread.name, e))"
            />
          </template>
        </q-input>
      </div>
      <q-select
        dense
        outlined
        multiple
        emit-value
        map-options
        :label="t('threadForm.participantsLabel')"
        :options="contactOptions"
        :model-value="thread.participants || []"
        @update:model-value="setParticipants"
      >
        <template #selected-item="scope">
          <q-chip
            dense
            :removable="scope.opt.value !== 'me'"
            @remove="removeParticipant(scope.opt.value)"
          >
            <span class="chip-dot" :style="{ background: contactColor(scope.opt.value) }" />
            {{ scope.opt.label }}
          </q-chip>
        </template>
      </q-select>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useContactOptions } from '@/components/shared/useContactOptions'
import FieldHelp from '@/editor/components/FieldHelp.vue'
import EmojiPickerBtn from '@/components/shared/EmojiPickerBtn.vue'
import { insertEmojiAtCaret } from '@/components/shared/emojiInsert'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
const props = defineProps({ thread: { type: Object, required: true } })
const { contactOptions, contactColor } = useContactOptions()
const nameInputRef = ref(null)

// 'me' must always be a participant (a visible group is always one the
// player is in, see docs/story-engine.md) — pre-included at creation and
// non-removable here rather than silently re-added, so it's never possible
// to end up with a saved group the player isn't part of.
function setParticipants(ids) {
  const set = new Set(ids)
  set.add('me')
  props.thread.participants = [...set]
}
function removeParticipant(id) {
  if (id === 'me') return
  props.thread.participants = (props.thread.participants || []).filter((p) => p !== id)
}
</script>

<style scoped>
.thread-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
}

.section-label {
  display: flex;
  align-items: center;
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.grow {
  flex: 1 1 160px;
}

.id-input {
  width: 160px;
  flex-shrink: 0;
  font-family: var(--font-mono);
}

.chip-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-right: var(--space-1);
}
</style>
