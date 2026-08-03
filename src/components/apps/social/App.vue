<template>
  <div class="app-screen">
    <transition name="screen-swap" mode="out-in">
      <!-- top-level feed/explore, only shown while no sub-screen is open -->
      <div v-if="!screen" key="home" class="home-stack">
        <div class="pixly-header">
          <span class="brand">{{ story.gameConfig?.socialAppName || 'Pixly' }}</span>
          <div class="header-actions">
            <button class="dm-icon" :aria-label="t('social.dmAria')" @click="screen = 'dmList'">
              <q-icon name="send" size="20px" color="white" />
              <span v-if="story.totalDmUnread" class="dm-badge">{{ story.totalDmUnread }}</span>
            </button>
            <button class="back-icon" :aria-label="t('social.exitAria')" @click="phone.goHome()">
              <q-icon name="chevron_left" size="26px" color="white" />
            </button>
          </div>
        </div>

        <StoriesBar @open="viewingStory = $event" />

        <transition name="tab-fade" mode="out-in">
          <div v-if="tab === 'feed'" key="feed" class="feed">
            <div v-if="!story.visibleFeedPosts.length" class="empty">
              <q-icon name="photo_camera" size="46px" />
              <span>{{ t('social.feedEmpty') }}</span>
            </div>
            <PostCard
              v-for="post in story.visibleFeedPosts"
              :key="post.id"
              :post="post"
              @open-profile="openProfile"
              @open-comments="openComments"
            />
          </div>
          <div v-else key="explore" class="explore-wrap">
            <ExploreGrid @open-profile="openProfile" />
          </div>
        </transition>

        <div class="bottom-nav">
          <button
            class="nav-btn"
            :class="{ active: tab === 'feed' }"
            :aria-label="t('social.feedAria')"
            @click="tab = 'feed'"
          >
            <q-icon name="home" size="25px" />
          </button>
          <button
            class="nav-btn"
            :class="{ active: tab === 'explore' }"
            :aria-label="t('social.discoverAria')"
            @click="tab = 'explore'"
          >
            <q-icon name="search" size="25px" />
          </button>
          <button
            class="nav-btn"
            :aria-label="t('social.createAria')"
            @click="screen = 'createPost'"
          >
            <q-icon name="add_box" size="25px" />
          </button>
          <button class="nav-btn" :aria-label="t('social.reelsAria')" @click="screen = 'reels'">
            <q-icon name="theaters" size="24px" />
          </button>
          <button class="nav-btn" :aria-label="t('social.profileAria')" @click="openProfile('me')">
            <q-icon name="account_circle" size="25px" />
          </button>
        </div>
      </div>

      <ProfileScreen
        v-else-if="screen === 'profile'"
        key="profile"
        :contact-id="profileContact"
        @back="screen = profileBackTo"
        @message="openDmThread"
        @open-post="openPost"
      />
      <PostDetailScreen
        v-else-if="screen === 'postDetail'"
        key="postDetail"
        :post-id="activePostId"
        @back="screen = 'profile'"
        @open-profile="openProfile"
        @open-comments="openComments"
      />
      <DmListScreen
        v-else-if="screen === 'dmList'"
        key="dmList"
        @back="screen = null"
        @open="openDmThread"
      />
      <DmThreadScreen
        v-else-if="screen === 'dmThread'"
        key="dmThread"
        :thread-id="phone.activeDmThread"
        @back="closeDmThread"
        @open-profile="openProfileFromDm"
      />
      <ReelsScreen v-else-if="screen === 'reels'" key="reels" @back="screen = null" />
      <CreatePostFlow v-else-if="screen === 'createPost'" key="createPost" @close="screen = null" />
    </transition>

    <transition name="viewer-pop">
      <StoryViewer v-if="viewingStory" :contact-id="viewingStory" @close="viewingStory = null" />
    </transition>
    <CommentsSheet v-model="commentsOpen" :comments="activeComments" />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePhoneStore } from '@/engine/stores/phone'
