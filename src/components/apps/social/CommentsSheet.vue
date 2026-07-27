<template>
  <transition name="sheet-fade">
    <div v-if="modelValue" class="sheet-backdrop" @click.self="$emit('update:modelValue', false)">
      <transition name="sheet-slide" appear>
        <div class="comments-sheet">
          <div class="drag-handle" />
          <div class="sheet-title">{{ t('social.commentsTitle') }}</div>

          <div class="list">
            <div v-if="!comments.length" class="empty">{{ t('social.noComments') }}</div>
            <div v-for="(c, i) in comments" :key="i" class="comment-row">
              <AppAvatar
                :name="story.getContact(c.author).name"
                :color="story.getContact(c.author).color"
                :image="story.getContact(c.author).socialAvatar"
                :size="34"
              />
              <div class="comment-body">
                <strong>{{ story.socialHandle(story.getContact(c.author)) }}</strong> {{ c.text }}
              </div>
            </div>
          </div>

          <div class="input-bar">
            <span>{{ t('social.addCommentDisabled') }}</span>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import { useStoryStore } from '@/engine/stores/story'
import AppAvatar from '@/components/phone/AppAvatar.vue'

defineProps({ modelValue: { type: Boolean, default: false }, comments: { type: Array, default: () => [] } })
defineEmits(['update:modelValue'])
const { t } = useI18n()
const story = useStoryStore()
</script>

<style scoped>
.sheet-backdrop {
  position: absolute;
  inset: 0;
  z-index: 60;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
}

.comments-sheet {
  width: 100%;
  max-height: 70%;
  display: flex;
  flex-direction: column;
  background: #1c1c28;
  border-radius: 16px 16px 0 0;
  color: #fff;
}

.drag-handle {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.25);
  margin: 10px auto 6px;
  flex-shrink: 0;
}

.sheet-title {
  text-align: center;
  font-weight: 600;
  font-size: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px 0;
  min-height: 120px;
}

.empty {
  padding: 24px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
  text-align: center;
}

.comment-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
}

.comment-body {
  flex: 1;
  font-size: 13.5px;
  line-height: 1.4;
  padding-top: 3px;
}

.input-bar {
  padding: 10px 14px 16px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 11.5px;
  flex-shrink: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.sheet-fade-enter-active,
.sheet-fade-leave-active {
  transition: opacity 0.2s ease;
}

.sheet-fade-enter-from,
.sheet-fade-leave-to {
  opacity: 0;
}

.sheet-slide-enter-active {
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
}

.sheet-slide-leave-active {
  transition: transform 0.2s ease;
}

.sheet-slide-enter-from,
.sheet-slide-leave-to {
  transform: translateY(100%);
}
</style>
