<template>
  <div class="app-screen">
    <AppTitleBar
      :title="t('gallery.title')"
      icon="image"
      color="linear-gradient(135deg,#ffb300,#f4511e,#8e24aa,#1e88e5)"
      :subtitle="selected ? '' : photoCountLabel"
      @back="selected ? (selected = null) : phone.goHome()"
    />

    <transition name="viewer-swap" mode="out-in">
      <div v-if="!selected" key="grid" class="grid" :class="{ 'grid-empty': !story.photos.length }">
        <div v-if="!story.photos.length" class="empty">
          <q-icon name="image" size="46px" />
          <span>{{ t('gallery.empty') }}</span>
        </div>
        <button
          v-for="(p, i) in story.photos"
          :key="p.id"
          class="thumb"
          :style="{ animationDelay: `${i * 30}ms` }"
          @click="selected = p"
        >
          <img :src="resolveAssetUrl(p.url)" />
        </button>
      </div>

      <div v-else key="viewer" class="viewer" @click="selected = null">
        <img :src="resolveAssetUrl(selected.url)" class="full-img" />
        <div v-if="selected.caption" class="caption">{{ selected.caption }}</div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePhoneStore } from '@/engine/stores/phone'
import { useStoryStore } from '@/engine/stores/story'
import { resolveAssetUrl } from '@/engine/assets'
import AppTitleBar from '@/components/phone/AppTitleBar.vue'

const phone = usePhoneStore()
const story = useStoryStore()
const { t } = useI18n()
const selected = ref(null)

const photoCountLabel = computed(() => {
  const n = story.photos.length
  return n === 0 ? '' : n === 1 ? t('gallery.photoCountOne') : t('gallery.photoCountOther', { n })
})
</script>

<style scoped>
.app-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.grid {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
  padding: 2px;
}

.grid-empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  color: rgba(255, 255, 255, 0.35);
  font-size: 13px;
  text-align: center;
}

.thumb {
  border: none;
  padding: 0;
  cursor: pointer;
  aspect-ratio: 1;
  overflow: hidden;
  transition: transform 0.12s ease;
  animation: thumb-in 0.24s cubic-bezier(0.34, 1.2, 0.64, 1) both;
}

.thumb:active {
  transform: scale(0.94);
}

@keyframes thumb-in {
  from {
    opacity: 0;
    transform: scale(0.85);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.viewer-swap-enter-active,
.viewer-swap-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.2s ease;
}

.viewer-swap-enter-from,
.viewer-swap-leave-to {
  opacity: 0;
  transform: scale(0.97);
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.viewer {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #000;
  cursor: pointer;
}

.full-img {
  max-width: 100%;
  max-height: 85%;
  object-fit: contain;
}

.caption {
  color: #fff;
  font-size: 13px;
  opacity: 0.8;
  margin-top: 10px;
}
</style>
