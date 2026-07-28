<template>
  <div class="audio-preview">
    <q-btn dense flat round :icon="playing ? 'pause' : 'play_arrow'" size="sm" color="primary" @click="toggle" />
    <div class="track" @click="seek">
      <div class="fill" :style="{ width: progress + '%' }" />
    </div>
    <audio
      ref="audioEl"
      :src="src"
      preload="none"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onTimeUpdate"
      @ended="onEnded"
    />
  </div>
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'

// Minimal maison replacement for the browser's native <audio controls> —
// see docs/ui-ux-audit.md point 4: the native widget renders light/raised
// regardless of app theme, a clear visual break on the app's dark surface.
// No lib, just the <audio> element driven by its own API instead of its
// `controls` attribute, same effort as the per-entry-type icons already
// done in TimelineEditor.vue.
const props = defineProps({ src: { type: String, required: true } })

const audioEl = ref(null)
const playing = ref(false)
const progress = ref(0)

function toggle() {
  const el = audioEl.value
  if (!el) return
  if (el.paused) el.play()
  else el.pause()
  playing.value = !el.paused
}

function onTimeUpdate() {
  const el = audioEl.value
  if (!el || !el.duration) return
  progress.value = (el.currentTime / el.duration) * 100
}

function onEnded() {
  playing.value = false
  progress.value = 0
}

function seek(e) {
  const el = audioEl.value
  if (!el || !el.duration) return
  const rect = e.currentTarget.getBoundingClientRect()
  const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
  el.currentTime = ratio * el.duration
  progress.value = ratio * 100
}

// Reset playback state when the field's value changes to a different file
// (AssetField/GameForm both allow swapping the src in place).
watch(
  () => props.src,
  () => {
    audioEl.value?.pause()
    playing.value = false
    progress.value = 0
  },
)

onBeforeUnmount(() => audioEl.value?.pause())
</script>

<style scoped>
.audio-preview {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  height: 32px;
}

.track {
  flex: 1;
  height: 4px;
  border-radius: var(--radius-sm);
  background: var(--color-border);
  cursor: pointer;
  overflow: hidden;
}

.fill {
  height: 100%;
  background: var(--color-accent);
}

audio {
  display: none;
}
</style>
