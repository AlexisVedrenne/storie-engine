<template>
  <transition name="app-toast">
    <div v-if="visible" class="app-toast">{{ visible }}</div>
  </transition>
</template>

<script setup>
// Same "watch a story field, copy to a local ref, own the auto-dismiss
// timer" shape as TimeSkipToast.vue/NotificationBanner.vue — a separate
// field/component rather than reusing timeSkipToast, since that one is
// wired specifically to continueAfterTimeSkip()'s landApp case, not a
// general-purpose message. Used by a custom-app button's `action.type:
// 'toast'` and by `action.onFailToast` (see ButtonBlock.vue).
import { ref, watch } from 'vue'
import { useStoryStore } from '@/engine/stores/story'

const story = useStoryStore()
const visible = ref(null)
let timer = null

watch(
  () => story.actionToast,
  (msg) => {
    if (!msg) return
    visible.value = msg
    story.actionToast = null
    clearTimeout(timer)
    timer = setTimeout(() => {
      visible.value = null
    }, 2600)
  },
)
</script>

<style scoped>
.app-toast {
  position: absolute;
  bottom: 90px;
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

.app-toast-enter-active,
.app-toast-leave-active {
  transition: all 0.3s ease;
}

.app-toast-enter-from,
.app-toast-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
