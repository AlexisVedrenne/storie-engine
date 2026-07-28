<template>
  <div class="lock-screen" :class="{ 'has-wallpaper': wallpaperUrl }" :style="wallpaperStyle" @click="unlocking = true">
    <div class="wallpaper-title">{{ story.gameConfig.title }}</div>

    <transition name="skip-label">
      <div v-if="story.pendingTimeSkipLabel" class="skip-label">{{ story.pendingTimeSkipLabel }}</div>
    </transition>

    <div class="lock-time">{{ time }}</div>
    <div class="lock-date">{{ date }}</div>

    <div v-if="story.notifications.length" class="lock-notifs">
      <div v-for="n in story.notifications" :key="n.id" class="lock-notif">
        <span class="lock-notif-title">{{ n.title }}</span>
        <span class="lock-notif-text">{{ n.text }}</span>
      </div>
    </div>

    <div class="lock-hint" :class="{ pulse: !unlocking }">{{ t('common.unlockHint') }}</div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePhoneStore } from '@/engine/stores/phone'
import { useStoryStore } from '@/engine/stores/story'
import { playSound } from '@/engine/utils/sound'
import { resolveAssetUrl } from '@/engine/assets'

const phone = usePhoneStore()
const story = useStoryStore()
const { t } = useI18n()

// game.wallpaper (see GameForm.vue) — when set, replaces the default
// gradient+mesh look below (::before/::after get overridden to a plain
// readability scrim instead, see .has-wallpaper in <style>). Unset =
// pixel-identical to before this feature existed.
const wallpaperUrl = computed(() => (story.gameConfig?.wallpaper ? resolveAssetUrl(story.gameConfig.wallpaper) : ''))
const wallpaperStyle = computed(() =>
  wallpaperUrl.value ? { backgroundImage: `url(${wallpaperUrl.value})` } : {},
)

// story.resolvedClock() (driven by clockTime/clockDate, set via an `effect`
// — see applyEffects) combines the real device time with whichever piece
// a chapter has overridden.
const now = computed(() => story.resolvedClock())
const time = computed(() => now.value.toLocaleTimeString(story.activeLocale, { hour: '2-digit', minute: '2-digit' }))
const date = computed(() =>
  now.value.toLocaleDateString(story.activeLocale, { weekday: 'long', day: 'numeric', month: 'long' })
)

// small delay so the tap has a visible reaction before the unlock transition kicks in
const unlocking = ref(false)
watch(unlocking, val => {
  if (!val) return
  setTimeout(() => {
    playSound('system-unlock')
    phone.unlock()
    // no-op unless the timeline is actually parked on a `timeskip` entry
    story.continueAfterTimeSkip()
  }, 160)
})
</script>

<style scoped>
.lock-screen {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 60px;
  color: #fff;
  background: linear-gradient(180deg, #1f1a3a 0%, #0d0d17 100%);
  cursor: pointer;
  overflow: hidden;
  animation: lock-in 0.5s cubic-bezier(0.34, 1, 0.64, 1) both;
}

@keyframes lock-in {
  from {
    opacity: 0;
    transform: scale(1.04);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.lock-screen::before,
.lock-screen::after {
  content: '';
  position: absolute;
  inset: -20%;
  z-index: 0;
  pointer-events: none;
  filter: blur(60px);
  opacity: 0.75;
}

.lock-screen::before {
  background:
    radial-gradient(circle at 25% 20%, #7b5cff 0%, transparent 45%),
    radial-gradient(circle at 80% 15%, #ff6fb5 0%, transparent 40%),
    radial-gradient(circle at 70% 80%, #3ad0ff 0%, transparent 45%);
  animation: mesh-drift-1 22s ease-in-out infinite;
}

.lock-screen::after {
  background:
    radial-gradient(circle at 15% 75%, #ff9a5c 0%, transparent 40%),
    radial-gradient(circle at 60% 40%, #5c7bff 0%, transparent 45%);
  mix-blend-mode: screen;
  animation: mesh-drift-2 26s ease-in-out infinite;
}

@keyframes mesh-drift-1 {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(-4%, 5%) scale(1.08);
  }
}

@keyframes mesh-drift-2 {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(5%, -4%) scale(1.1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .lock-screen::before,
  .lock-screen::after {
    animation: none;
  }
}

/* game.wallpaper set — swap the decorative mesh for a plain readability
   scrim over the image instead (time/date/notifs stay legible regardless
   of the picture's own brightness) rather than stacking both looks. */
.lock-screen.has-wallpaper {
  background-size: cover;
  background-position: center;
}

.lock-screen.has-wallpaper::before {
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.55) 100%);
  animation: none;
}

.lock-screen.has-wallpaper::after {
  display: none;
}

/* the giant faint title watermark exists to fill the plain gradient when
   there's no wallpaper — redundant clutter once a real photo is showing */
.lock-screen.has-wallpaper .wallpaper-title {
  display: none;
}

.wallpaper-title {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0 16px;
  font-size: clamp(30px, 10vw, 50px);
  font-weight: 800;
  letter-spacing: 3px;
  line-height: 1.1;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.07);
  pointer-events: none;
  z-index: 0;
}

.skip-label {
  position: relative;
  z-index: 1;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  background: rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(6px);
  border-radius: 20px;
  padding: 6px 16px;
  margin-bottom: 14px;
}

.skip-label-enter-active {
  transition:
    opacity 0.35s ease,
    transform 0.35s cubic-bezier(0.34, 1.2, 0.64, 1);
}

.skip-label-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.lock-time {
  position: relative;
  z-index: 1;
  font-size: 64px;
  font-weight: 300;
  line-height: 1;
}

.lock-date {
  position: relative;
  z-index: 1;
  font-size: 15px;
  text-transform: capitalize;
  opacity: 0.8;
  margin-top: 6px;
}

.lock-notifs {
  position: relative;
  z-index: 1;
  margin-top: 36px;
  width: 85%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lock-notif {
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(6px);
  border-radius: 14px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  font-size: 13px;
}

.lock-notif-title {
  font-weight: 600;
}

.lock-notif-text {
  opacity: 0.85;
}

.lock-hint {
  position: relative;
  z-index: 1;
  margin-top: auto;
  margin-bottom: 28px;
  font-size: 12px;
  opacity: 0.6;
}

.lock-hint.pulse {
  animation: hint-pulse 2s ease-in-out infinite;
}

@keyframes hint-pulse {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.9;
  }
}
</style>
