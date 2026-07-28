<template>
  <div class="game-form">
    <div class="panel">
      <div class="section-label">Jeu</div>
      <q-input dense outlined label="Titre (affiché sur l'écran verrouillé)" v-model="game.title" />
    </div>

    <div class="panel">
      <div class="section-label">
        Icône du build
        <FieldHelp text="Icône du fichier .exe exporté. Format .ico recommandé pour l'icône Windows (Explorateur/barre des tâches) — un .png fonctionne aussi mais ne donnera que l'icône de la fenêtre pendant l'exécution, pas celle du fichier .exe lui-même." />
      </div>
      <AssetField v-model="game.icon" label="Icône (.ico recommandé, .png accepté)" />
    </div>

    <div class="panel">
      <div class="section-label">Fond d'écran du téléphone</div>
      <AssetField v-model="game.wallpaper" label="Fond d'écran (verrouillage + accueil)" />
    </div>

    <div class="panel">
      <div class="section-label">
        Couleur d'interface
        <FieldHelp text="Recolore les éléments d'accent du téléphone (bulles de message envoyées, DM, égaliseur...). Laisse vide pour garder la couleur par défaut du moteur." />
      </div>
      <q-input dense outlined clearable label="Couleur (hex)" placeholder="#4c8bf5" v-model="game.accentColor">
        <template #prepend>
          <div class="swatch" :style="{ background: game.accentColor || 'transparent' }">
            <q-popup-proxy cover transition-show="scale" transition-hide="scale">
              <q-color v-model="game.accentColor" default-value="#4c8bf5" no-header no-footer />
            </q-popup-proxy>
          </div>
        </template>
      </q-input>
    </div>

    <div class="panel">
      <div class="section-label">
        Sons
        <FieldHelp text="Remplace un son d'interface par défaut du moteur par un fichier audio du projet. Laisse vide pour garder le son par défaut." />
      </div>
      <div v-for="sound in SOUND_KEYS" :key="sound.key" class="sound-row">
        <!-- Default bundled sound + play button — shown until overridden;
             once game.sounds[key] is set, AssetField's own preview below
             already shows/plays THAT file, so this default player steps
             aside instead of duplicating a second <audio> control. -->
        <div v-if="!game.sounds[sound.key]" class="sound-current">
          <span class="sound-current-label">Son par défaut du moteur — {{ sound.label }}</span>
          <audio controls preload="none" :src="SOUND_FILES[sound.key]" class="audio-control" />
        </div>
        <AssetField v-model="game.sounds[sound.key]" :label="sound.label" />
      </div>
    </div>
  </div>
</template>

<script setup>
import AssetField from '@/editor/components/AssetField.vue'
import FieldHelp from '@/editor/components/FieldHelp.vue'
import { SOUND_FILES } from '@/engine/utils/sound'

const props = defineProps({ game: { type: Object, required: true } })

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
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
}

.section-label {
  display: flex;
  align-items: center;
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
}

.swatch {
  width: 18px;
  height: 18px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  cursor: pointer;
}

.sound-row + .sound-row {
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border);
}

.sound-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.sound-current {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-2);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.sound-current-label {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.audio-control {
  width: 100%;
  height: 32px;
}
</style>
