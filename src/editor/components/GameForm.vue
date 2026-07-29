<template>
  <div class="game-form">
    <q-expansion-item default-opened dense-toggle icon="title" label="Titre" class="panel">
      <div class="panel-body">
        <q-input dense outlined ref="titleInputRef" label="Titre (affiché sur l'écran verrouillé)" v-model="game.title">
          <template #append>
            <EmojiPickerBtn @pick="(e) => (game.title = insertEmojiAtCaret(titleInputRef, game.title, e))" />
          </template>
        </q-input>
      </div>
    </q-expansion-item>

    <q-expansion-item dense-toggle icon="apps" label="Icône du build" class="panel">
      <template #header>
        <q-item-section avatar><q-icon name="apps" /></q-item-section>
        <q-item-section>
          Icône du build
          <FieldHelp text="Icône du fichier .exe exporté. Format .ico recommandé pour l'icône Windows (Explorateur/barre des tâches) — un .png fonctionne aussi mais ne donnera que l'icône de la fenêtre pendant l'exécution, pas celle du fichier .exe lui-même." />
        </q-item-section>
      </template>
      <div class="panel-body">
        <AssetField v-model="game.icon" label="Icône (.ico recommandé, .png accepté)" />
      </div>
    </q-expansion-item>

    <q-expansion-item dense-toggle icon="wallpaper" label="Fond d'écran du téléphone" class="panel">
      <div class="panel-body">
        <AssetField v-model="game.wallpaper" label="Fond d'écran (verrouillage + accueil)" />
      </div>
    </q-expansion-item>

    <q-expansion-item dense-toggle icon="palette" class="panel">
      <template #header>
        <q-item-section avatar><q-icon name="palette" /></q-item-section>
        <q-item-section>
          Couleur d'interface
          <FieldHelp text="Recolore les éléments d'accent du téléphone (bulles de message envoyées, DM, égaliseur...). Laisse vide pour garder la couleur par défaut du moteur." />
        </q-item-section>
      </template>
      <div class="panel-body">
        <div class="swatch-box" :style="{ background: game.accentColor || '#4c8bf5' }">
          <q-popup-proxy cover transition-show="scale" transition-hide="scale">
            <q-color v-model="game.accentColor" default-value="#4c8bf5" no-header no-footer />
          </q-popup-proxy>
        </div>
        <div class="meta-row">
          <span class="filename">{{ game.accentColor || 'Par défaut (#4c8bf5)' }}</span>
          <q-btn v-if="game.accentColor" dense flat round icon="close" size="sm" @click="game.accentColor = undefined">
            <q-tooltip>Revenir à la couleur par défaut</q-tooltip>
          </q-btn>
        </div>
      </div>
    </q-expansion-item>

    <q-expansion-item dense-toggle icon="apps" class="panel">
      <template #header>
        <q-item-section avatar><q-icon name="apps" /></q-item-section>
        <q-item-section>
          Applications
          <FieldHelp text="Désactive une app du téléphone pour ce projet — elle disparaît de l'écran d'accueil et de l'animation de démarrage. Rien ne détecte automatiquement du contenu qui pointerait encore vers une app désactivée (ex: un SMS alors que Messages est coupé) — à l'auteur de vérifier." />
        </q-item-section>
      </template>
      <div class="panel-body">
        <q-toggle
          v-for="app in APP_REGISTRY"
          :key="app.id"
          dense
          :label="t(app.labelKey)"
          :model-value="!isAppDisabled(app.id)"
          @update:model-value="(v) => setAppEnabled(app.id, v)"
        />
      </div>
    </q-expansion-item>

    <q-expansion-item dense-toggle icon="volume_up" class="panel">
      <template #header>
        <q-item-section avatar><q-icon name="volume_up" /></q-item-section>
        <q-item-section>
          Sons
          <FieldHelp text="Remplace un son d'interface par défaut du moteur par un fichier audio du projet. Laisse vide pour garder le son par défaut." />
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
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AssetField from '@/editor/components/AssetField.vue'
import FieldHelp from '@/editor/components/FieldHelp.vue'
import EmojiPickerBtn from '@/editor/components/EmojiPickerBtn.vue'
import { insertEmojiAtCaret } from '@/editor/utils/emojiInsert'
import { SOUND_FILES } from '@/engine/utils/sound'
import { APP_REGISTRY } from '@/engine/apps/registry'

const props = defineProps({ game: { type: Object, required: true } })
const { t } = useI18n()
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
// project can add/remove entries from.
const SOUND_KEYS = [
  { key: 'sms-receive', label: 'Message reçu (SMS)' },
  { key: 'sms-send', label: 'Message envoyé (SMS)' },
  { key: 'dm-receive', label: 'DM Insta reçu' },
  { key: 'social-send', label: 'DM Insta envoyé' },
  { key: 'call-ringtone', label: "Sonnerie d'appel" },
  { key: 'call-accept', label: 'Appel décroché' },
  { key: 'call-end', label: 'Appel terminé' },
  { key: 'social-like', label: 'Like (Pixly)' },
  { key: 'social-new-follower', label: 'Nouvel abonné (Pixly)' },
  { key: 'social-story-tap', label: 'Story consultée (Pixly)' },
  { key: 'social-post-share', label: 'Publication partagée (Pixly)' },
  { key: 'system-boot', label: 'Démarrage du téléphone' },
  { key: 'system-unlock', label: 'Déverrouillage' },
  { key: 'system-notification', label: 'Notification' },
  { key: 'system-low-battery', label: 'Batterie faible' },
]
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
