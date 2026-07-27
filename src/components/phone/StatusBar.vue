<template>
  <div class="status-bar">
    <span class="time">{{ time }}</span>
    <div class="icons">
      <q-icon v-if="story.network.wifi" name="wifi" size="14px" />
      <q-icon v-else :name="signalIcon" size="14px" />
      <span class="battery-pct" :class="{ low: story.battery <= 20 }">{{ story.battery }}%</span>
      <q-icon :name="batteryIcon" size="16px" :color="story.battery <= 20 ? '#ff5252' : 'white'" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useStoryStore } from '@/engine/stores/story'

const story = useStoryStore()

const time = ref(formatTime())
let timer = null

// story.resolvedClock() (driven by clockTime/clockDate, set via an `effect`
// — see applyEffects) combines the real device time with whichever piece
// a chapter has overridden.
function formatTime() {
  return story.resolvedClock().toLocaleTimeString(story.activeLocale, { hour: '2-digit', minute: '2-digit' })
}

onMounted(() => {
  timer = setInterval(() => {
    time.value = formatTime()
  }, 15000)
})

onUnmounted(() => {
  clearInterval(timer)
})

// update immediately when a chapter sets/clears the override, or when the
// message-driven drift ticks, instead of waiting up to 15s for the next tick
watch(
  () => [story.clockTime, story.clockDate, story.clockOffsetMinutes],
  () => {
    time.value = formatTime()
  }
)

// Wifi off falls back to cellular bars — driven by story.network, see
// stores/story.js applyEffects (key "network": { signal, wifi }).
const signalIcon = computed(() => {
  const bars = story.network.signal
  if (bars <= 0) return 'signal_cellular_off'
  return `signal_cellular_${bars}_bar`
})

const batteryIcon = computed(() => {
  const b = story.battery
  if (b <= 5) return 'battery_alert'
  if (b <= 20) return 'battery_1_bar'
  if (b <= 40) return 'battery_3_bar'
  if (b <= 60) return 'battery_4_bar'
  if (b <= 90) return 'battery_6_bar'
  return 'battery_full'
})
</script>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 22px 2px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  flex-shrink: 0;
}

.icons {
  display: flex;
  align-items: center;
  gap: 5px;
}

.battery-pct {
  font-size: 12px;
  font-weight: 600;
}

.battery-pct.low {
  color: #ff5252;
}
</style>
