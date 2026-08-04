<template>
  <transition name="drop">
    <div v-if="visible" class="notif-banner" @click="open">
      <span
        class="notif-icon"
        :style="{ background: notifApp?.iconImage ? 'transparent' : notifApp?.color }"
      >
        <img v-if="notifApp?.iconImage" :src="notifApp.iconImage" class="notif-icon-img" alt="" />
        <q-icon v-else-if="notifApp?.icon" :name="notifApp.icon" size="16px" color="white" />
      </span>
      <div class="notif-body">
        <div class="notif-title">{{ visible.title }}</div>
        <div class="notif-text">{{ visible.text }}</div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import { usePhoneStore } from '@/engine/stores/phone'

const story = useStoryStore()
const phone = usePhoneStore()

const visible = ref(null)
// Same catalog GameForm.vue's own Applications panel/app chip already reads
// icon/iconImage/color from — a notification always carries a real app id
// (see scheduleMessage/scheduleDm/pushAppMessage), so this is just a lookup,
// never a new source of app metadata.
const notifApp = computed(() => story.mergedAppRegistry.find((a) => a.id === visible.value?.app))
let timer = null
let lastSeenId = null

watch(
  () => story.notifications[0],
  (latest) => {
    if (!latest || latest.id === lastSeenId) return
    lastSeenId = latest.id
    visible.value = latest
    clearTimeout(timer)
    timer = setTimeout(() => {
      visible.value = null
    }, 4000)
  },
  { immediate: true },
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
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(30, 30, 40, 0.92);
  backdrop-filter: blur(8px);
  border-radius: 14px;
  padding: 10px 14px;
  color: #fff;
  z-index: 50;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
}

.notif-icon {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.notif-icon-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.notif-body {
  min-width: 0;
  flex: 1;
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
