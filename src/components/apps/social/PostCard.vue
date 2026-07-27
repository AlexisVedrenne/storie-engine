<template>
  <div class="post-card">
    <div class="post-header">
      <button class="post-header-main" @click="$emit('open-profile', post.author)">
        <AppAvatar :name="author.name" :color="author.color" :image="author.socialAvatar" :size="30" />
        <div class="author-name">{{ authorHandle }}</div>
      </button>
      <q-icon name="more_vert" size="18px" color="rgba(255,255,255,0.7)" />
    </div>

    <div v-if="post.image" class="image-wrap" @dblclick="doubleTapLike">
      <img :src="resolveAssetUrl(post.image)" class="post-image" :style="post.imageFilter ? { filter: post.imageFilter } : {}" />
      <transition name="heart-pop">
        <q-icon v-if="showHeart" name="favorite" size="80px" color="white" class="big-heart" />
      </transition>
    </div>

    <div class="post-actions">
      <button class="icon-btn" :class="{ liked }" @click="story.toggleLike(post.id)">
        <q-icon :name="liked ? 'favorite' : 'favorite_border'" size="24px" />
      </button>
      <button class="icon-btn" @click="$emit('open-comments', post.comments)">
        <q-icon name="chat_bubble_outline" size="23px" />
      </button>
      <div class="icon-btn">
        <q-icon name="send" size="21px" />
      </div>
      <div class="icon-btn bookmark">
        <q-icon name="bookmark_border" size="23px" />
      </div>
    </div>

    <div class="likes-count">{{ post.likes + (liked ? 1 : 0) }} {{ t('social.likes') }}</div>

    <div class="caption">
      <strong>{{ authorHandle }}</strong> {{ post.content }}
    </div>

    <button v-if="commentsCount" class="view-all" @click="$emit('open-comments', post.comments)">
      {{ t('social.viewComments', { n: commentsCount }) }}
    </button>

    <div class="post-ts">{{ post.ts }}</div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStoryStore } from '@/engine/stores/story'
import { resolveAssetUrl } from '@/engine/assets'
import AppAvatar from '@/components/phone/AppAvatar.vue'

const props = defineProps({ post: { type: Object, required: true } })
defineEmits(['open-profile', 'open-comments'])

const story = useStoryStore()
const { t } = useI18n()
const author = computed(() => story.getContact(props.post.author))
const authorHandle = computed(() => story.socialHandle(author.value))
// `commentsCount` lets a post advertise a comment count without a real
// comment object per count unit (see seed/posts.js) — falls back to the
// actual array length for posts written by hand with real comments.
const commentsCount = computed(() => props.post.commentsCount ?? props.post.comments.length)

// liked state is persisted in the store (see toggleLike) instead of a local
// ref, so it survives reloads and could later be read back via `requires`.
const liked = computed(() => !!story.likedPosts[props.post.id])

const showHeart = ref(null)
function doubleTapLike() {
  if (!liked.value) story.toggleLike(props.post.id)
  showHeart.value = true
  setTimeout(() => (showHeart.value = false), 650)
}
</script>

<style scoped>
.post-card {
  color: #fff;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 10px;
  margin-bottom: 4px;
  animation: post-in 0.3s cubic-bezier(0.34, 1.2, 0.64, 1) both;
}

@keyframes post-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.post-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
}

.post-header-main {
  display: flex;
  align-items: center;
  gap: 10px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  color: inherit;
  padding: 0;
  transition: opacity 0.12s ease;
}

.post-header-main:active {
  opacity: 0.6;
}

.author-name {
  font-weight: 600;
  font-size: 13px;
}

.post-ts {
  font-size: 11px;
  opacity: 0.45;
  padding: 0 12px;
  margin-top: 4px;
}

.image-wrap {
  position: relative;
}

.post-image {
  width: 100%;
  display: block;
}

.big-heart {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  filter: drop-shadow(0 2px 10px rgba(0, 0, 0, 0.4));
  pointer-events: none;
}

.heart-pop-enter-active {
  transition:
    opacity 0.25s ease,
    transform 0.35s cubic-bezier(0.34, 1.6, 0.64, 1);
}

.heart-pop-leave-active {
  transition: opacity 0.25s ease;
}

.heart-pop-enter-from {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.4);
}

.heart-pop-leave-to {
  opacity: 0;
}

.post-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 8px 12px 4px;
}

.icon-btn {
  display: flex;
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  padding: 0;
  transition: transform 0.12s ease;
}

.icon-btn:active {
  transform: scale(0.82);
}

.icon-btn.liked {
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

.icon-btn.bookmark {
  margin-left: auto;
}

.likes-count {
  font-weight: 600;
  font-size: 13px;
  padding: 0 12px;
  margin-bottom: 4px;
}

.caption {
  font-size: 13.5px;
  line-height: 1.4;
  padding: 0 12px;
}

.view-all {
  display: block;
  background: none;
  border: none;
  padding: 4px 12px 0;
  margin-top: 2px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 12.5px;
  cursor: pointer;
}
</style>
