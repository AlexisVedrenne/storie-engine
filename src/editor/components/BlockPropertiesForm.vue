<template>
  <div class="block-props">
    <template v-if="block.type === 'header'">
      <q-input dense outlined :label="t('blockProps.titleLabel')" v-model="block.title" />
      <q-input dense outlined :label="t('blockProps.iconLabel')" v-model="block.icon" />
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
      <q-input dense outlined type="textarea" autogrow :label="t('blockProps.contentLabel')" v-model="block.content" />
    </template>

    <template v-else-if="block.type === 'image'">
      <AssetField v-model="block.src" :label="t('blockProps.imageLabel')" />
    </template>

    <template v-else-if="block.type === 'avatar'">
      <q-input dense outlined :label="t('blockProps.labelLabel')" v-model="block.label" />
      <AssetField v-model="block.src" :label="t('blockProps.imageLabel')" />
      <q-input dense outlined :label="t('blockProps.iconFallbackLabel')" :hint="t('blockProps.iconFallbackHelp')" v-model="block.icon" />
      <ColorField v-model="block.color" />
    </template>

    <template v-else-if="block.type === 'row'">
      <q-input dense outlined :label="t('blockProps.iconLabel')" v-model="block.icon" />
      <q-input dense outlined :label="t('blockProps.labelLabel')" v-model="block.label" />
      <q-input dense outlined :label="t('blockProps.sublabelLabel')" v-model="block.sublabel" />
      <q-toggle dense :label="t('blockProps.chevronLabel')" v-model="block.chevron" />
    </template>

    <template v-else-if="block.type === 'card'">
      <p class="tab-help">{{ t('blockProps.cardHelp') }}</p>
      <BlockBuilder :blocks="ensureChildren()" :screens="screens" />
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
      <BlockBuilder :blocks="ensureChildren()" :screens="screens" />
    </template>

    <template v-else-if="block.type === 'badge'">
      <q-input dense outlined :label="t('blockProps.labelLabel')" v-model="block.label" />
      <ColorField v-model="block.color" />
    </template>

    <template v-else-if="block.type === 'button'">
      <q-input dense outlined :label="t('blockProps.labelLabel')" v-model="block.label" />
      <ColorField v-model="block.color" />
      <p class="tab-help">{{ t('blockProps.buttonHelp') }}</p>
    </template>

    <template v-else-if="block.type === 'tabs'">
      <div v-for="(tab, i) in ensureTabs()" :key="i" class="tab-row">
        <q-input dense outlined :label="t('blockProps.tabLabelLabel')" v-model="tab.label" class="grow" />
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
        <q-btn dense flat round icon="close" size="sm" color="negative" :disable="block.tabs.length <= 1" @click="removeTab(i)" />
      </div>
      <q-btn dense flat no-caps icon="add" :label="t('blockProps.addTab')" class="btn-ghost" @click="addTab" />
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import AssetField from '@/editor/components/AssetField.vue'
import ColorField from '@/editor/components/ColorField.vue'
// Circular with BlockBuilder.vue (a `card` block recurses into its own
// nested builder) — safe: Vue components only reference each other at
// render time, never during module top-level evaluation.
import BlockBuilder from '@/editor/components/BlockBuilder.vue'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()

const props = defineProps({
  block: { type: Object, required: true },
  // Every screen of the app being edited (id + display label) — populates
  // the `tabs` block's screen picker. Passed straight through unchanged
  // when this form recurses into a `card` block's own BlockBuilder.
  screens: { type: Array, default: () => [] },
})

function ensureChildren() {
  if (!props.block.blocks) props.block.blocks = []
  return props.block.blocks
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

const screenOptions = computed(() => props.screens.map((s) => ({ label: s.label || s.id, value: s.id })))
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

.grow {
  flex: 1;
}

.tab-help {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
</style>
