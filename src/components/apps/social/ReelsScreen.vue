<template>
  <div class="reels-screen">
    <div class="reels-header">
      <button class="back-btn" :aria-label="t('social.reelsBackAria')" @click="$emit('back')">
        <q-icon name="chevron_left" size="26px" color="white" />
      </button>
      <span class="title">{{ t('social.reelsTitle') }}</span>
      <span class="spacer" />
    </div>

    <div v-if="!story.reels.length" class="empty">
      <q-icon name="theaters" size="46px" />
      <span>{{ t('social.reelsEmpty') }}</span>
    </div>
    <div v-else class="reel-feed">
      <div v-for="reel in story.reels" :key="reel.id" class="reel">
        <img :src="resolveAssetUrl(reel.media)" class="reel-media" />
        <div class="reel-overlay">
          <div class="reel-bottom">
            <div class="reel-author">{{ story.socialHandle(story.getContact(reel.author)) }}</div>
            <div v-if="reel.caption" class="reel-caption">{{ reel.caption }}</div>
            <div v-if="reel.music" class="reel-music">
              <q-icon name="music_note" size="13px" />
              <span>{{ reel.music }}</span>
            </div>
          </div>

          <div class="reel-actions">
            <button class="reel-action" :class="{ liked: story.likedPosts[reel.id] }" @click="story.toggleLike(reel.id)">
              <q-icon :name="story.likedPosts[reel.id] ? 'favorite' : 'favorite_border'" size="27px" />
              <span>{{ reel.likes + (story.likedPosts[reel.id] ? 1 : 0) }}</span>
            </button>
            <button class="reel-action" @click="openComments(reel.comments)">
              <q-icon name="chat_bubble_outline" size="25px" />
              <span>{{ reel.commentsCount ?? reel.comments.length }}</span>
            </button>
            <div class="reel-action">
              <q-icon name="send" size="23px" />
            </div>
            <div class="reel-action">
              <q-icon name="more_vert" size="22px" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <CommentsSheet v-model="commentsOpen" :comments="activeComments" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStoryStore } from '@/engine/stores/story'
import { resolveAssetUrl } from '@/engine/assets'
import CommentsSheet from './CommentsSheet.vue'

defineEmits(['back'])
const story = useStoryStore()
const { t } = useI18n()
const commentsOpen = ref(false)
const activeComments = ref([])

function openComments(comments) {
  activeComments.value = comments
  commentsOpen.value = true
}
</script>

<style scoped>
.reels-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #000;
  position: relative;
}

.reels-header {
  display: flex;
  align-items: center;
  padding: 10px 6px;
  color: #fff;
  font-weight: 600;
  font-size: 16px;
  flex-shrink: 0;
  z-index: 2;
  position: relative;
}

.back-btn {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  display: flex;
  padding: 2px;
  transition: transform 0.12s ease;
}

.back-btn:active {
  transform: scale(0.85);
}

.title {
  flex: 1;
  text-align: center;
  margin-right: 26px;
}

.spacer {
  width: 0;
}

.empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: rgba(255, 255, 255, 0.35);
  font-size: 13px;
}

.reel-feed {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  scroll-snap-type: y mandatory;
}

.reel {
  position: relative;
  height: 100%;
  scroll-snap-align: start;
  scroll-snap-stop: always;
  background: #111;
  display: flex;
  align-items: center;
  justify-content: center;
}

.reel-media {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.reel-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 16px 12px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.55), transparent 40%);
}

.reel-bottom {
  color: #fff;
  max-width: 78%;
}

.reel-author {
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 4px;
}

.reel-caption {
  font-size: 13px;
  line-height: 1.35;
  margin-bottom: 6px;
}

.reel-music {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  opacity: 0.85;
}

.reel-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  color: #fff;
}

.reel-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  background: none;
  border: none;
  color: inherit;
  font-size: 11px;
  cursor: pointer;
  transition: transform 0.12s ease;
}

.reel-action:active {
  transform: scale(0.85);
}

.reel-action.liked {
  color: #f5576c;
  animation: like-pop 0.3s cubic-bezier(0.34, 1.6, 0.64, 1);
}

@keyframes like-pop {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.3);
  }
  100% {
    transform: scale(1);
  }
}
</style>
