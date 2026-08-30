<template>
  <div class="automation-form">
    <p class="intro">{{ t('automationForm.intro') }}</p>

    <q-input dense outlined :label="t('automationForm.labelLabel')" v-model="def.label" />

    <div class="prop-group-label">{{ t('automationForm.conditionTitle') }}</div>
    <RequiresBuilder :model-value="def.requires" @update:model-value="(v) => (def.requires = v)" />

    <div class="prop-group-label">{{ t('automationForm.actionTitle') }}</div>
    <BlockActionEditor
      :target="def"
      :screens="[]"
      :sheets="[]"
      :exclude-kinds="['navigateScreen', 'openSheet', 'closeSheet', 'requestInput', 'event']"
      :help-text="t('automationForm.actionHelp')"
    />

    <div class="prop-group-label">{{ t('automationForm.repeatTitle') }}</div>
    <p class="tab-help">{{ t('automationForm.repeatHelp') }}</p>
    <q-btn-toggle
      dense
      no-caps
      v-model="def.repeatMode"
      :options="[
        { label: t('automationForm.repeatOnce'), value: 'once' },
        { label: t('automationForm.repeatCount'), value: 'count' },
        { label: t('automationForm.repeatUnlimited'), value: 'unlimited' },
      ]"
    />
    <q-input
      v-if="def.repeatMode === 'count'"
      dense
      outlined
      type="number"
      :label="t('automationForm.repeatCountLabel')"
      :model-value="def.repeatCount ?? 1"
      @update:model-value="(v) => (def.repeatCount = v === null || v === '' ? 1 : Number(v))"
    />
  </div>
</template>

<script setup>
// One rule from game.automations[] — condition (RequiresBuilder, now also
// able to check entity-schema fields, not just flags) + action (the SAME
// fixed catalog a button offers, minus the app-screen-local kinds that need
// a CustomAppRenderer ancestor to inject() from — an automation can fire
// from anywhere, not just while a specific app screen is open) + how many
// times it's allowed to fire. See story.js's evaluateAutomations for the
// runtime side: fires on the condition's false->true transition, emits the
// fixed `automation.fired` engine trigger every time (reusable from the
// Events tab, same precedent as a button's own `button.pressed`).
import RequiresBuilder from '@/editor/components/RequiresBuilder.vue'
import BlockActionEditor from '@/editor/components/BlockActionEditor.vue'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
defineProps({ def: { type: Object, required: true } })
</script>

<style scoped>
.automation-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
}

.intro {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  margin: 0;
  line-height: 1.5;
}
</style>
