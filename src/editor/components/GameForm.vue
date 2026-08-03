<template>
  <div class="game-form">
    <q-expansion-item default-opened dense-toggle icon="title" :label="t('gameForm.titleTitle')" class="panel">
      <div class="panel-body">
        <q-input dense outlined ref="titleInputRef" :label="t('gameForm.titleFieldLabel')" v-model="game.title">
          <template #append>
            <EmojiPickerBtn @pick="(e) => (game.title = insertEmojiAtCaret(titleInputRef, game.title, e))" />
          </template>
        </q-input>
      </div>
    </q-expansion-item>

    <q-expansion-item dense-toggle icon="apps" :label="t('gameForm.buildIconTitle')" class="panel">
      <template #header>
        <q-item-section avatar><q-icon name="apps" /></q-item-section>
        <q-item-section>
          {{ t('gameForm.buildIconTitle') }}
          <FieldHelp :text="t('gameForm.buildIconHelp')" />
        </q-item-section>
      </template>
      <div class="panel-body">
        <AssetField v-model="game.icon" :label="t('gameForm.buildIconLabel')" />
      </div>
    </q-expansion-item>

    <q-expansion-item dense-toggle icon="wallpaper" :label="t('gameForm.wallpaperTitle')" class="panel">
      <div class="panel-body">
        <AssetField v-model="game.wallpaper" :label="t('gameForm.wallpaperLabel')" />
        <AssetField v-model="game.lockWallpaper" :label="t('gameForm.lockWallpaperLabel')" />
      </div>
    </q-expansion-item>

    <q-expansion-item dense-toggle icon="palette" class="panel">
      <template #header>
        <q-item-section avatar><q-icon name="palette" /></q-item-section>
        <q-item-section>
          {{ t('gameForm.accentColorTitle') }}
          <FieldHelp :text="t('gameForm.accentColorHelp')" />
        </q-item-section>
      </template>
      <div class="panel-body">
        <div class="swatch-box" :style="{ background: game.accentColor || '#4c8bf5' }">
          <q-popup-proxy cover transition-show="scale" transition-hide="scale">
            <q-color v-model="game.accentColor" default-value="#4c8bf5" no-header no-footer />
          </q-popup-proxy>
        </div>
        <div class="meta-row">
          <span class="filename">{{ game.accentColor || t('gameForm.accentColorDefault') }}</span>
          <q-btn v-if="game.accentColor" dense flat round icon="close" size="sm" @click="game.accentColor = undefined">
            <q-tooltip>{{ t('contactForm.resetColor') }}</q-tooltip>
          </q-btn>
        </div>

        <div class="case-color-row">
          <span class="filename">{{ t('gameForm.caseColorLabel') }}</span>
          <FieldHelp :text="t('gameForm.caseColorHelp')" />
        </div>
        <div class="swatch-box" :style="{ background: game.caseColor || '#0b0b12' }">
          <q-popup-proxy cover transition-show="scale" transition-hide="scale">
            <q-color v-model="game.caseColor" default-value="#0b0b12" no-header no-footer />
          </q-popup-proxy>
        </div>
        <div class="meta-row">
          <span class="filename">{{ game.caseColor || t('gameForm.caseColorDefault') }}</span>
          <q-btn v-if="game.caseColor" dense flat round icon="close" size="sm" @click="game.caseColor = undefined">
            <q-tooltip>{{ t('contactForm.resetColor') }}</q-tooltip>
          </q-btn>
        </div>
      </div>
    </q-expansion-item>

    <q-expansion-item dense-toggle icon="phone_iphone" class="panel">
      <template #header>
        <q-item-section avatar><q-icon name="phone_iphone" /></q-item-section>
        <q-item-section>
          {{ t('gameForm.brandingTitle') }}
          <FieldHelp :text="t('gameForm.brandingHelp')" />
        </q-item-section>
      </template>
      <div class="panel-body">
        <q-input dense outlined :label="t('gameForm.osNameLabel')" v-model="game.osName" :placeholder="t('gameForm.osNameDefault')" />
        <q-input dense outlined :label="t('gameForm.socialAppNameLabel')" v-model="game.socialAppName" :placeholder="t('gameForm.socialAppNameDefault')" />
      </div>
    </q-expansion-item>

    <q-expansion-item dense-toggle icon="apps" class="panel">
      <template #header>
        <q-item-section avatar><q-icon name="apps" /></q-item-section>
        <q-item-section>
          {{ t('gameForm.appsTitle') }}
          <FieldHelp :text="t('gameForm.appsHelp')" />
        </q-item-section>
      </template>
      <div class="panel-body app-order-list" @dragover="onListDragOver" @drop="onDrop" @dragend="onDragEnd">
        <div
          v-for="(app, i) in orderedApps"
          :key="app.id"
          class="app-card"
          :class="{ dragging: dragIndex === i, disabled: isAppDisabled(app.id) }"
          draggable="true"
          @dragstart="onDragStart(i, $event)"
          @dragover="onRowDragOver(i, $event)"
          @drop="onDrop"
        >
          <div
            v-if="dropLine && dropLine.index === i && dropLine.edge === 'before'"
            class="drop-line"
          />
          <q-icon name="drag_indicator" size="20px" class="drag-handle" />
          <span class="app-chip" :style="{ background: app.iconImage ? 'transparent' : app.color }">
            <img v-if="app.iconImage" :src="app.iconImage" class="app-chip-img" alt="" />
            <q-icon v-else :name="app.icon" size="16px" color="white" />
          </span>
          <span class="app-card-label">{{ appLabel(app) }}</span>
          <q-toggle
            dense
            :model-value="!isAppDisabled(app.id)"
            @update:model-value="(v) => setAppEnabled(app.id, v)"
          />
          <div
            v-if="dropLine && dropLine.index === i && dropLine.edge === 'after'"
            class="drop-line"
          />
        </div>
      </div>
    </q-expansion-item>

    <q-expansion-item dense-toggle icon="volume_up" class="panel">
      <template #header>
        <q-item-section avatar><q-icon name="volume_up" /></q-item-section>
        <q-item-section>
          {{ t('gameForm.soundsTitle') }}
          <FieldHelp :text="t('gameForm.soundsHelp')" />
        </q-item-section>
      </template>
      <div class="panel-body">
        <!-- One AssetField per sound, no separate "default" block stacked
             next to it — fallback-audio-src makes it preview/play the
             engine default when there's no override, and the field's own
             label already names the sound once (docs/ui-design-principles.md). -->
        <AssetField
          v-for="sound in SOUND_KEYS"
          :key="sound.key"
          v-model="game.sounds[sound.key]"
          :label="sound.label"
          :fallback-audio-src="SOUND_FILES[sound.key]"
          class="sound-row"
        />
      </div>
    </q-expansion-item>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AssetField from '@/editor/components/AssetField.vue'
