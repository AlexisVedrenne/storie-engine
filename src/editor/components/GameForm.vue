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
      <div class="panel-body">
        <q-toggle
          v-for="app in APP_REGISTRY"
          :key="app.id"
          dense
          :label="storyT(app.labelKey)"
          :model-value="!isAppDisabled(app.id)"
          @update:model-value="(v) => setAppEnabled(app.id, v)"
        />
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
import { APP_REGISTRY } from '@/engine/apps/registry'
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

.sound-row + .sound-row {
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border);
}
</style>
