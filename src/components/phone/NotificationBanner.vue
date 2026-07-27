<template>
  <transition name="drop">
    <div v-if="visible" class="notif-banner" @click="open">
      <div class="notif-title">{{ visible.title }}</div>
      <div class="notif-text">{{ visible.text }}</div>
    </div>
  </transition>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import { usePhoneStore } from '@/engine/stores/phone'

const story = useStoryStore()
const phone = usePhoneStore()

const visible = ref(null)
let timer = null
let lastSeenId = null

watch(
  () => story.notifications[0],
  latest => {
    if (!latest || latest.id === lastSeenId) return
    lastSeenId = latest.id
    visible.value = latest
    clearTimeout(timer)
    timer = setTimeout(() => {
      visible.value = null
    }, 4000)
  },
  { immediate: true }
)

function open() {
  if (!visible.value) return
  const notif = visible.value
  phone.unlock()
  // openApp() resets activeConversation/activeDmThread, so the deep-link
  // target has to be set after it, not before.
  phone.openApp(notif.app)
  if (notif.app === 'messages' && notif.contact) {
    phone.openConversation(notif.contact)
  } else if (notif.app === 'social' && notif.thread) {
    phone.openDmThread(notif.thread)
  }
  visible.value = null
}
</script>

<style scoped>
.notif-banner {
  position: absolute;
  top: 46px;
  left: 12px;
  right: 12px;
  background: rgba(30, 30, 40, 0.92);
  backdrop-filter: blur(8px);
  border-radius: 14px;
  padding: 10px 14px;
  color: #fff;
  z-index: 50;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
}

.notif-title {
  font-size: 13px;
  font-weight: 700;
}

.notif-text {
  font-size: 12px;
  opacity: 0.85;
}

.drop-enter-active,
.drop-leave-active {
  transition: all 0.25s ease;
}

.drop-enter-from,
.drop-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}
</style>
