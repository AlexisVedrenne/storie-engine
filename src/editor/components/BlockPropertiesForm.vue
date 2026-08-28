<template>
  <div class="block-props">
    <template v-if="block.type === 'header'">
      <q-input
        dense
        outlined
        ref="titleInputRef"
        :label="t('blockProps.titleLabel')"
        v-model="block.title"
      >
        <template #append>
          <VariablePickerBtn
            :item-scope="itemScope"
            @pick="(v) => (block.title = insertEmojiAtCaret(titleInputRef, block.title, v))"
          />
        </template>
      </q-input>
      <q-input dense outlined :label="t('blockProps.iconLabel')" v-model="block.icon">
        <template #append>
          <IconPickerBtn @pick="(v) => (block.icon = v)" />
        </template>
      </q-input>
      <ColorField v-model="block.color" />
    </template>

    <template v-else-if="block.type === 'text'">
      <q-btn-toggle
        dense
        no-caps
        v-model="block.style"
        :options="[
          { label: t('blockProps.styleTitle'), value: 'title' },
          { label: t('blockProps.styleBody'), value: 'body' },
        ]"
      />
      <q-input
        dense
        outlined
        type="textarea"
        autogrow
        ref="contentInputRef"
        :label="t('blockProps.contentLabel')"
        v-model="block.content"
      >
        <template #append>
          <VariablePickerBtn
            :item-scope="itemScope"
            @pick="(v) => (block.content = insertEmojiAtCaret(contentInputRef, block.content, v))"
          />
        </template>
      </q-input>
      <div class="row">
        <ColorField
          v-model="block.color"
          :label="t('blockProps.textColorLabel')"
          default-value="#ffffff"
          class="grow"
        />
        <q-input
          dense
          outlined
          type="number"
          :label="t('blockProps.textSizeLabel')"
          :hint="t('blockProps.textSizeHelp')"
          suffix="px"
          :model-value="block.size ?? null"
          @update:model-value="(v) => (block.size = v === null || v === '' ? null : Number(v))"
          class="grow"
        />
      </div>
    </template>

    <template v-else-if="block.type === 'image'">
      <AssetField v-model="block.src" :label="t('blockProps.imageLabel')" />
      <q-toggle dense :label="t('blockProps.fullBleedLabel')" v-model="block.fullBleed" />
      <p class="tab-help">{{ t('blockProps.fullBleedHelp') }}</p>
    </template>

    <template v-else-if="block.type === 'avatar'">
      <q-input
        dense
        outlined
        ref="avatarLabelInputRef"
        :label="t('blockProps.labelLabel')"
        v-model="block.label"
      >
        <template #append>
          <VariablePickerBtn
            :item-scope="itemScope"
            @pick="(v) => (block.label = insertEmojiAtCaret(avatarLabelInputRef, block.label, v))"
          />
        </template>
      </q-input>
      <q-toggle
        v-if="itemScope === 'contacts'"
        dense
        :label="t('blockProps.useItemAvatarLabel')"
        v-model="block.useItemAvatar"
      />
      <AssetField
        v-if="!block.useItemAvatar || itemScope !== 'contacts'"
        v-model="block.src"
        :label="t('blockProps.imageLabel')"
      />
      <q-input
        dense
        outlined
        :label="t('blockProps.iconFallbackLabel')"
        :hint="t('blockProps.iconFallbackHelp')"
        v-model="block.icon"
      >
        <template #append>
          <IconPickerBtn @pick="(v) => (block.icon = v)" />
        </template>
      </q-input>
      <ColorField v-model="block.color" />
    </template>

    <template v-else-if="block.type === 'row'">
      <q-input dense outlined :label="t('blockProps.iconLabel')" v-model="block.icon">
        <template #append>
          <IconPickerBtn @pick="(v) => (block.icon = v)" />
        </template>
      </q-input>
      <ColorField
        v-model="block.iconColor"
        :label="t('blockProps.iconColorLabel')"
        default-value="#ffffff"
      />
      <q-input
        dense
        outlined
        ref="rowLabelInputRef"
        :label="t('blockProps.labelLabel')"
        v-model="block.label"
      >
        <template #append>
          <VariablePickerBtn
            :item-scope="itemScope"
            @pick="(v) => (block.label = insertEmojiAtCaret(rowLabelInputRef, block.label, v))"
          />
        </template>
      </q-input>
      <q-input
        dense
        outlined
        ref="rowSublabelInputRef"
        :label="t('blockProps.sublabelLabel')"
        v-model="block.sublabel"
      >
        <template #append>
          <VariablePickerBtn
            :item-scope="itemScope"
            @pick="
              (v) => (block.sublabel = insertEmojiAtCaret(rowSublabelInputRef, block.sublabel, v))
            "
          />
        </template>
      </q-input>
      <ColorField
        v-model="block.textColor"
        :label="t('blockProps.textColorLabel')"
        default-value="#ffffff"
      />
      <q-toggle dense :label="t('blockProps.chevronLabel')" v-model="block.chevron" />
    </template>

    <template v-else-if="block.type === 'card'">
      <p class="tab-help">{{ t('blockProps.cardHelp') }}</p>
      <ColorField
        v-model="block.bgColor"
        :label="t('blockProps.bgColorLabel')"
        default-value="#2a2e37"
        clearable
      />
      <BlockBuilder :blocks="ensureChildren()" :screens="screens" :item-scope="itemScope" />
    </template>

    <template v-else-if="block.type === 'layout'">
      <p class="tab-help">{{ t('blockProps.layoutHelp') }}</p>
      <q-btn-toggle
        dense
        no-caps
        v-model="block.direction"
        :options="[
          { label: t('blockProps.directionRow'), value: 'row' },
          { label: t('blockProps.directionColumn'), value: 'column' },
        ]"
      />
      <q-input
        dense
        outlined
        type="number"
        :label="t('blockProps.gapLabel')"
        suffix="px"
        :model-value="block.gap ?? 8"
        @update:model-value="(v) => (block.gap = v === null || v === '' ? 8 : Number(v))"
      />
      <ColorField
        v-model="block.bgColor"
        :label="t('blockProps.bgColorLabel')"
        default-value="#2a2e37"
        clearable
      />
      <BlockBuilder :blocks="ensureChildren()" :screens="screens" :item-scope="itemScope" />
    </template>

    <template v-else-if="block.type === 'badge'">
      <q-input
        dense
        outlined
        ref="badgeLabelInputRef"
        :label="t('blockProps.labelLabel')"
        v-model="block.label"
      >
        <template #append>
          <VariablePickerBtn
            :item-scope="itemScope"
            @pick="(v) => (block.label = insertEmojiAtCaret(badgeLabelInputRef, block.label, v))"
          />
        </template>
      </q-input>
      <div class="row">
        <ColorField v-model="block.color" class="grow" />
        <ColorField
          v-model="block.textColor"
          :label="t('blockProps.textColorLabel')"
          default-value="#ffffff"
          class="grow"
        />
      </div>
      <q-input
        dense
        outlined
        type="number"
        :label="t('blockProps.radiusLabel')"
        suffix="px"
        :model-value="block.radius ?? 999"
        @update:model-value="(v) => (block.radius = v === null || v === '' ? 999 : Number(v))"
      />
    </template>

    <template v-else-if="block.type === 'button'">
      <q-input
        dense
        outlined
        ref="buttonLabelInputRef"
        :label="t('blockProps.labelLabel')"
        v-model="block.label"
      >
        <template #append>
          <VariablePickerBtn
            :item-scope="itemScope"
            @pick="(v) => (block.label = insertEmojiAtCaret(buttonLabelInputRef, block.label, v))"
          />
        </template>
      </q-input>
      <div class="row">
        <ColorField v-model="block.color" class="grow" />
        <ColorField
          v-model="block.textColor"
          :label="t('blockProps.textColorLabel')"
          default-value="#ffffff"
          class="grow"
        />
      </div>
      <q-input
        dense
        outlined
        type="number"
        :label="t('blockProps.radiusLabel')"
        suffix="px"
        :model-value="block.radius ?? 12"
        @update:model-value="(v) => (block.radius = v === null || v === '' ? 12 : Number(v))"
      />
      <q-btn-toggle
        dense
        no-caps
        :model-value="ensureAction().type"
        :options="[
          { label: t('blockProps.actionNone'), value: 'none' },
          { label: t('blockProps.actionEffect'), value: 'effect' },
          { label: t('blockProps.actionNavigateScreen'), value: 'navigateScreen' },
          { label: t('blockProps.actionEvent'), value: 'event' },
          { label: t('blockProps.actionToast'), value: 'toast' },
        ]"
        @update:model-value="setButtonActionType"
      />
      <template v-if="block.action.type === 'effect'">
        <p class="tab-help">{{ t('blockProps.actionEffectHelp') }}</p>
        <EffectsBuilder
          :model-value="block.action.effects"
          @update:model-value="(v) => (block.action.effects = v)"
        />
      </template>
      <template v-else-if="block.action.type === 'navigateScreen'">
        <q-select
          dense
          outlined
          emit-value
          map-options
          :label="t('blockProps.actionNavigateScreenLabel')"
          :options="screenOptions"
          v-model="block.action.screenId"
        />
      </template>
      <template v-else-if="block.action.type === 'event'">
        <p class="tab-help">{{ t('blockProps.actionEventHelp') }}</p>
        <q-input
          dense
          outlined
          :label="t('blockProps.actionEventButtonIdLabel')"
          :hint="t('blockProps.actionEventButtonIdHint')"
          v-model="block.action.buttonId"
        />
      </template>
      <template v-else-if="block.action.type === 'toast'">
        <p class="tab-help">{{ t('blockProps.actionToastHelp') }}</p>
        <q-input
          dense
          outlined
          :label="t('blockProps.actionToastTextLabel')"
          v-model="block.action.toastText"
        />
      </template>
      <p v-else class="tab-help">{{ t('blockProps.buttonHelp') }}</p>

      <q-expansion-item
        v-if="block.action.type !== 'none'"
        dense
        :label="t('blockProps.actionGuardTitle')"
        class="spacing-section"
      >
        <div class="spacing-body condition-body">
          <p class="tab-help">{{ t('blockProps.actionGuardHelp') }}</p>
          <RequiresBuilder
            :model-value="block.action.requires"
            @update:model-value="(v) => (block.action.requires = v)"
          />
          <q-input
            dense
            outlined
            :label="t('blockProps.actionOnFailToastLabel')"
            :hint="t('blockProps.actionOnFailToastHint')"
            v-model="block.action.onFailToast"
          />
        </div>
      </q-expansion-item>
    </template>

    <template v-else-if="block.type === 'tabs'">
      <div v-for="(tab, i) in ensureTabs()" :key="i" class="tab-row">
        <q-input
          dense
          outlined
          :ref="(el) => (tabLabelRefs[i] = el)"
          :label="t('blockProps.tabLabelLabel')"
          v-model="tab.label"
          class="grow"
        >
          <template #append>
            <VariablePickerBtn
              :item-scope="itemScope"
              @pick="(v) => (tab.label = insertEmojiAtCaret(tabLabelRefs[i], tab.label, v))"
            />
          </template>
        </q-input>
        <q-select
          dense
          outlined
          emit-value
          map-options
          :label="t('blockProps.tabScreenLabel')"
          :options="screenOptions"
          v-model="tab.screenId"
          class="grow"
        />
        <q-btn
          dense
          flat
          round
          icon="close"
          size="sm"
          color="negative"
          :disable="block.tabs.length <= 1"
          @click="removeTab(i)"
        />
      </div>
      <q-btn
        dense
        flat
        no-caps
        icon="add"
        :label="t('blockProps.addTab')"
        class="btn-ghost"
        @click="addTab"
      />
    </template>

    <template v-else-if="block.type === 'list'">
      <q-btn-toggle
        dense
        no-caps
        :model-value="ensureSource()"
        :options="[
          { label: t('blockProps.listSourceContacts'), value: 'contacts' },
          { label: t('blockProps.listSourceCollection'), value: 'flagCollection' },
          { label: t('blockProps.listSourceEntity'), value: 'entity' },
        ]"
        @update:model-value="(v) => (block.source = v)"
      />
      <template v-if="ensureSource() === 'contacts'">
        <q-toggle dense :label="t('blockProps.onlyFollowedLabel')" v-model="block.onlyFollowed" />
        <p class="tab-help">{{ t('blockProps.listHelp') }}</p>
      </template>
      <template v-else-if="ensureSource() === 'flagCollection'">
        <FlagNameField v-model="block.flagKey" />
        <p class="tab-help">{{ t('blockProps.listCollectionHelp') }}</p>
      </template>
      <template v-else>
        <q-select
          dense
          outlined
          :label="t('blockProps.listSchemaLabel')"
          v-model="block.schemaId"
          :options="schemaOptions"
          emit-value
          map-options
        />
        <p class="tab-help">{{ t('blockProps.listEntityHelp') }}</p>
      </template>
      <BlockBuilder
        :blocks="ensureTemplate()"
        :screens="screens"
        :item-scope="templateItemScope()"
      />
    </template>

    <template v-else-if="block.type === 'conversations'">
      <p class="tab-help">{{ t('blockProps.conversationsHelp') }}</p>
      <q-toggle dense :label="t('blockProps.showAvatarLabel')" v-model="block.showAvatar" />
      <q-btn-toggle
        dense
        no-caps
        v-model="block.nameField"
        :options="[
          { label: t('blockProps.nameFieldName'), value: 'name' },
          { label: t('blockProps.nameFieldPseudo'), value: 'pseudo' },
        ]"
      />
    </template>

    <template v-else-if="block.type === 'schedule'">
      <p class="tab-help">{{ t('blockProps.scheduleHelp') }}</p>
      <q-select
        dense
        outlined
        :label="t('blockProps.listSchemaLabel')"
        v-model="block.schemaId"
        :options="schemaOptions"
        emit-value
        map-options
      />
      <q-select
        dense
        outlined
        :label="t('blockProps.scheduleFieldLabel')"
        :hint="t('blockProps.scheduleFieldHint')"
        v-model="block.fieldKey"
        :options="scheduleFieldOptions(block.schemaId)"
        emit-value
        map-options
      />
      <q-input
        dense
        outlined
        :label="t('blockProps.scheduleEntityIdLabel')"
        :hint="t('blockProps.scheduleEntityIdHint')"
        v-model="block.entityId"
      />
    </template>

    <template v-else-if="block.type === 'ledger'">
      <p class="tab-help">{{ t('blockProps.ledgerHelp') }}</p>
      <FlagNameField v-model="block.flagKey" />
    </template>

    <q-expansion-item
      dense
      :label="t('timelineEntryCard.displayCondition')"
      class="spacing-section"
    >
      <div class="spacing-body condition-body">
        <p class="tab-help">{{ t('timelineEntryCard.displayConditionHelp') }}</p>
        <RequiresBuilder
          :model-value="block.requires"
          @update:model-value="(v) => (block.requires = v)"
        />
      </div>
    </q-expansion-item>

    <q-expansion-item dense :label="t('blockProps.spacingTitle')" class="spacing-section">
      <div class="spacing-body">
        <q-input
          dense
          outlined
          type="number"
          :label="t('blockProps.spacingBeforeLabel')"
          suffix="px"
          :model-value="block.spacingBefore ?? null"
          @update:model-value="
            (v) => (block.spacingBefore = v === null || v === '' ? null : Number(v))
          "
          class="grow"
        />
        <q-input
          dense
          outlined
          type="number"
          :label="t('blockProps.spacingAfterLabel')"
          suffix="px"
          :model-value="block.spacingAfter ?? null"
          @update:model-value="
            (v) => (block.spacingAfter = v === null || v === '' ? null : Number(v))
          "
          class="grow"
        />
      </div>
    </q-expansion-item>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import AssetField from '@/editor/components/AssetField.vue'