import { useStoryStore } from '@/engine/stores/story'
import { emit } from '@/engine/events/eventManager'
import PostCard from './PostCard.vue'
import StoriesBar from './StoriesBar.vue'
import StoryViewer from './StoryViewer.vue'
import ProfileScreen from './ProfileScreen.vue'
import ExploreGrid from './ExploreGrid.vue'
import DmListScreen from './DmListScreen.vue'
import DmThreadScreen from './DmThreadScreen.vue'
import ReelsScreen from './ReelsScreen.vue'
import CreatePostFlow from './CreatePostFlow.vue'
import CommentsSheet from './CommentsSheet.vue'
import PostDetailScreen from './PostDetailScreen.vue'

const phone = usePhoneStore()
const story = useStoryStore()
const { t } = useI18n()

const tab = ref('feed')
const screen = ref(null) // null | 'profile' | 'postDetail' | 'dmList' | 'dmThread' | 'reels' | 'createPost'
const profileContact = ref(null)
// where ProfileScreen's back button returns to — null (feed) for every
// entry point except the DM thread header tap, which should drop the
// player back into that same conversation instead of losing it.
const profileBackTo = ref(null)
const activePostId = ref(null)
const viewingStory = ref(null)
const commentsOpen = ref(false)
const activeComments = ref([])

function openProfile(contactId) {
  profileContact.value = contactId
  profileBackTo.value = null
  screen.value = 'profile'
  emit('profile.opened', { contactId })
}

function openProfileFromDm(contactId) {
  profileContact.value = contactId
  profileBackTo.value = 'dmThread'
  emit('profile.opened', { contactId })
  screen.value = 'profile'
}

// a DM notification tap sets phone.activeDmThread before this component
// (re)mounts (see NotificationBanner) — `immediate: true` catches that on
// mount, the rest of the watcher catches a tap that lands while already
// sitting inside a live Social app (no remount to piggyback on then).
watch(
  () => phone.activeDmThread,
  (threadId) => {
    if (threadId) screen.value = 'dmThread'
  },
  { immediate: true },
)

// tapping a grid tile on a profile — always backs out to that profile,
// not the feed, same idea as closeDmThread() returning to the DM list.
function openPost(postId) {
  activePostId.value = postId
  screen.value = 'postDetail'
}

function openComments(comments) {
  activeComments.value = comments
  commentsOpen.value = true
}

function openDmThread(threadId) {
  phone.openDmThread(threadId)
  screen.value = 'dmThread'
}

function closeDmThread() {
  phone.closeDmThread()
  screen.value = 'dmList'
}
</script>

<style scoped>
.app-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

.home-stack {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.screen-swap-enter-active,
.screen-swap-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.22s cubic-bezier(0.34, 1.2, 0.64, 1);
}

.screen-swap-enter-from {
  opacity: 0;
  transform: translateX(14px);
}

.screen-swap-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

.tab-fade-enter-active,
.tab-fade-leave-active {
  transition: opacity 0.15s ease;
}

.tab-fade-enter-from,
.tab-fade-leave-to {
  opacity: 0;
}

.viewer-pop-enter-active {
  transition:
    opacity 0.2s ease,
    transform 0.24s cubic-bezier(0.34, 1.35, 0.64, 1);
}

.viewer-pop-leave-active {
  transition: opacity 0.15s ease;
}

.viewer-pop-enter-from {
  opacity: 0;
  transform: scale(0.96);
}

.viewer-pop-leave-to {
  opacity: 0;
}

.pixly-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 10px 10px 14px;
  flex-shrink: 0;
}

.brand {
  background: linear-gradient(135deg, #f093fb, #f5576c);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-weight: 700;
  font-size: 20px;
  font-style: italic;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-icon {
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  padding: 2px;
}

.dm-icon {
  position: relative;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  padding: 2px;
}

.dm-badge {
  position: absolute;
  top: -4px;
  right: -6px;
  background: #ee2a7b;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  min-width: 15px;
  height: 15px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
}

.bottom-nav {
  display: flex;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.nav-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.55);
  padding: 10px 0;
  cursor: pointer;
  transition:
    color 0.15s ease,
    transform 0.12s ease;
}

.nav-btn.active {
  color: #f5576c;
}

.nav-btn:active {
  transform: scale(0.88);
}

.dm-icon,
.back-icon {
  transition: transform 0.12s ease;
}

.dm-icon:active,
.back-icon:active {
  transform: scale(0.88);
}

.feed {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.explore-wrap {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.empty {
  height: 100%;
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
</style>
