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
      <div class="section-label">
        {{ t('customAppEditor.themeTitle') }}
        <FieldHelp :text="t('customAppEditor.themeHelp')" />
        <q-space />
        <q-btn
          dense
          flat
          no-caps
          icon="download"
          :label="t('customAppEditor.themeExport')"
          @click="exportTheme"
        >
          <q-tooltip>{{ t('customAppEditor.themeExportTooltip') }}</q-tooltip>
        </q-btn>
        <q-btn
          dense
          flat
          no-caps
          icon="upload"
          :label="t('customAppEditor.themeImport')"
          @click="importTheme"
        >
          <q-tooltip>{{ t('customAppEditor.themeImportTooltip') }}</q-tooltip>
        </q-btn>
      </div>
      <div class="theme-palette">
        <ColorField
          v-model="theme.palette.background"
          :label="t('customAppEditor.themeBackground')"
          default-value="transparent"
          clearable
        />
        <ColorField
          v-model="theme.palette.surface"
          :label="t('customAppEditor.themeSurface')"
          default-value="#2b2f36"
          clearable
        />
        <ColorField
          v-model="theme.palette.text"
          :label="t('customAppEditor.themeText')"
          default-value="#ffffff"
          clearable
        />
        <ColorField
          v-model="theme.palette.accent"
          :label="t('customAppEditor.themeAccent')"
          default-value="#4c8bf5"
          clearable
        />
        <ColorField
          v-model="theme.palette.danger"
          :label="t('customAppEditor.themeDanger')"
          default-value="#e05252"
          clearable
        />
      </div>
      <div class="row">
        <div class="theme-scale-field">
          <div class="theme-scale-label">{{ t('customAppEditor.themeFontLabel') }}</div>
          <q-btn-toggle
            dense
            no-caps
            v-model="theme.fontStack"
            :options="[
              { label: t('customAppEditor.themeFontSans'), value: 'sans' },
              { label: t('customAppEditor.themeFontSerif'), value: 'serif' },
              { label: t('customAppEditor.themeFontMono'), value: 'mono' },
              { label: t('customAppEditor.themeFontRounded'), value: 'rounded' },
            ]"
          />
        </div>
      </div>
      <div class="row">
        <div class="theme-scale-field">
          <div class="theme-scale-label">{{ t('customAppEditor.themeRadiusLabel') }}</div>
          <q-btn-toggle
            dense
            no-caps
            v-model="theme.radius"
            :options="[
              { label: t('customAppEditor.themeRadiusSharp'), value: 'sharp' },
              { label: t('customAppEditor.themeRadiusNormal'), value: 'normal' },
              { label: t('customAppEditor.themeRadiusRound'), value: 'round' },
            ]"
          />
        </div>
        <div class="theme-scale-field">
          <div class="theme-scale-label">{{ t('customAppEditor.themeSpacingLabel') }}</div>
          <q-btn-toggle
            dense
            no-caps
            v-model="theme.spacing"
            :options="[
              { label: t('customAppEditor.themeSpacingTight'), value: 'tight' },
              { label: t('customAppEditor.themeSpacingNormal'), value: 'normal' },
              { label: t('customAppEditor.themeSpacingLoose'), value: 'loose' },
            ]"
          />
        </div>
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
        <q-btn
          dense
          flat
          no-caps
          icon="smart_toy"
          :label="t('customAppEditor.testModeToggle')"
          :class="testModeOn ? 'btn-ghost test-mode-active' : 'btn-ghost'"
          @click="$emit('toggle-test-mode')"
        >
          <q-tooltip>{{ t('customAppEditor.testModeHelp') }}</q-tooltip>
        </q-btn>
      </div>

      <template v-if="currentScreen">
        <div class="section-label">
          {{ t('customAppEditor.screenBackgroundLabel') }}
          <FieldHelp :text="t('customAppEditor.screenBackgroundHelp')" />
        </div>
        <q-btn-toggle
          dense
          no-caps
          :model-value="currentScreen.backgroundType || 'image'"
          @update:model-value="(v) => (currentScreen.backgroundType = v)"
          :options="[
            { label: t('customAppEditor.backgroundTypeImage'), value: 'image' },
            { label: t('customAppEditor.backgroundTypeVideo'), value: 'video' },
          ]"
        />
        <AssetField
          v-model="currentScreen.background"
          :accept="currentScreen.backgroundType === 'video' ? 'video' : 'images'"
        />
        <q-input
          dense
          outlined
          type="number"
          :label="t('customAppEditor.backgroundOpacityLabel')"
          suffix="%"
          :model-value="currentScreen.backgroundOpacity ?? 100"
          @update:model-value="
            (v) =>
              (currentScreen.backgroundOpacity =
                v === null || v === '' ? 100 : Math.max(0, Math.min(100, Number(v))))
          "
        />
      </template>

      <BlockBuilder
        v-if="currentScreen"
        :blocks="ensureBlocks(currentScreen)"
        :screens="screenOptions"
        :sheets="sheetOptions"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, onUnmounted, provide, reactive, ref, watch } from 'vue'