import FieldHelp from '@/editor/components/FieldHelp.vue'
import EmojiPickerBtn from '@/components/shared/EmojiPickerBtn.vue'
import { insertEmojiAtCaret } from '@/components/shared/emojiInsert'
import { SOUND_FILES } from '@/engine/utils/sound'
import { orderedAppList } from '@/engine/apps/appOrder'
import { useEditorI18n } from '@/editor/i18n'

const props = defineProps({ game: { type: Object, required: true } })
// Two different i18n systems — see EventList.vue's identical split.
const { t: storyT } = useI18n()
const { t } = useEditorI18n()
const titleInputRef = ref(null)

// `disabledApps` is an explicit opt-out list (same "absent = default"
// convention as contact.hasSocial/followedByDefault, see ContactForm.vue) —
// every project created before this feature existed keeps all 5 apps
// enabled with zero migration needed. Mirrored by story.js's
// enabledAppIds getter, which is what the phone shell actually reads.
function isAppDisabled(id) {
  return (props.game.disabledApps || []).includes(id)
}
function setAppEnabled(id, enabled) {
  const disabled = new Set(props.game.disabledApps || [])
  if (enabled) disabled.delete(id)
  else disabled.add(id)
  props.game.disabledApps = disabled.size ? [...disabled] : undefined
}

// `appOrder` is an explicit full id list, same "absent = default manifest
// order" convention as disabledApps — every project created before this
// feature existed keeps showing apps in their built-in order with zero
// migration needed. Mirrored by story.js's orderedApps getter, which is
// what the phone home screen / setup wizard actually read. A disabled app
// stays in this list (and stays draggable) so its position survives being
// re-enabled later instead of jumping back to the end.
const orderedApps = computed(() => orderedAppList(props.game.appOrder))

// Mirrors HomeScreen.vue's own social-app-name override so this list shows
// the name a player will actually see, not always the manifest default.
function appLabel(app) {
  if (app.id === 'social' && props.game.socialAppName) return props.game.socialAppName
  return storyT(app.labelKey)
}

// Same drag/drop shape as TimelineEditor.vue's own reorder (dragIndex +
// a dropLine recomputed from cursor-vs-row-midpoint on every dragover) —
// this list has no nesting/grouping to worry about, so it's the flat
// single-list subset of that pattern.
const dragIndex = ref(null)
const dropLine = ref(null)

