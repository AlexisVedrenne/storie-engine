<template>
  <div class="interaction-def-form">
    <div class="panel">
      <div class="section-label">{{ t('interactionDefForm.identityTitle') }}</div>
      <div class="row">
        <q-input dense outlined disabled label="Id" :model-value="def.id" class="id-input" />
        <q-input dense outlined :label="t('interactionDefForm.nameLabel')" v-model="def.name" class="grow" />
      </div>
    </div>

    <div class="panel">
      <div class="section-label">
        {{ t('interactionDefForm.backgroundTitle') }}
        <FieldHelp :text="t('interactionDefForm.backgroundHelp')" />
      </div>
      <AssetField v-model="def.background" :label="t('interactionDefForm.backgroundLabel')" />
    </div>

    <div class="panel">
      <div class="section-label">
        {{ t('interactionDefForm.stepsTitle') }}
        <FieldHelp :text="t('interactionDefForm.stepsHelp')" />
      </div>
      <InteractionStepsEditor :steps="ensureSteps()" />
    </div>
  </div>
</template>

<script setup>
import InteractionStepsEditor from '@/editor/components/InteractionStepsEditor.vue'
import AssetField from '@/editor/components/AssetField.vue'
import FieldHelp from '@/editor/components/FieldHelp.vue'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
const props = defineProps({ def: { type: Object, required: true } })

function ensureSteps() {
  if (!props.def.steps) props.def.steps = []
  return props.def.steps
}
</script>

<style scoped>
.interaction-def-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
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
  align-items: center;
  gap: var(--space-3);
}

.id-input {
  width: 160px;
  flex-shrink: 0;
}

.grow {
  flex: 1;
}
</style>