import ColorField from '@/editor/components/ColorField.vue'
import RequiresBuilder from '@/editor/components/RequiresBuilder.vue'
import EffectsBuilder from '@/editor/components/EffectsBuilder.vue'
import VariablePickerBtn from '@/editor/components/VariablePickerBtn.vue'
import IconPickerBtn from '@/components/shared/IconPickerBtn.vue'
import FlagNameField from '@/editor/components/FlagNameField.vue'
import { insertEmojiAtCaret } from '@/components/shared/emojiInsert'
// Circular with BlockBuilder.vue (a `card` block recurses into its own
// nested builder) — safe: Vue components only reference each other at
// render time, never during module top-level evaluation.
import BlockBuilder from '@/editor/components/BlockBuilder.vue'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
const story = useStoryStore()

const props = defineProps({
  block: { type: Object, required: true },
  // Every screen of the app being edited (id + display label) — populates
  // the `tabs` block's screen picker. Passed straight through unchanged
  // when this form recurses into a `card` block's own BlockBuilder.
  screens: { type: Array, default: () => [] },
  // See BlockBuilder.vue's own prop — whether this block is inside a
  // `list` block's per-item template, so its VariablePickerBtn instances
  // also offer the `{item:...}` tokens.
  itemScope: { type: Boolean, default: false },
})

