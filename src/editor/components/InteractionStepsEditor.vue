<template>
  <div class="steps-editor">
    <div v-if="!steps.length" class="empty-hint">{{ t('stepsEditor.empty') }}</div>

    <q-expansion-item
      v-for="(step, i) in steps"
      :key="i"
      v-model="expanded[i]"
      class="step-card"
    >
      <template #header>
        <q-item-section>{{ t('stepsEditor.stepHeader', { n: i + 1, kind: kindLabel(step.kind) }) }}</q-item-section>
        <q-item-section side>
          <div class="row-actions">
            <q-btn dense flat round icon="arrow_upward" size="sm" :disable="i === 0" @click.stop="move(i, -1)">
              <q-tooltip>{{ t('timelineEntryCard.moveUp') }}</q-tooltip>
            </q-btn>
            <q-btn dense flat round icon="arrow_downward" size="sm" :disable="i === steps.length - 1" @click.stop="move(i, 1)">
              <q-tooltip>{{ t('timelineEntryCard.moveDown') }}</q-tooltip>
            </q-btn>
            <q-btn dense flat round icon="close" size="sm" color="negative" @click.stop="remove(i)">
              <q-tooltip>{{ t('common.delete') }}</q-tooltip>
            </q-btn>
          </div>
        </q-item-section>
      </template>

      <div class="step-body">
        <q-select
          dense
          outlined
          emit-value
          map-options
          :label="t('stepsEditor.kindLabel')"
          :options="kindOptions"
          :model-value="step.kind"
          @update:model-value="(v) => changeKind(step, v)"
        />

        <q-input dense outlined :label="t('stepsEditor.textLabel')" v-model="step.text" />

        <AssetField v-model="step.image" :label="t('stepsEditor.imageLabel')" />

        <div class="row">
          <q-input
            dense
            outlined
            :label="t('stepsEditor.iconLabel')"
            :hint="t('stepsEditor.iconHelp')"
            v-model="step.icon"
            class="grow"
          />
          <q-input
            v-if="step.kind !== 'wait'"
            dense
            outlined
            type="number"
            :label="t('stepsEditor.timeLimitLabel')"
            :hint="t('stepsEditor.timeLimitHelp')"
            suffix="ms"
            :model-value="step.timeLimitMs ?? null"
            @update:model-value="(v) => (step.timeLimitMs = v === null || v === '' ? null : Number(v))"
            class="grow"
          />
        </div>

        <template v-if="fieldsForKind(step.kind).includes('zone')">
          <div class="field-label">{{ t('stepsEditor.zoneLabel') }}</div>
          <ZonePicker v-model="step.zone" />
        </template>

        <template v-if="fieldsForKind(step.kind).includes('from')">
          <div class="field-label">{{ t('stepsEditor.fromLabel') }}</div>
          <ZonePicker v-model="step.from" />
          <div class="field-label">{{ t('stepsEditor.toLabel') }}</div>
          <ZonePicker v-model="step.to" />
        </template>

        <template v-if="fieldsForKind(step.kind).includes('direction')">
          <div class="field-label">{{ t('stepsEditor.directionLabel') }}</div>
          <q-btn-toggle
            dense
            no-caps
            v-model="step.direction"
            :options="[
              { label: t('stepsEditor.directions.up'), value: 'up' },
              { label: t('stepsEditor.directions.down'), value: 'down' },
              { label: t('stepsEditor.directions.left'), value: 'left' },
              { label: t('stepsEditor.directions.right'), value: 'right' },
            ]"
          />
        </template>

        <q-input
          v-if="fieldsForKind(step.kind).includes('durationMs')"
          dense
          outlined
          type="number"
          :label="t('stepsEditor.durationLabel')"
          suffix="ms"
          v-model.number="step.durationMs"
        />

        <q-input
          v-if="fieldsForKind(step.kind).includes('digits')"
          dense
          outlined
          :label="t('stepsEditor.digitsLabel')"
          :hint="t('stepsEditor.digitsHelp')"
          v-model="step.digits"
        />
      </div>
    </q-expansion-item>

    <q-btn dense flat no-caps icon="add" :label="t('stepsEditor.addStep')" class="btn-ghost" @click="addStep" />
  </div>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { STEP_KIND_IDS, fieldsForKind, defaultStep } from '@/engine/interactions/stepKinds'
import ZonePicker from '@/editor/components/ZonePicker.vue'
import AssetField from '@/editor/components/AssetField.vue'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()

// `steps` is mutated in place — same convention as TimelineEditor's
// `entries` prop (the caller passes the real reactive array, chapter data
// or here an interaction definition's own `steps`).
const props = defineProps({ steps: { type: Array, required: true } })

const expanded = reactive({})

const kindOptions = computed(() => STEP_KIND_IDS.map((kind) => ({ label: kindLabel(kind), value: kind })))
function kindLabel(kind) {
  return t(`stepKinds.${kind}.label`)
}

function addStep() {
  props.steps.push(defaultStep('tap'))
  expanded[props.steps.length - 1] = true
}

function remove(i) {
  props.steps.splice(i, 1)
}

function move(i, dir) {
  const j = i + dir
  if (j < 0 || j >= props.steps.length) return
  const [item] = props.steps.splice(i, 1)
  props.steps.splice(j, 0, item)
}

// Switching kind resets to that kind's own default shape (text/icon are
// kept — everything else is kind-specific and wouldn't carry over
// meaningfully, e.g. a `direction` left over on a `tap` step).
function changeKind(step, kind) {
  const { text, icon, image } = step
  Object.assign(step, defaultStep(kind), { text, icon, image })
}
</script>

<style scoped>
.steps-editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.empty-hint {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  font-style: italic;
}

.step-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.row-actions {
  display: flex;
  align-items: center;
}

.step-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
}

.row {
  display: flex;
  gap: var(--space-2);
}

.grow {
  flex: 1;
}

.field-label {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  margin-top: var(--space-1);
}
</style>
