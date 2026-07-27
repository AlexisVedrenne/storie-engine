<template>
  <div class="stories-bar">
    <div class="story-circle own-story">
      <div class="ring own">
        <AppAvatar :name="story.myName" :color="story.myColor" :size="52" />
        <span class="add-badge">
          <q-icon name="add" size="12px" color="white" />
        </span>
      </div>
      <span class="story-name">{{ t('social.ownStory') }}</span>
    </div>

    <button
      v-for="id in contactIds"
      :key="id"
      class="story-circle"
      @click="$emit('open', id)"
    >
      <div class="ring" :class="{ seen: allSeen(id) }">
        <AppAvatar
          :name="story.getContact(id).name"
          :color="story.getContact(id).color"
          :image="story.getContact(id).socialAvatar"
          :size="52"
        />
      </div>
      <span class="story-name">{{ story.socialHandle(story.getContact(id)) }}</span>
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStoryStore } from '@/engine/stores/story'
import AppAvatar from '@/components/phone/AppAvatar.vue'

defineEmits(['open'])
const story = useStoryStore()
const { t } = useI18n()

const contactIds = computed(() => Object.keys(story.storiesByContact))

function allSeen(contactId) {
  const items = story.storiesByContact[contactId] || []
  return items.length > 0 && items.every(s => story.storiesSeen[s.id])
}
</script>

<style scoped>
.stories-bar {
  display: flex;
  gap: 14px;
  padding: 12px 14px;
  overflow-x: auto;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.story-circle {
  background: none;
  border: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  flex-shrink: 0;
  width: 60px;
  transition: transform 0.12s ease;
}

.story-circle:active {
  transform: scale(0.92);
}

.ring {
  padding: 3px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f9ce34, #ee2a7b, #6228d7);
  transition: opacity 0.15s ease;
}

.ring.seen {
  background: rgba(255, 255, 255, 0.15);
}

.ring.own {
  position: relative;
  background: rgba(255, 255, 255, 0.15);
}

.add-badge {
  position: absolute;
  bottom: -1px;
  right: -1px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #4fc3f7;
  border: 2px solid #1c1c28;
  display: flex;
  align-items: center;
  justify-content: center;
}

.story-name {
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60px;
}
</style>