// One ref per text field that can take a {variable} — a bare template ref
// per role (not per block type), safe to reuse across the mutually
// exclusive v-if/v-else-if branches above since only one is ever mounted
// for a given block. `tabLabelRefs` is keyed by index instead, same
// per-row-ref-bag pattern ChoiceEntryForm.vue uses for its own options.
const titleInputRef = ref(null)
const contentInputRef = ref(null)
const avatarLabelInputRef = ref(null)
const rowLabelInputRef = ref(null)
const rowSublabelInputRef = ref(null)
const badgeLabelInputRef = ref(null)
const buttonLabelInputRef = ref(null)
const tabLabelRefs = {}

function ensureChildren() {
  if (!props.block.blocks) props.block.blocks = []
  return props.block.blocks
}

function ensureTemplate() {
  if (!props.block.template) props.block.template = []
  return props.block.template
}

// Lazy-inits `source` for a `list` block saved before this field existed —
// same "usage discovers it" fallback other ensure* helpers here use, keeps
// old projects working with zero migration.
function ensureSource() {
  if (!props.block.source) props.block.source = 'contacts'
  return props.block.source
}

// Schema catalog for the `entity` source's picker — authored in the Schémas
// tab (EntitySchemaList.vue), same "read what already exists, don't create
// it here" spirit as FlagNameField reading the flags catalog.
const schemaOptions = computed(
  () =>
    story.project?.gameConfig?.entitySchemas?.map((s) => ({
      label: s.label || s.id,
      value: s.id,
    })) || [],
)

