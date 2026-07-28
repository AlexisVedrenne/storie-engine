<template>
  <div class="home-screen" :class="{ 'has-wallpaper': wallpaperUrl }" :style="wallpaperStyle">
    <div class="home-scroll">
      <HomeWidgets />

      <div class="app-grid">
        <button
          v-for="(app, i) in apps"
          :key="app.id"
          class="app-icon-btn"
          :style="{ animationDelay: `${i * 45}ms` }"
          @click="phone.openApp(app.id)"
        >
          <div class="app-icon" :style="{ background: app.color }">
            <q-icon :name="app.icon" size="28px" color="white" />
            <span v-if="app.badge" class="badge">{{ app.badge }}</span>
          </div>
          <span class="app-label">{{ app.label }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePhoneStore } from '@/engine/stores/phone'
import { useStoryStore } from '@/engine/stores/story'
import { resolveAssetUrl } from '@/engine/assets'
import HomeWidgets from './HomeWidgets.vue'

const phone = usePhoneStore()
const story = useStoryStore()
const { t } = useI18n()

// Same game.wallpaper convention as LockScreen.vue (kept independent, not
// extracted to a shared component — the two screens' mesh/scrim CSS
// already existed as separate copies before this addition).
const wallpaperUrl = computed(() => (story.gameConfig?.wallpaper ? resolveAssetUrl(story.gameConfig.wallpaper) : ''))
const wallpaperStyle = computed(() =>
  wallpaperUrl.value ? { backgroundImage: `url(${wallpaperUrl.value})` } : {},
)

const apps = computed(() => [
  {
    id: 'messages',
    label: t('home.apps.messages'),
    icon: 'sms',
    color: '#4caf50',
    badge: story.totalUnread || 0
  },
  {
    id: 'social',
    label: t('home.apps.social'),
    icon: 'photo_camera',
    color: 'linear-gradient(135deg,#f093fb,#f5576c)',
    badge: story.totalDmUnread || 0
  },
  {
    id: 'gallery',
    label: t('home.apps.gallery'),
    icon: 'image',
    color: 'linear-gradient(135deg,#ffb300,#f4511e,#8e24aa,#1e88e5)',
    badge: 0
  },
  {
    id: 'calls',
    label: t('home.apps.calls'),
    icon: 'call',
    color: '#8bc34a',
    badge: story.pendingCall ? 1 : 0
  },
  {
    id: 'settings',
    label: t('home.apps.settings'),
    icon: 'settings',
    color: '#8e8e93',
    badge: 0
  }
])
</script>

<style scoped>
.home-screen {
  position: relative;
  height: 100%;
  color: #fff;
  overflow: hidden;
  background: linear-gradient(180deg, #1f1a3a 0%, #0d0d17 100%);
}

.home-scroll {
  position: relative;
  z-index: 1;
  height: 100%;
  padding: 24px 18px;
  overflow-y: auto;
  overflow-x: hidden;
}

.home-screen::before,
.home-screen::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  filter: blur(60px);
  opacity: 0.55;
}

.home-screen::before {
  background:
    radial-gradient(circle at 20% 15%, #7b5cff 0%, transparent 45%),
    radial-gradient(circle at 85% 75%, #3ad0ff 0%, transparent 45%);
  animation: mesh-drift-1 22s ease-in-out infinite;
}

.home-screen::after {
  background:
    radial-gradient(circle at 75% 20%, #ff6fb5 0%, transparent 40%),
    radial-gradient(circle at 25% 85%, #ff9a5c 0%, transparent 40%);
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
  .home-screen::before,
  .home-screen::after {
    animation: none;
  }
}

.home-screen.has-wallpaper {
  background-size: cover;
  background-position: center;
}

.home-screen.has-wallpaper::before {
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.45) 100%);
  animation: none;
}

.home-screen.has-wallpaper::after {
  display: none;
}

.app-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px 10px;
}

.app-icon-btn {
  background: none;
  border: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 0;
  animation: icon-in 0.32s cubic-bezier(0.34, 1.4, 0.64, 1) both;
}

@keyframes icon-in {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.85);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.app-icon {
  position: relative;
  width: 54px;
  height: 54px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.12s ease;
}

.app-icon-btn:active .app-icon {
  transform: scale(0.88);
}

.badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: #f44336;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

.app-label {
  font-size: 11px;
  opacity: 0.9;
}
</style>
