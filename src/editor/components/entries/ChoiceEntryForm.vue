<template>
  <div class="entry-form">
    <div class="field-group">
      <div class="section-label">{{ t('entries.choice.replyTargetLabel') }}</div>
      <q-btn-toggle
        dense
        no-caps
        :model-value="target.mode"
        :options="targetModeOptions"
        @update:model-value="setMode"
      />
      <q-select
        v-if="target.mode === 'contact'"
        dense
        outlined
        emit-value
        map-options
        :label="t('entries.choice.contactLabel')"
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
      <q-select
        v-else-if="target.mode === 'thread' || target.mode.startsWith('app:')"
        dense
        outlined
        emit-value
        map-options
        :label="t('entries.choice.threadLabel')"
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
    </div>

    <q-input
      dense
      outlined
      ref="promptInputRef"
      :label="t('entries.choice.promptLabel')"
      :placeholder="t('entries.choice.promptPlaceholder')"
      v-model="entry.prompt"
    >
      <template #append>
        <EmojiPickerBtn
          @pick="(e) => (entry.prompt = insertEmojiAtCaret(promptInputRef, entry.prompt, e))"
        />
      </template>
    </q-input>

    <div class="section-title">
      {{ t('entries.choice.optionsTitle') }}
      <FieldHelp :text="t('entries.choice.optionsHelp')" />
    </div>
    <q-expansion-item
      v-for="(option, i) in entry.options"
      :key="i"
      v-model="expandedOptions[i]"
      class="option-card"
    >
      <template #header>
        <q-item-section>{{
          t('entries.choice.optionHeader', {
            n: i + 1,
            text: option.text ? ' — ' + option.text : t('entries.choice.optionEmpty'),
          })
        }}</q-item-section>
        <q-item-section side>
          <q-btn
            dense
            flat
            round
            icon="close"
            size="sm"
            color="negative"
            :disable="entry.options.length <= 1"
            @click.stop="removeOption(i)"
          >
            <q-tooltip>
              {{
                entry.options.length <= 1
                  ? t('entries.choice.needsOneOption')
                  : t('entries.choice.removeOption')
              }}
            </q-tooltip>
          </q-btn>
        </q-item-section>
      </template>

      <div class="option-body">
        <q-input
          dense
          outlined
          :ref="(el) => (optionTextRefs[i] = el)"
          :label="t('entries.choice.buttonTextLabel')"
          :placeholder="t('entries.choice.buttonTextPlaceholder')"
          v-model="option.text"
        >
          <template #append>
            <EmojiPickerBtn
              @pick="(e) => (option.text = insertEmojiAtCaret(optionTextRefs[i], option.text, e))"
            />
          </template>
        </q-input>

        <q-tabs
          :model-value="tabFor(i)"
          dense
          no-caps
          inline-label
          align="left"
          class="option-tabs"
          active-color="primary"
          indicator-color="primary"
          @update:model-value="(v) => (activeTabs[i] = v)"
        >
          <q-tab name="then" icon="arrow_forward" :label="t('entries.choice.tabThen')" />
          <q-tab name="effects" icon="bolt" :label="t('entries.choice.tabEffects')" />
          <q-tab name="requires" icon="rule" :label="t('entries.choice.tabRequires')" />
        </q-tabs>

        <q-tab-panels :model-value="tabFor(i)" animated class="option-panels">
          <q-tab-panel name="then" class="option-panel">
            <p class="tab-help">{{ t('entries.choice.tabThenHelp') }}</p>
            <TimelineEditor
              :entries="ensureThen(option)"
              :breadcrumb="[...breadcrumb, optionSegment(option, i)]"
            />
          </q-tab-panel>

          <q-tab-panel name="effects" class="option-panel">
            <p class="tab-help">{{ t('entries.choice.tabEffectsHelp') }}</p>
            <EffectsBuilder
              :model-value="option.effects"
              @update:model-value="(v) => (option.effects = v)"
            />
          </q-tab-panel>

          <q-tab-panel name="requires" class="option-panel">
            <p class="tab-help">{{ t('entries.choice.tabRequiresHelp') }}</p>
            <RequiresBuilder
              :model-value="option.requires"
              @update:model-value="(v) => (option.requires = v)"
            />
          </q-tab-panel>
        </q-tab-panels>
      </div>
    </q-expansion-item>
    <q-btn
      dense
      flat
      no-caps
      icon="add"
      :label="t('entries.choice.addOption')"
      class="btn-ghost"
      @click="addOption"
    />
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import { appHasBlockType } from '@/engine/customApps/appHasModule'
import { useContactOptions } from '@/components/shared/useContactOptions'
import RequiresBuilder from '@/editor/components/RequiresBuilder.vue'
import EffectsBuilder from '@/editor/components/EffectsBuilder.vue'
import TimelineEditor from '@/editor/components/TimelineEditor.vue'
import FieldHelp from '@/editor/components/FieldHelp.vue'
import EmojiPickerBtn from '@/components/shared/EmojiPickerBtn.vue'
import { insertEmojiAtCaret } from '@/components/shared/emojiInsert'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()