// Field picker for a `schedule` block — only fields actually typed
// `schedule` on the chosen schema make sense here (see EntityFieldInput.vue,
// the only place that authors an array-of-slots value in the first place).
function scheduleFieldOptions(schemaId) {
  const schema = story.project?.gameConfig?.entitySchemas?.find((s) => s.id === schemaId)
  return (schema?.fields || [])
    .filter((f) => f.type === 'schedule')
    .map((f) => ({ label: f.label || f.key, value: f.key }))
}

// What to forward as the nested BlockBuilder's `itemScope` — plain source
// name for contacts/flagCollection (their token sets are fixed), but
// `entity:<schemaId>` for the entity source, since ITS token set depends on
// which schema was picked (see VariablePickerBtn.vue's own comment).
function templateItemScope() {
  const source = ensureSource()
  return source === 'entity' ? `entity:${props.block.schemaId || ''}` : source
}

function ensureAction() {
  if (!props.block.action) props.block.action = { type: 'none' }
  return props.block.action
}
// Switching kind replaces the action object wholesale (not just its
// `type`) — keeps stale fields from a previous kind (e.g. `effects` while
// now `navigateScreen`) from lingering unused in the saved block.
// `requires`/`onFailToast` are orthogonal to which kind is picked (a guard
// on TOP of whatever the action does), so they're carried over instead of
// wiped on every switch — except for 'none', which drops them: a purely
// decorative button has nothing for a condition to guard.
function setButtonActionType(type) {
  const prev = props.block.action || {}
  const base =
    type === 'none' ? { type } : { type, requires: prev.requires, onFailToast: prev.onFailToast }
  if (type === 'effect') props.block.action = { ...base, effects: prev.effects || {} }
  else if (type === 'navigateScreen')
    props.block.action = { ...base, screenId: prev.screenId || '' }
  else if (type === 'event') props.block.action = { ...base, buttonId: prev.buttonId || '' }
  else if (type === 'toast') props.block.action = { ...base, toastText: prev.toastText || '' }
  else props.block.action = { type: 'none' }
}

function ensureTabs() {
  if (!props.block.tabs?.length) props.block.tabs = [{ label: '', screenId: '' }]
  return props.block.tabs
}

function addTab() {
  ensureTabs().push({ label: '', screenId: '' })
}
function removeTab(i) {
  props.block.tabs.splice(i, 1)
}

const screenOptions = computed(() =>
  props.screens.map((s) => ({ label: s.label || s.id, value: s.id })),
)
</script>

<style scoped>
.block-props {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.tab-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.row {
  display: flex;
  gap: var(--space-2);
}

.grow {
  flex: 1;
}

.spacing-section {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  margin-top: var(--space-1);
}

.spacing-body {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-3);
}

.condition-body {
  flex-direction: column;
}

.tab-help {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
</style>
