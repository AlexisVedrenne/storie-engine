<template>
  <div class="entry-form">
    <p class="intro">{{ t('entries.vfx.intro') }}</p>

    <q-btn-toggle
      dense
      no-caps
      :model-value="entry.mode || 'start'"
      :options="[
        { label: t('entries.vfx.modeStart'), value: 'start' },
        { label: t('entries.vfx.modeStop'), value: 'stop' },
      ]"
      @update:model-value="(v) => (entry.mode = v)"
    />

    <template v-if="entry.mode !== 'stop'">
      <q-select
        dense
        outlined
        emit-value
        map-options
        :label="t('entries.vfx.effectLabel')"
        :options="EFFECT_OPTIONS"
        :model-value="entry.effect || 'glitch'"
        @update:model-value="(v) => (entry.effect = v)"
      />
      <q-input
        dense
        outlined
        type="number"
        clearable
        :label="t('entries.vfx.durationLabel')"
        :hint="t('entries.vfx.durationHelp')"
        suffix="ms"
        :model-value="entry.duration ?? null"
        @update:model-value="(v) => (entry.duration = v === null || v === '' ? null : Number(v))"
      />
    </template>
    <p v-else class="intro">{{ t('entries.vfx.stopHelp') }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
defineProps({ entry: { type: Object, required: true } })

// order = roughly "subtle" to "extreme" — see PhoneShell.vue's
// .effect-* CSS for what each one actually renders.
const EFFECT_OPTIONS = computed(() => [
  { label: t('entries.vfx.kinds.glitch'), value: 'glitch' },
  { label: t('entries.vfx.kinds.static'), value: 'static' },
  { label: t('entries.vfx.kinds.corrupted'), value: 'corrupted' },
  { label: t('entries.vfx.kinds.shake'), value: 'shake' },
  { label: t('entries.vfx.kinds.crack'), value: 'crack' },
  { label: t('entries.vfx.kinds.blackout'), value: 'blackout' },
])
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
</style>
