<template>
  <div class="end-screen">
    <template v-if="!showCredits">
      <img v-if="ending.image" :src="resolveAssetUrl(ending.image)" class="end-image" />
      <div v-else class="end-badge">🏁</div>
      <h1>{{ ending.title || t('endScreen.defaultTitle') }}</h1>
      <p v-if="ending.text">{{ ending.text }}</p>
      <div class="end-actions">
        <button class="primary-btn" @click="replay">{{ t('endScreen.replay') }}</button>
        <button v-if="hasSlots" class="secondary-btn" @click="toMenu">{{ t('endScreen.menu') }}</button>
        <button v-if="hasCredits" class="link-btn" @click="showCredits = true">
          {{ t('endScreen.credits') }}
        </button>
      </div>
    </template>

    <template v-else>
      <h1>{{ t('endScreen.creditsTitle') }}</h1>
      <p class="credits-text">{{ story.gameConfig?.credits }}</p>
      <button class="secondary-btn" @click="showCredits = false">{{ t('common.back') }}</button>
    </template>
  </div>
</template>

<script setup>
// Shown over the whole ready-phase screen once advance() runs out of a
// valid outgoing edge on the current chapter (see story.js's own comment on
// activeEnding) — a definitive "the story ends here" takeover, same
// full-coverage convention as HallucinationPlayer.vue (see its own z-index
// comment), just higher (nothing should ever show through this one).
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStoryStore } from '@/engine/stores/story'
import { usePhoneStore } from '@/engine/stores/phone'
import { resolveAssetUrl } from '@/engine/assets'

const story = useStoryStore()
const phone = usePhoneStore()
const { t } = useI18n()

const ending = computed(() => story.activeEnding || {})
const hasCredits = computed(() => !!story.gameConfig?.credits?.trim())
// window.storieGameSave only exists in a shipped game (see PhoneShell.vue's
// own identical check) — the editor's own live preview has no slot picker
// to go back to.
const hasSlots = computed(() => !!window.storieGameSave)
const showCredits = ref(false)

// "Rejouer" — same full reset Réglages' "Réinitialiser le téléphone" uses
// (story.resetSave(), see its own comment), replaying the setup wizard too
// rather than just rewinding the story. A lighter "keep my name, just
// restart the chapters" mode is a reasonable future ask, but this reuses an
// already-proven path for v1 instead of a new partial-reset mechanism.
function replay() {
  story.resetSave()
  phone.requestReboot()
}

function toMenu() {
  phone.requestReboot({ toSlotPicker: true })
}
</script>

<style scoped>
.end-screen {
  position: absolute;
  inset: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 32px 28px;
  overflow-y: auto;
  background: linear-gradient(180deg, #1f1a3a 0%, #0d0d17 100%);
  color: #fff;
  text-align: center;
}

.end-image {
  width: 100%;
  max-height: 200px;
  object-fit: cover;
  border-radius: 16px;
  margin-bottom: 8px;
}

.end-badge {
  width: 68px;
  height: 68px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  margin-bottom: 6px;
  background: var(--phone-accent-gradient, linear-gradient(135deg, #7b5cff, #f5576c));
}

h1 {
  font-size: 21px;
  font-weight: 800;
  margin: 0;
}

p {
  font-size: 13.5px;
  opacity: 0.75;
  line-height: 1.5;
  margin: 0;
}

.credits-text {
  white-space: pre-line;
  max-width: 280px;
}

.end-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  margin-top: 10px;
}

.primary-btn,
.secondary-btn {
  width: 100%;
  border: none;
  border-radius: 12px;
  font-weight: 700;
  font-size: 14px;
  padding: 12px 0;
  cursor: pointer;
  transition: transform 0.12s ease;
}

.primary-btn {
  background: var(--phone-accent-gradient, linear-gradient(135deg, #7b5cff, #f5576c));
  color: #fff;
}

.secondary-btn {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.primary-btn:active,
.secondary-btn:active {
  transform: scale(0.97);
}

.link-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  padding: 4px 0;
  cursor: pointer;
}
</style>
