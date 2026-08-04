<template>
  <div class="entry-form">
    <q-select
      dense
      outlined
      emit-value
      map-options
      :label="t('entries.interaction.pickLabel')"
      :options="interactionOptions"
      v-model="entry.interactionId"
    >
      <template #option="scope">
        <q-item v-bind="scope.itemProps">
          <q-item-section>
            <q-item-label>{{ scope.opt.label }}</q-item-label>
            <q-item-label caption>{{ scope.opt.caption }}</q-item-label>
          </q-item-section>
        </q-item>
      </template>
    </q-select>
    <p v-if="!interactionOptions.length" class="tab-help">{{ t('entries.interaction.noneAuthoredHelp') }}</p>

    <div class="field-group">
      <div class="section-label">{{ t('entries.interaction.blockingLabel') }}</div>
      <q-btn-toggle
        dense
        no-caps
        :model-value="entry.blocking !== false"
        :options="[
          { label: t('entries.interaction.blockingOn'), value: true },
          { label: t('entries.interaction.blockingOff'), value: false },
        ]"
        @update:model-value="(v) => (entry.blocking = v)"
      />
      <p class="tab-help">
        {{ entry.blocking !== false ? t('entries.interaction.blockingOnHelp') : t('entries.interaction.blockingOffHelp') }}
      </p>
    </div>

    <div class="section-title">{{ t('entries.interaction.branchesTitle') }}</div>

    <q-expansion-item v-model="expanded.win" class="option-card" :label="t('entries.interaction.winLabel')" icon="emoji_events">
      <div class="option-body">
        <q-tabs
          :model-value="tabFor('win')"
          dense
          no-caps
          inline-label
          align="left"
          class="option-tabs"
          active-color="primary"
          indicator-color="primary"
          @update:model-value="(v) => (activeTabs.win = v)"
        >
          <q-tab name="then" icon="arrow_forward" :label="t('entries.choice.tabThen')" />
          <q-tab name="effects" icon="bolt" :label="t('entries.choice.tabEffects')" />
        </q-tabs>
        <q-tab-panels :model-value="tabFor('win')" animated class="option-panels">
          <q-tab-panel name="then" class="option-panel">
            <TimelineEditor :entries="ensureThen(win)" :breadcrumb="[...breadcrumb, winSegment]" />
          </q-tab-panel>
          <q-tab-panel name="effects" class="option-panel">
            <EffectsBuilder :model-value="win.effects" @update:model-value="(v) => (win.effects = v)" />
          </q-tab-panel>
        </q-tab-panels>
      </div>
    </q-expansion-item>

    <q-expansion-item v-model="expanded.lose" class="option-card" :label="t('entries.interaction.loseLabel')" icon="cancel">
      <div class="option-body">
        <q-tabs
          :model-value="tabFor('lose')"
          dense
          no-caps
          inline-label
          align="left"
          class="option-tabs"
          active-color="primary"
          indicator-color="primary"
          @update:model-value="(v) => (activeTabs.lose = v)"
        >
          <q-tab name="then" icon="arrow_forward" :label="t('entries.choice.tabThen')" />
          <q-tab name="effects" icon="bolt" :label="t('entries.choice.tabEffects')" />
        </q-tabs>
        <q-tab-panels :model-value="tabFor('lose')" animated class="option-panels">
          <q-tab-panel name="then" class="option-panel">
            <TimelineEditor :entries="ensureThen(lose)" :breadcrumb="[...breadcrumb, loseSegment]" />
          </q-tab-panel>
          <q-tab-panel name="effects" class="option-panel">
            <EffectsBuilder :model-value="lose.effects" @update:model-value="(v) => (lose.effects = v)" />
          </q-tab-panel>
        </q-tab-panels>
      </div>
    </q-expansion-item>
  </div>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import EffectsBuilder from '@/editor/components/EffectsBuilder.vue'
import TimelineEditor from '@/editor/components/TimelineEditor.vue'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
const story = useStoryStore()

const props = defineProps({
  entry: { type: Object, required: true },
  breadcrumb: { type: Array, default: () => [] },
})

// Interactions are project data authored in the editor's own "Interactions"
// tab (game.interactions[], see InteractionDefList.vue/InteractionDefForm.vue)
// — this picker just references one by id, it doesn't define it.
const interactionOptions = computed(() =>
  (story.project?.gameConfig?.interactions || []).map((def) => ({
    label: def.name || def.id,
    value: def.id,
    caption: t('entries.interaction.stepsCount', { n: (def.steps || []).length }),
  })),
)

// `onWin`/`onLose` mirror a choice option's `{ effects, then }` shape —
// ensured here rather than in defaultEntry() so an entry authored before a
// field existed (or hand-edited) still works.
function ensureBranch(key) {
  if (!props.entry[key]) props.entry[key] = {}
  return props.entry[key]
}
const win = computed(() => ensureBranch('onWin'))
const lose = computed(() => ensureBranch('onLose'))

function ensureThen(branch) {
  if (!branch.then) branch.then = []
  return branch.then
}

const expanded = reactive({ win: true, lose: false })
const activeTabs = reactive({})
function tabFor(key) {
  return activeTabs[key] || 'then'
}

const winSegment = computed(() => ({ label: t('entries.interaction.winLabel'), collapse: () => (expanded.win = false) }))
const loseSegment = computed(() => ({ label: t('entries.interaction.loseLabel'), collapse: () => (expanded.lose = false) }))
</script>

<style scoped>
.entry-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.section-label {
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
  margin-top: var(--space-1);
}

.option-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.option-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
}

.option-tabs {
  border-bottom: 1px solid var(--color-border);
}

.option-panels {
  background: transparent;
}

.option-panel {
  padding: var(--space-3) 0 0;
}

.tab-help {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  line-height: 1.5;
}
</style>