function edgeFromEvent(ev) {
  const rect = ev.currentTarget.getBoundingClientRect()
  return ev.clientY - rect.top < rect.height / 2 ? 'before' : 'after'
}

function onDragStart(i, ev) {
  dragIndex.value = i
  ev.dataTransfer.effectAllowed = 'move'
}

function onRowDragOver(i, ev) {
  ev.preventDefault()
  if (dragIndex.value === null) return
  dropLine.value = { index: i, edge: edgeFromEvent(ev) }
}

// Root-level fallback for the gap between rows (a dragover/drop bound only
// on each row's own box leaves the small strip between two rows dead —
// same reasoning as TimelineEditor.vue's onRootDragOver) — just prevents
// the browser's "not allowed" cursor there; dropLine keeps whatever the
// last row-level dragover computed.
function onListDragOver(ev) {
  if (dragIndex.value !== null) ev.preventDefault()
}

function onDragEnd() {
  dragIndex.value = null
  dropLine.value = null
}

function onDrop(ev) {
  ev.preventDefault()
  const from = dragIndex.value
  const line = dropLine.value
  dragIndex.value = null
  dropLine.value = null
  if (from === null || !line) return

  const ids = orderedApps.value.map((a) => a.id)
  let to = line.index + (line.edge === 'after' ? 1 : 0)
  const [movedId] = ids.splice(from, 1)
  if (from < to) to--
  ids.splice(to, 0, movedId)
  props.game.appOrder = ids
}

// game.sounds is optional/absent on any project created before this
// feature — ensure it exists before the sound rows below bind into it,
// same "lazy-init before first bind" pattern as I18nBucketEditor.vue's
// ensureBucket().
if (!props.game.sounds) props.game.sounds = {}

// Matches sound.js's SOUND_FILES keys exactly — this is the full set of
// fixed UI-chrome sound effects a project can override, not a list a
// project can add/remove entries from. computed (not a plain const) so
// labels re-evaluate when the editor's own language switches.
const SOUND_KEYS = computed(() => [
  { key: 'sms-receive', label: t('gameForm.soundSmsReceive') },
  { key: 'sms-send', label: t('gameForm.soundSmsSend') },
  { key: 'dm-receive', label: t('gameForm.soundDmReceive') },
  { key: 'social-send', label: t('gameForm.soundDmSend') },
  { key: 'call-ringtone', label: t('gameForm.soundCallRingtone') },
  { key: 'call-accept', label: t('gameForm.soundCallAccept') },
  { key: 'call-end', label: t('gameForm.soundCallEnd') },
  { key: 'social-like', label: t('gameForm.soundLike') },
  { key: 'social-new-follower', label: t('gameForm.soundNewFollower') },
  { key: 'social-story-tap', label: t('gameForm.soundStoryTap') },
  { key: 'social-post-share', label: t('gameForm.soundPostShare') },
  { key: 'system-boot', label: t('gameForm.soundSystemBoot') },
  { key: 'system-unlock', label: t('gameForm.soundSystemUnlock') },
  { key: 'system-notification', label: t('gameForm.soundSystemNotification') },
  { key: 'system-low-battery', label: t('gameForm.soundLowBattery') },
])
</script>

<style scoped>
.game-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.panel-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3);
}

/* Same shape as AssetField.vue's own preview-box/meta-row (see
   docs/ui-design-principles.md) — big clickable preview, value as a small
   muted caption, actions as icon-only buttons, not a color-picker input
   with a tiny prepended chip. */
.swatch-box {
  width: 100%;
  height: 48px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  cursor: pointer;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.meta-row .filename {
  flex: 1;
  min-width: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.app-order-list {
  gap: var(--space-2);
}

.app-card {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
}

.app-card.disabled {
  opacity: 0.55;
}

.app-card.dragging {
  opacity: 0.4;
}

.drag-handle {
  color: var(--color-text-muted);
  cursor: grab;
  flex-shrink: 0;
}

.app-chip {
  width: 28px;
  height: 28px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.app-chip-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.app-card-label {
  flex: 1;
  min-width: 0;
  font-size: var(--text-sm);
  font-weight: 600;
}

.drop-line {
  height: 3px;
  margin: -1px 0;
  border-radius: 2px;
  background: var(--color-accent);
  flex-shrink: 0;
}

.sound-row + .sound-row {
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border);
}

.case-color-row {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  margin-top: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border);
  font-size: var(--text-sm);
  font-weight: 600;
}
</style>