// `breadcrumb` — see docs/ui-ux-audit.md point 2 / TimelineEditor.vue's own
// prop of the same name. Forwarded here (not built by TimelineEditor
// itself) because TimelineEditor only knows about the choice ENTRY, not
// which option is being edited — this component owns that next segment.
const props = defineProps({
  entry: { type: Object, required: true },
  breadcrumb: { type: Array, default: () => [] },
})
const story = useStoryStore()
const {
  contactOptionsNoMe: contactOptions,
  threadOptions,
  contactColor,
  contactLabel,
  isGroupThread,
  threadLabel,
} = useContactOptions()

// "App conversation" target modes — one per custom app, real app name on
// the toggle button instead of a generic "App custom" pill (picking the
// button IS picking the app, composite value `app:<appId>`, split back
// apart in setMode below). The thread picker itself is the SAME
// `threadOptions`/`isGroupThread`/`threadLabel` the native "DM Pixly" mode
// already uses (project.threads + contacts) — a group's id/name/
// participants are project-wide reference data, not something to
// re-author per app (see the Threads editor tab).
// Only apps that actually place a `conversations` block — same reasoning
// as TimelineEditor.vue's own appDmOptions filter (see appHasBlockType).
const targetModeOptions = computed(() => [
  { label: 'SMS', value: 'contact' },
  { label: 'DM Pixly', value: 'thread' },
  ...(story.project?.customApps || [])
    .filter((a) => appHasBlockType(a, 'conversations'))
    .map((a) => ({
      label: a.label || a.id,
      value: `app:${a.id}`,
    })),
])

// Controls each option's q-expansion-item (previously uncontrolled) so a
// breadcrumb click can collapse it programmatically — see optionSegment()
// below.
const expandedOptions = reactive({})
const promptInputRef = ref(null)
// Plain object, not reactive() — just a per-index DOM ref bag for
// EmojiPickerBtn's caret insertion, same as promptInputRef but keyed by
// option index since v-for can't bind one static template ref per row.
const optionTextRefs = {}

function optionSegment(option, i) {
  return {
    label: t('entries.choice.optionHeader', {
      n: i + 1,
      text: option.text ? ' — ' + option.text : '',
    }),
    collapse: () => (expandedOptions[i] = false),
  }
}

const target = computed(() => ({
  mode: props.entry.app ? `app:${props.entry.app}` : props.entry.thread ? 'thread' : 'contact',
}))

function setMode(mode) {
  if (mode === 'contact') {
    props.entry.app = undefined
    props.entry.thread = undefined
    if (!props.entry.contact) props.entry.contact = contactOptions.value[0]?.value
  } else if (mode === 'thread') {
    props.entry.app = undefined
    props.entry.contact = undefined
    if (!props.entry.thread) props.entry.thread = threadOptions.value[0]?.value
  } else {
    props.entry.contact = undefined
    props.entry.app = mode.slice(4)
    if (!threadOptions.value.some((o) => o.value === props.entry.thread)) {
      props.entry.thread = threadOptions.value[0]?.value
    }
  }
}

function ensureThen(option) {
  if (!option.then) option.then = []
  return option.then
}

// Which tab is open per option — UI-only, kept out of `option` itself so it
// never gets written to disk (serializeChapter would otherwise persist it
// as story data). Defaults to "then" (see docs/phase2-plan.md follow-up):
// that's the section people actually reach for most, and it was easy to
// miss buried under Condition/Conséquences when everything was stacked.
const activeTabs = reactive({})
function tabFor(i) {
  return activeTabs[i] || 'then'
}

function addOption() {
  if (!props.entry.options) props.entry.options = []
  props.entry.options.push({ text: '', then: [] })
  expandedOptions[props.entry.options.length - 1] = true
}
function removeOption(i) {
  props.entry.options.splice(i, 1)
}
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
  margin: 0 0 var(--space-2);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  line-height: 1.5;
}
</style>
