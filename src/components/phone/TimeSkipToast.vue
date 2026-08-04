<template>
  <transition name="skip-toast">
    <div v-if="visible" class="skip-toast">{{ visible }}</div>
  </transition>
</template>

<script setup>
// Same "watch a story field, copy to a local ref, own the auto-dismiss
// timer" shape as NotificationBanner.vue — used instead of the lock
// screen's own `pendingTimeSkipLabel` display when a `timeskip` entry has
// `landApp` set (see story.js's continueAfterTimeSkip): the player already
// unlocked and landed directly on an app, so the message fades in over
// whatever screen that is instead of sitting on the lock screen.
import { ref, watch } from 'vue'
import { useStoryStore } from '@/engine/stores/story'

const story = useStoryStore()
const visible = ref(null)
let timer = null

watch(
  () => story.timeSkipToast,
  (msg) => {
    if (!msg) return
    visible.value = msg
    story.timeSkipToast = null
    clearTimeout(timer)
    timer = setTimeout(() => {
      visible.value = null
    }, 3200)
  },
)
</script>

<style scoped>
.skip-toast {
  position: absolute;
  top: 46px;
  left: 12px;
  right: 12px;
  z-index: 50;
  text-align: center;
  background: rgba(30, 30, 40, 0.92);
  backdrop-filter: blur(8px);
  border-radius: 20px;
  padding: 8px 16px;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
}

.skip-toast-enter-active,
.skip-toast-leave-active {
  transition: all 0.3s ease;
}

.skip-toast-enter-from,
.skip-toast-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}
</style>
