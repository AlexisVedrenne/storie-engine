<template>
  <div class="entry-form">
    <q-select
      dense
      outlined
      emit-value
      map-options
      label="Conversation Instagram (1:1 ou groupe)"
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
      label="De (qui envoie le message)"
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
      type="textarea"
      autogrow
      label="Texte du message"
      placeholder="ex: Je préfère te le dire en privé 😉"
      v-model="entry.text"
    />
    <AssetField v-model="entry.image" label="Photo jointe (optionnel)" :contact-id="entry.from" />
  </div>
</template>

<script setup>
import { useContactOptions } from '@/editor/composables/useContactOptions'
import AssetField from '@/editor/components/AssetField.vue'

defineProps({ entry: { type: Object, required: true } })
const {
  contactOptions: fromOptions,
  threadOptions,
  contactColor,
  contactLabel,
  isGroupThread,
  threadLabel,
} = useContactOptions()
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
