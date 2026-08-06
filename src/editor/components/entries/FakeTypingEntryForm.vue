<template>
  <div class="entry-form">
    <p class="intro">{{ t('entries.fakeTyping.intro') }}</p>

    <q-btn-toggle
      dense
      no-caps
      :model-value="entry.mode || 'sms'"
      :options="[
        { label: t('entries.fakeTyping.modeSms'), value: 'sms' },
        { label: t('entries.fakeTyping.modeDm'), value: 'dm' },
      ]"
      @update:model-value="(v) => (entry.mode = v)"
    />

    <q-select
      v-if="(entry.mode || 'sms') === 'sms'"
      dense
      outlined
      emit-value
      map-options
      :label="t('entries.fakeTyping.contactLabel')"
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

    <template v-else>
      <q-select
        dense
        outlined
        emit-value
        map-options
        :label="t('entries.fakeTyping.threadLabel')"
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
        :label="t('entries.fakeTyping.fromLabel')"
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
    </template>

    <q-input
      dense
      outlined
      type="number"
      :label="t('entries.fakeTyping.durationLabel')"
      suffix="ms"
      :model-value="entry.duration ?? 2000"
      @update:model-value="(v) => (entry.duration = v === null || v === '' ? 2000 : Number(v))"
    />
  </div>
</template>

<script setup>
import { useContactOptions } from '@/components/shared/useContactOptions'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
defineProps({ entry: { type: Object, required: true } })
const {
  contactOptionsNoMe: contactOptions,
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

.intro {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
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
