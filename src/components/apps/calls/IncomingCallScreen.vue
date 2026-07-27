<template>
  <div class="call-screen">
    <transition name="call-swap" mode="out-in">
      <div v-if="!answered" key="ringing" class="call-stage">
        <div class="call-info">
          <div class="avatar-ring">
            <AppAvatar :name="displayName" :color="contact.color" :image="contact.avatar" :size="96" />
          </div>
          <div class="name">{{ displayName }}</div>
          <div class="status">{{ t('calls.ringingStatus') }}</div>
        </div>
        <div class="call-actions">
          <button class="call-btn decline" @click="decline" :aria-label="t('calls.declineAria')">
            <q-icon name="call_end" size="26px" color="white" />
          </button>
          <button class="call-btn accept" @click="accept" :aria-label="t('calls.answerAria')">
            <q-icon name="call" size="26px" color="white" />
          </button>
        </div>
      </div>

      <div v-else key="in-call" class="call-stage">
        <div class="call-info in-call">
          <AppAvatar :name="displayName" :color="contact.color" :image="contact.avatar" :size="96" />
          <div class="name">{{ displayName }}</div>
          <div class="status">{{ t('calls.inCallStatus') }}</div>
        </div>

        <transition-group tag="div" name="script-line" class="script">
          <div
            v-for="(line, i) in visibleLines"
            :key="i"
            class="script-line"
            :class="{ me: line.from === 'me' }"
          >
            {{ line.text }}
          </div>
          <button v-if="hasMore" key="next" class="next-btn" @click="showNext">{{ t('common.continue') }}</button>
        </transition-group>

        <div class="call-actions single">
          <button class="call-btn decline" @click="hangUp" :aria-label="t('calls.hangUpAria')">
            <q-icon name="call_end" size="26px" color="white" />
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStoryStore } from '@/engine/stores/story'
import AppAvatar from '@/components/phone/AppAvatar.vue'

const story = useStoryStore()
const { t } = useI18n()
const contact = computed(() => story.getContact(story.pendingCall?.contact))
const displayName = computed(() => story.contactName(story.pendingCall?.contact))
const answered = ref(false)
const shownCount = ref(1)

const script = computed(() => story.pendingCall?.script || [])
const visibleLines = computed(() => script.value.slice(0, shownCount.value))
const hasMore = computed(() => shownCount.value < script.value.length)

function accept() {
  story.answerCall()
  answered.value = true
}

function decline() {
  story.declineCall()
}

function showNext() {
  shownCount.value++
}

function hangUp() {
  story.endCall()
}
</script>

<style scoped>
.call-screen {
  height: 100%;
  display: flex;
  background: linear-gradient(180deg, #2c2c3d 0%, #101018 100%);
  padding: 50px 20px 40px;
  color: #fff;
  overflow: hidden;
}

.call-stage {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
}

.call-swap-enter-active,
.call-swap-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.22s ease;
}

.call-swap-enter-from {
  opacity: 0;
  transform: scale(0.97);
}

.call-swap-leave-to {
  opacity: 0;
}

.script-line-enter-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s cubic-bezier(0.34, 1.2, 0.64, 1);
}

.script-line-enter-from {
  opacity: 0;
  transform: translateY(8px) scale(0.96);
}

.call-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-top: 20px;
}

.avatar-ring {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.avatar-ring::before,
.avatar-ring::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.4);
  animation: ring-pulse 1.8s ease-out infinite;
}

.avatar-ring::after {
  animation-delay: 0.6s;
}

@keyframes ring-pulse {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  100% {
    transform: scale(1.55);
    opacity: 0;
  }
}

.name {
  font-size: 22px;
  font-weight: 600;
}

.status {
  font-size: 13px;
  opacity: 0.7;
}

.call-actions {
  display: flex;
  gap: 60px;
}

.call-actions.single {
  gap: 0;
}

.call-btn {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.12s ease;
}

.call-btn:active {
  transform: scale(0.88);
}

.call-btn.decline {
  background: #f44336;
}

.call-btn.accept {
  background: #4caf50;
}

.script {
  flex: 1;
  width: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px 4px;
}

.script-line {
  max-width: 80%;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  padding: 8px 12px;
  font-size: 14px;
  align-self: flex-start;
}

.script-line.me {
  align-self: flex-end;
  background: #4c8bf5;
}

.next-btn {
  align-self: center;
  margin-top: 8px;
  background: rgba(255, 255, 255, 0.12);
  border: none;
  color: #fff;
  border-radius: 14px;
  padding: 8px 18px;
  font-size: 13px;
  cursor: pointer;
  transition: transform 0.12s ease;
}

.next-btn:active {
  transform: scale(0.94);
}
</style>
