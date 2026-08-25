<template>
  <div class="entry-form">
    <p class="intro">{{ t('entries.music.intro') }}</p>

    <q-btn-toggle
      dense
      no-caps
      :model-value="entry.mode || 'start'"
      :options="[
        { label: t('entries.music.modeStart'), value: 'start' },
        { label: t('entries.music.modeStop'), value: 'stop' },
      ]"
      @update:model-value="(v) => (entry.mode = v)"
    />

    <template v-if="entry.mode !== 'stop'">
      <AssetField
        :model-value="entry.track"
        :label="t('entries.music.trackLabel')"
        accept="audio"
        @update:model-value="(v) => (entry.track = v)"
      />
      <q-input
        dense
        outlined
        :label="t('entries.music.titleLabel')"
        :hint="t('entries.music.titleHelp')"
        :model-value="entry.title || ''"
        @update:model-value="(v) => (entry.title = v)"
      />
      <q-toggle
        dense
        :label="t('entries.music.loopLabel')"
        :model-value="entry.loop !== false"
        @update:model-value="(v) => (entry.loop = v)"
      />
      <div class="volume-field">
        <span class="field-label">{{ t('entries.music.volumeLabel') }} — {{ entry.volume ?? 100 }}%</span>
        <q-slider
          dense
          :min="0"
          :max="100"
          label
          :label-value="`${entry.volume ?? 100}%`"
          :model-value="entry.volume ?? 100"
          @update:model-value="(v) => (entry.volume = v)"
        />
        <p class="intro">{{ t('entries.music.volumeHelp') }}</p>
      </div>
    </template>
    <p v-else class="intro">{{ t('entries.music.stopHelp') }}</p>

    <q-input
      dense
      outlined
      type="number"
      step="0.1"
      min="0"
      clearable
      :label="t('entries.music.fadeLabel')"
      :hint="entry.mode === 'stop' ? t('entries.music.fadeStopHelp') : t('entries.music.fadeStartHelp')"
      suffix="s"
      :model-value="entry.fade != null ? entry.fade / 1000 : null"
      @update:model-value="
        (v) => (entry.fade = v === null || v === '' ? null : Math.round(Number(v) * 1000))
      "
    />
  </div>
</template>

<script setup>
import AssetField from '@/editor/components/AssetField.vue'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
defineProps({ entry: { type: Object, required: true } })
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

.volume-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.field-label {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
</style>
