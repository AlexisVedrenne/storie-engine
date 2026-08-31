<template>
  <div class="custom-app-editor">
    <div class="panel">
      <div class="section-label">{{ t('customAppEditor.identityTitle') }}</div>
      <div class="row">
        <q-input dense outlined disabled label="Id" :model-value="def.id" class="id-input" />
        <q-input
          dense
          outlined
          :label="t('customAppEditor.labelLabel')"
          v-model="def.label"
          class="grow"
        />
      </div>
      <div class="row">
        <q-input
          dense
          outlined
          :label="t('customAppEditor.iconLabel')"
          :hint="t('customAppEditor.iconHelp')"
          v-model="def.icon"
          class="grow"
        >
          <template #append>
            <IconPickerBtn @pick="(v) => (def.icon = v)" />
          </template>
        </q-input>
        <ColorField v-model="def.color" />
      </div>
    </div>

    <div class="panel">
      <div class="section-label">{{ t('customAppEditor.screensTitle') }}</div>
      <q-tabs dense no-caps align="left" v-model="activeScreenId" class="screen-tabs">
        <q-tab
          v-for="screen in screens"
          :key="screen.id"
          :name="screen.id"
          :label="screen.label || screen.id"
        />
      </q-tabs>

      <div v-if="currentScreen" class="screen-toolbar">
        <q-input
          dense
          outlined
          :label="t('customAppEditor.screenLabelLabel')"
          v-model="currentScreen.label"
          class="grow"
        />
        <q-btn
          dense
          flat
          no-caps
          icon="add"
          :label="t('customAppEditor.addScreen')"
          class="btn-ghost"
          @click="addScreen"
        />
        <q-btn
          dense
          flat
          round
          icon="delete"
          size="sm"
          color="negative"
          :disable="screens.length <= 1"
          @click="removeScreen"
        >
          <q-tooltip>{{ t('common.delete') }}</q-tooltip>
        </q-btn>
      </div>

      <AssetField
        v-if="currentScreen"
        v-model="currentScreen.background"
        :label="t('customAppEditor.screenBackgroundLabel')"
      />

      <BlockBuilder
        v-if="currentScreen"
        :blocks="ensureBlocks(currentScreen)"
        :screens="screenOptions"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, provide, reactive, ref, watch } from 'vue'
import BlockBuilder from '@/editor/components/BlockBuilder.vue'
import AssetField from '@/editor/components/AssetField.vue'
import ColorField from '@/editor/components/ColorField.vue'
import IconPickerBtn from '@/components/shared/IconPickerBtn.vue'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
const props = defineProps({ def: { type: Object, required: true } })

// Shared by every BlockBuilder instance on screen (the top-level one plus
// one per nested card/layout) so a block can be dragged INTO or OUT OF a
// container, not just reordered within whichever one it started in — see
// BlockBuilder.vue's own comment on this.
provide(
  'blockDragState',
  reactive({ kind: null, sourceArray: null, sourceIndex: null, draggedBlock: null }),
)

const activeScreenId = ref(null)

// Ensured via a watcher (not inside the `screens` computed below, which
// must stay side-effect-free) — this component's instance is reused across
// app selections (EditorPage.vue swaps `def`, no v-if key), so a
// freshly-created app with no screens yet needs this to run again every
// time `def` itself changes, not just on first mount.
watch(
  () => props.def,
  (def) => {
    if (!def.screens?.length) def.screens = [{ id: 'home', label: '', blocks: [] }]
    activeScreenId.value = def.screens[0].id
  },
  { immediate: true },
)

const screens = computed(() => props.def.screens || [])

const currentScreen = computed(
  () => screens.value.find((s) => s.id === activeScreenId.value) || screens.value[0],
)

function ensureBlocks(screen) {
  if (!screen.blocks) screen.blocks = []
  return screen.blocks
}

function addScreen() {
  let n = screens.value.length + 1
  while (screens.value.some((s) => s.id === `screen-${n}`)) n += 1
  const id = `screen-${n}`
  screens.value.push({ id, label: '', blocks: [] })
  activeScreenId.value = id
}

function removeScreen() {
  if (screens.value.length <= 1) return
  const idx = screens.value.findIndex((s) => s.id === activeScreenId.value)
  if (idx === -1) return
  screens.value.splice(idx, 1)
  activeScreenId.value = screens.value[0].id
}

// `tabs` blocks (anywhere, including nested inside cards) pick a target
// screen from this — id + display label, kept in sync with the app's own
// screens automatically since it's derived, not hand-maintained.
const screenOptions = computed(() =>
  screens.value.map((s) => ({ id: s.id, label: s.label || s.id })),
)
</script>

<style scoped>
.custom-app-editor {
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
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
}

.row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.id-input {
  width: 160px;
  flex-shrink: 0;
}

.grow {
  flex: 1 1 160px;
}

.screen-tabs {
  border-bottom: 1px solid var(--color-border);
}

.screen-toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
</style>