import { Notify } from 'quasar'
import { usePhoneStore } from '@/engine/stores/phone'
import BlockBuilder from '@/editor/components/BlockBuilder.vue'
import { collectBlocksOfType } from '@/engine/customApps/appHasModule'
import AssetField from '@/editor/components/AssetField.vue'
import ColorField from '@/editor/components/ColorField.vue'
import FieldHelp from '@/editor/components/FieldHelp.vue'
import IconPickerBtn from '@/components/shared/IconPickerBtn.vue'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
const phone = usePhoneStore()
const props = defineProps({
  def: { type: Object, required: true },
  // Owned by EditorPage.vue (needs previewCustomApp()/story access this
  // component doesn't have) — this component only reflects the toggle's
  // state and asks for it to flip, see `toggleTestMode()`'s own comment
  // there for why turning it off is just another preview reset.
  testModeOn: { type: Boolean, default: false },
})
defineEmits(['toggle-test-mode'])

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

// Design tokens for this app — resolved into CSS custom properties by
// CustomAppRenderer.vue, read by every customApps/* block component (see
// its own comment for why no provide()/inject() is needed for this). Every
// sub-field defaults eagerly the moment this panel is opened (same
// "ensureX()" pattern as ensureFields()/ensureSeed() elsewhere in this
// file's siblings, e.g. EntitySchemaForm.vue) — harmless since the written
// default ('sans'/'normal'/'normal') is byte-identical to what an entirely
// absent `theme` already falls back to at runtime, it just gives the
// q-btn-toggle controls below a real selection to show instead of none.
function ensureTheme() {
  if (!props.def.theme) props.def.theme = {}
  const theme = props.def.theme
  if (!theme.palette) theme.palette = {}
  if (!theme.fontStack) theme.fontStack = 'sans'
  if (!theme.radius) theme.radius = 'normal'
  if (!theme.spacing) theme.spacing = 'normal'
  return theme
}
const theme = computed(() => ensureTheme())

// Theme presets (pilier 07) — export writes the CURRENT app's own theme to
// a plain `.json` file (no assets to bundle, see the IPC handler's own
// comment for why this isn't the app export/import .zip pipeline); import
// REPLACES this app's theme wholesale with whatever the picked file
// contains, same "wholesale replace, not a field-by-field merge" precedent
// as switching a button's action kind.
async function exportTheme() {
  try {
    const ok = await window.storieAPI.exportTheme({ theme: theme.value })
    if (ok) Notify.create({ type: 'positive', message: t('customAppEditor.themeExported') })
  } catch (err) {
    Notify.create({ type: 'negative', message: err.message || String(err) })
  }
}
async function importTheme() {
  try {
    const imported = await window.storieAPI.importTheme()
    if (!imported) return
    props.def.theme = imported
    Notify.create({ type: 'positive', message: t('customAppEditor.themeImported') })
  } catch (err) {
    Notify.create({ type: 'negative', message: err.message || String(err) })
  }
}

const screens = computed(() => props.def.screens || [])

const currentScreen = computed(
  () => screens.value.find((s) => s.id === activeScreenId.value) || screens.value[0],
)

// See phone.js's own comment on `editorActiveScreen` — keeps the live
// variable inspector (pilier 07) pointed at whichever screen this builder
// currently has open. Cleared on unmount so leaving the Apps tab doesn't
// leave a stale screen's variables lingering for whatever shows up in that
// same phone-preview slot next (a chapter, another app).
watch(currentScreen, (s) => (phone.editorActiveScreen = s || null), { immediate: true })
onUnmounted(() => {
  phone.editorActiveScreen = null
})

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

// Every `sheet` block anywhere in the app (any screen, any nesting depth) —
// a button's `openSheet` action picks a target from this, same "derived
// from what's actually authored" precedent as `screenOptions`. Label falls
// back to a placeholder rather than the raw id when the author hasn't named
// it yet, since an empty sheetId is genuinely ambiguous in a list of
// several.
const sheetOptions = computed(() =>
  screens.value
    .flatMap((s) => collectBlocksOfType(s.blocks, 'sheet'))
    .map((b) => ({ id: b.sheetId, label: b.sheetId || t('customAppEditor.sheetUnnamed') })),
)
</script>

<style scoped>
.custom-app-editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.test-mode-active {
  color: var(--color-primary, #4c8bf5);
  background: rgba(76, 139, 245, 0.12);
  border-radius: var(--radius-sm);
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

.theme-palette {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: var(--space-3);
}

.theme-scale-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.theme-scale-label {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
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
