<template>
  <div class="profile-screen">
    <AppHeader :title="displayName" @back="$emit('back')" />

    <div class="profile-body">
      <div class="profile-top">
        <AppAvatar :name="avatarName" :color="displayColor" :image="contact.socialAvatar" :size="72" />
        <div class="stats">
          <div class="stat">
            <div class="stat-value">{{ tiles.length }}</div>
            <div class="stat-label">{{ t('social.postsLabel') }}</div>
          </div>
          <div class="stat">
            <div class="stat-value">{{ followers }}</div>
            <div class="stat-label">{{ t('social.followersLabel') }}</div>
          </div>
          <div class="stat">
            <div class="stat-value">{{ following }}</div>
            <div class="stat-label">{{ t('social.followingLabel') }}</div>
          </div>
        </div>
      </div>

      <div class="profile-name">{{ displayName }}</div>
      <div v-if="contact.bio" class="profile-bio">{{ story.translateStory(contact.bio, 'common') }}</div>

      <button v-if="props.contactId === 'me'" class="edit-btn">{{ t('social.editProfile') }}</button>
      <div v-else class="action-row">
        <button
          class="action-btn"
          :class="{ following: isFollowing }"
          @click="story.toggleFollow(props.contactId)"
        >
          {{ isFollowing ? t('social.following') : t('social.follow') }}
        </button>
        <button class="action-btn secondary" @click="$emit('message', props.contactId)">{{ t('social.message') }}</button>
      </div>

      <div class="grid">
        <div v-if="!tiles.length" class="empty">
          <q-icon name="grid_on" size="40px" />
          <span>{{ t('social.profileEmpty') }}</span>
        </div>
        <div
          v-for="(t, i) in tiles"
          :key="t.id"
          class="tile"
          :class="{ clickable: t.type === 'post' }"
          :style="{ animationDelay: `${i * 30}ms` }"
          @click="t.type === 'post' && $emit('open-post', t.id)"
        >
          <img v-if="t.image" :src="resolveAssetUrl(t.image)" :style="t.imageFilter ? { filter: t.imageFilter } : {}" />
          <div v-else class="tile-fallback">📝</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStoryStore } from '@/engine/stores/story'
import { resolveAssetUrl } from '@/engine/assets'
import AppHeader from '@/components/phone/AppHeader.vue'
import AppAvatar from '@/components/phone/AppAvatar.vue'

const props = defineProps({ contactId: { type: String, required: true } })
defineEmits(['back', 'message', 'open-post'])

const story = useStoryStore()
const { t } = useI18n()
const contact = computed(() => story.getContact(props.contactId))
const displayName = computed(() =>
  props.contactId === 'me' ? story.myName : story.socialHandle(contact.value)
)
const displayColor = computed(() => (props.contactId === 'me' ? story.myColor : contact.value.color))
// real name, not the pseudo — AppAvatar needs it for sensible initials when
// there's no photo ("@handle" would give a broken-looking "@" initial).
const avatarName = computed(() => (props.contactId === 'me' ? story.myName : contact.value.name))

// persisted follow state (see story.isFollowing/toggleFollow) — gates
// whether this contact's posts show up in the Fil (section 6/7 in
// story-engine.md), not just cosmetic anymore.
const isFollowing = computed(() => story.isFollowing(props.contactId))

// grid mixes this contact's feed posts and the photos they've sent. Only
// `post` tiles open the post-detail view on tap (see @open-post) — a
// `photo` tile is just something sent in a conversation, it doesn't have
// the content/likes/comments shape PostCard expects.
const tiles = computed(() => {
  const posts = story.feedPosts
    .filter(p => p.author === props.contactId)
    .map(p => ({ id: p.id, image: p.image, imageFilter: p.imageFilter, type: 'post' }))
  const photos = story.photos
    .filter(p => p.from === props.contactId)
    .map(p => ({ id: p.id, image: p.url, type: 'photo' }))
  return [...posts, ...photos]
})

// base count from contacts.js (or a stable fake fallback) plus whatever a
// chapter has added via `effects.social` — see socialStats getter.
const followers = computed(() => story.socialStats(props.contactId).followers)
const following = computed(() => story.socialStats(props.contactId).following)
</script>

<style scoped>
.profile-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.profile-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px 16px 24px;
  color: #fff;
}

.profile-top {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 14px;
}

.stats {
  flex: 1;
  display: flex;
  justify-content: space-around;
}

.stat {
  text-align: center;
}

.stat-value {
  font-size: 16px;
  font-weight: 700;
}

.stat-label {
  font-size: 10.5px;
  opacity: 0.6;
}

.profile-name {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 2px;
}

.profile-bio {
  font-size: 12.5px;
  opacity: 0.75;
  margin-bottom: 16px;
  line-height: 1.4;
}

.edit-btn {
  width: 100%;
  background: rgba(255, 255, 255, 0.08);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-weight: 600;
  font-size: 12.5px;
  padding: 7px 0;
  margin-bottom: 16px;
  cursor: pointer;
  transition: transform 0.12s ease;
}

.edit-btn:active {
  transform: scale(0.97);
}

.action-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.action-btn {
  flex: 1;
  background: linear-gradient(135deg, #f093fb, #f5576c);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-weight: 600;
  font-size: 12.5px;
  padding: 7px 0;
  cursor: pointer;
  transition: transform 0.12s ease;
}

.action-btn.secondary {
  background: rgba(255, 255, 255, 0.08);
}

.action-btn.following {
  background: rgba(255, 255, 255, 0.08);
}

.action-btn:active {
  transform: scale(0.97);
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3px;
}

.tile {
  aspect-ratio: 1;
  background: #23232f;
  border-radius: 4px;
  overflow: hidden;
  animation: tile-in 0.24s cubic-bezier(0.34, 1.2, 0.64, 1) both;
}

.tile.clickable {
  cursor: pointer;
  transition: transform 0.12s ease;
}

.tile.clickable:active {
  transform: scale(0.95);
}

@keyframes tile-in {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.tile img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.tile-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  opacity: 0.6;
}

.empty {
  grid-column: span 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
  padding: 30px 0;
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.35);
}
</style>
