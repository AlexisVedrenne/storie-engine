<template>
  <div class="story-viewer">
    <div class="progress-row">
      <div v-for="(s, i) in items" :key="s.id" class="progress-track">
        <div
          class="progress-fill"
          :class="{ active: i === index, done: i < index }"
          :style="i === index ? { animationDuration: `${DURATION}ms` } : {}"
        />
      </div>
    </div>

    <div class="viewer-header">
      <AppAvatar :name="contact.name" :color="contact.color" :image="contact.socialAvatar" :size="30" />
      <span class="viewer-name">{{ story.socialHandle(contact) }}</span>
      <span class="viewer-ts">{{ current.ts }}</span>
      <button class="close-btn" :aria-label="t('social.closeAria')" @click="$emit('close')">
        <q-icon name="close" size="22px" color="white" />
      </button>
    </div>

    <div class="story-body" :style="bodyStyle" @click="handleTap">
      <div v-if="!current.media" class="story-emoji">{{ current.emoji }}</div>
      <img v-else :src="resolveAssetUrl(current.media)" class="story-media" />
      <div v-if="current.caption" class="story-caption">{{ current.caption }}</div>
    </div>

    <div class="tap-zones">
      <div class="tap-zone left" @click.stop="prev" />
      <div class="tap-zone right" @click.stop="next" />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStoryStore } from '@/engine/stores/story'
import { resolveAssetUrl } from '@/engine/assets'
import AppAvatar from '@/components/phone/AppAvatar.vue'

const props = defineProps({ contactId: { type: String, required: true } })
const emit = defineEmits(['close'])

const story = useStoryStore()
const { t } = useI18n()
const DURATION = 4000

const items = computed(() => story.storiesByContact[props.contactId] || [])
const contact = computed(() => story.getContact(props.contactId))
const index = ref(0)
const current = computed(() => items.value[index.value] || {})

const bodyStyle = computed(() => (current.value.bg ? { background: current.value.bg } : {}))

let timer = null
function startTimer() {
  clearTimeout(timer)
  timer = setTimeout(next, DURATION)
}

function next() {
  if (index.value < items.value.length - 1) {
    index.value++
  } else {
    emit('close')
  }
}

function prev() {
  if (index.value > 0) index.value--
}

function handleTap() {
  // tap zones handle left/right; this is just a fallback for the body itself
}

watch(
  index,
  () => {
    if (current.value.id) story.markStorySeen(current.value.id)
    startTimer()
  },
  { immediate: true }
)

onUnmounted(() => clearTimeout(timer))
onMounted(() => {
  // start on the first unseen story if there is one, else the first
  const firstUnseen = items.value.findIndex(s => !story.storiesSeen[s.id])
  if (firstUnseen > 0) index.value = firstUnseen
})
</script>

<style scoped>
.story-viewer {
  position: absolute;
  inset: 0;
  background: #000;
  z-index: 50;
  display: flex;
  flex-direction: column;
}

.progress-row {
  display: flex;
  gap: 4px;
  padding: 10px 10px 0;
  flex-shrink: 0;
}

.progress-track {
  flex: 1;
  height: 2.5px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  width: 0%;
  background: #fff;
}

.progress-fill.done {
  width: 100%;
}

.progress-fill.active {
  animation: fill-progress linear forwards;
}

@keyframes fill-progress {
  from {
    width: 0%;
  }
  to {
    width: 100%;
  }
}

.viewer-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  flex-shrink: 0;
}

.viewer-name {
  color: #fff;
  font-weight: 600;
  font-size: 13px;
}

.viewer-ts {
  color: rgba(255, 255, 255, 0.55);
  font-size: 11.5px;
}

.close-btn {
  margin-left: auto;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  padding: 2px;
}

.story-body {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1c1c28;
}

.story-emoji {
  font-size: 90px;
}

.story-media {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.story-caption {
  position: absolute;
  bottom: 26px;
  left: 18px;
  right: 18px;
  color: #fff;
  font-size: 14px;
  text-align: center;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
}

.tap-zones {
  position: absolute;
  inset: 0;
  top: 46px;
  display: flex;
}

.tap-zone {
  flex: 1;
  cursor: pointer;
}

.tap-zone.right {
  flex: 2;
}
</style>
