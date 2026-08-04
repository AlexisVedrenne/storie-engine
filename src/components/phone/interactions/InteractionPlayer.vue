<template>
  <div
    class="interaction-player"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <img v-if="props.background" :src="resolveAssetUrl(props.background)" class="background-img" alt="" />

    <div v-if="step?.text" class="caption">{{ step.text }}</div>

    <div
      v-if="showZoneTarget"
      class="zone-target"
      :class="{ dragging: dragState.active, holding: step.kind === 'hold' && holdProgress > 0, imaged: step.image }"
      :style="[zoneTargetStyle, holdStyle]"
    >
      <img v-if="step.image" :src="resolveAssetUrl(step.image)" class="target-img" alt="" />
      <q-icon v-else-if="step.icon" :name="step.icon" size="32px" />
    </div>

    <div v-if="step?.kind === 'drag'" class="zone-target drop-target" :style="dropTargetStyle" />

    <div v-if="step?.kind === 'swipe'" class="swipe-hint">
      <img v-if="step.image" :src="resolveAssetUrl(step.image)" class="swipe-img" alt="" />
      <q-icon v-else :name="swipeIcon" size="40px" />
    </div>

    <div v-if="step?.kind === 'code'" class="keypad">
      <div class="code-dots">
        <span
          v-for="i in (step.digits || '').length"
          :key="i"
          class="dot"
          :class="{ filled: i <= codeBuffer.length }"
        />
      </div>
      <div class="keys">
        <button v-for="d in ['1', '2', '3', '4', '5', '6', '7', '8', '9']" :key="d" class="key" @pointerdown.stop="pressDigit(d)">
          {{ d }}
        </button>
        <span class="key spacer" />
        <button class="key" @pointerdown.stop="pressDigit('0')">0</button>
        <button class="key" @pointerdown.stop="codeBuffer = ''">
          <q-icon name="backspace" size="18px" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
// Generic interpreter for an author-built `interaction` definition's
// `steps[]` (see game.interactions / stepKinds.js) — ONE component handles
// every step kind, instead of a bespoke Vue component per interaction
// (that was the previous, wrong design). Advances through `steps` in order;
// each step's own gesture recognition lives in the pointer handlers below,
// switched on `step.kind`. A step's `timeLimitMs` (or `durationMs` for
// `wait`) expiring fails the WHOLE interaction immediately — an
// out-of-target input is otherwise just ignored, never an instant fail
// (see stepKinds.js's own header comment for the reasoning).
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { zoneStyle, zoneContains } from '@/engine/interactions/zones'
import { resolveAssetUrl } from '@/engine/assets'

const props = defineProps({
  steps: { type: Array, default: () => [] },
  background: { type: String, default: '' },
})
const emit = defineEmits(['finish'])

const currentIndex = ref(0)
const step = computed(() => props.steps[currentIndex.value] || null)

const codeBuffer = ref('')
const dragState = reactive({ active: false, x: 0.5, y: 0.5 })
const holdProgress = ref(0)

let holdTimer = null
let holdStart = 0
let deadlineTimer = null
let pointerIsDown = false
let wipeMs = 0
let wipeLastSample = 0
const swipeStart = { x: 0, y: 0, active: false }

function fracFromEvent(ev) {
  const rect = ev.currentTarget.getBoundingClientRect()
  return {
    x: (ev.clientX - rect.left) / rect.width,
    y: (ev.clientY - rect.top) / rect.height,
  }
}

const showZoneTarget = computed(() => step.value && ['tap', 'hold', 'wipe', 'drag'].includes(step.value.kind))
const zoneTargetStyle = computed(() => {
  const s = step.value
  if (!s) return {}
  if (s.kind === 'drag') {
    return dragState.active
      ? { top: `${dragState.y * 100}%`, left: `${dragState.x * 100}%` }
      : zoneStyle(s.from)
  }
  return zoneStyle(s.zone)
})
const dropTargetStyle = computed(() => (step.value?.kind === 'drag' ? zoneStyle(step.value.to) : {}))
const holdStyle = computed(() =>
  step.value?.kind === 'hold' ? { '--hold-progress': holdProgress.value } : {},
)

const SWIPE_ICON = { up: 'keyboard_arrow_up', down: 'keyboard_arrow_down', left: 'keyboard_arrow_left', right: 'keyboard_arrow_right' }
const swipeIcon = computed(() => SWIPE_ICON[step.value?.direction] || 'swipe')

function clearTimers() {
  if (holdTimer) {
    clearInterval(holdTimer)
    holdTimer = null
  }
  if (deadlineTimer) {
    clearTimeout(deadlineTimer)
    deadlineTimer = null
  }
}

function resetStepState() {
  codeBuffer.value = ''
  dragState.active = false
  holdProgress.value = 0
  wipeMs = 0
  wipeLastSample = 0
  swipeStart.active = false
  clearTimers()
}

function succeedStep() {
  clearTimers()
  if (currentIndex.value >= props.steps.length - 1) {
    finish(true)
    return
  }
  currentIndex.value++
}

function finish(success) {
  clearTimers()
  emit('finish', { success })
}

// Drives BOTH the per-step deadline and the `wait` kind's own auto-advance
// — re-armed every time `step` changes (new step, or the same index after a
// steps-array mutation, though authoring never happens while this is live).
watch(
  step,
  (s) => {
    resetStepState()
    if (!s) {
      // Empty/misconfigured `steps` (e.g. a deleted interaction
      // definition still referenced by id) — degrade to an immediate
      // loss rather than hang the phone forever, see plan §3.
      finish(false)
      return
    }
    if (s.kind === 'wait') {
      deadlineTimer = setTimeout(succeedStep, s.durationMs || 0)
      return
    }
    if (s.timeLimitMs) {
      deadlineTimer = setTimeout(() => finish(false), s.timeLimitMs)
    }
  },
  { immediate: true },
)

onBeforeUnmount(clearTimers)

function onPointerDown(ev) {
  const s = step.value
  if (!s) return
  pointerIsDown = true
  const { x, y } = fracFromEvent(ev)

  if (s.kind === 'tap') {
    if (zoneContains(s.zone, x, y)) succeedStep()
    return
  }
  if (s.kind === 'hold') {
    if (!zoneContains(s.zone, x, y)) return
    holdStart = Date.now()
    holdTimer = setInterval(() => {
      const elapsed = Date.now() - holdStart
      holdProgress.value = Math.min(1, elapsed / (s.durationMs || 1))
      if (elapsed >= (s.durationMs || 0)) succeedStep()
    }, 50)
    return
  }
  if (s.kind === 'swipe') {
    swipeStart.x = ev.clientX
    swipeStart.y = ev.clientY
    swipeStart.active = true
    return
  }
  if (s.kind === 'drag') {
    if (!zoneContains(s.from, x, y)) return
    dragState.active = true
    dragState.x = x
    dragState.y = y
  }
}

function onPointerMove(ev) {
  const s = step.value
  if (!s) return
  const { x, y } = fracFromEvent(ev)

  if (s.kind === 'hold' && holdTimer && !zoneContains(s.zone, x, y)) {
    clearInterval(holdTimer)
    holdTimer = null
    holdProgress.value = 0
    return
  }
  if (s.kind === 'drag' && dragState.active) {
    dragState.x = x
    dragState.y = y
    return
  }
  if (s.kind === 'wipe' && pointerIsDown) {
    if (zoneContains(s.zone, x, y)) {
      const now = Date.now()
      if (wipeLastSample) wipeMs += Math.min(120, now - wipeLastSample)
      wipeLastSample = now
      if (wipeMs >= (s.durationMs || 0)) succeedStep()
    } else {
      wipeLastSample = 0
    }
  }
}

function onPointerUp(ev) {
  pointerIsDown = false
  const s = step.value
  if (!s) return

  if (s.kind === 'hold' && holdTimer) {
    clearInterval(holdTimer)
    holdTimer = null
    holdProgress.value = 0
    return
  }
  if (s.kind === 'swipe' && swipeStart.active) {
    swipeStart.active = false
    const dx = ev.clientX - swipeStart.x
    const dy = ev.clientY - swipeStart.y
    const THRESHOLD = 50
    if (Math.abs(dx) < THRESHOLD && Math.abs(dy) < THRESHOLD) return
    const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'
    if (dir === s.direction) succeedStep()
    return
  }
  if (s.kind === 'drag' && dragState.active) {
    const { x, y } = fracFromEvent(ev)
    dragState.active = false
    if (zoneContains(s.to, x, y)) succeedStep()
    return
  }
  if (s.kind === 'wipe') {
    wipeLastSample = 0
  }
}

function pressDigit(d) {
  const s = step.value
  if (!s || s.kind !== 'code') return
  codeBuffer.value += d
  const digits = s.digits || ''
  if (codeBuffer.value.length >= digits.length) {
    if (codeBuffer.value === digits) succeedStep()
    else codeBuffer.value = ''
  }
}
</script>

<style scoped>
.interaction-player {
  position: absolute;
  inset: 0;
  z-index: 60;
  background: #0b0b14;
  overflow: hidden;
  touch-action: none;
  user-select: none;
}

.background-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.caption {
  position: absolute;
  top: 60px;
  left: 16px;
  right: 16px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  line-height: 1.4;
  /* readable over an authored background photo, not just the flat fallback */
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.8);
}

.zone-target {
  position: absolute;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle at 35% 30%, #ffd76a, #ff8a3d);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1c1204;
  box-shadow: 0 0 0 6px rgba(255, 138, 61, 0.2);
}

.zone-target.dragging {
  box-shadow: 0 0 0 6px rgba(255, 138, 61, 0.4);
}

.zone-target.holding {
  background: conic-gradient(#4ade80 calc(var(--hold-progress, 0) * 360deg), #ff8a3d 0);
}

/* a custom asset replaces the generic colored-circle look entirely — no
   gradient fill/glow behind an author's own artwork. */
.zone-target.imaged {
  background: none;
  box-shadow: none;
}

.target-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.drop-target {
  background: transparent;
  box-shadow: inset 0 0 0 3px dashed rgba(255, 255, 255, 0.4);
  border: 3px dashed rgba(255, 255, 255, 0.5);
}

.swipe-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.7);
  animation: swipe-pulse 1.1s ease-in-out infinite;
}

.swipe-img {
  max-width: 80px;
  max-height: 80px;
  object-fit: contain;
}

@keyframes swipe-pulse {
  0%,
  100% {
    opacity: 0.4;
    transform: scale(1);
  }
  50% {
    opacity: 0.9;
    transform: scale(1.15);
  }
}

.keypad {
  position: absolute;
  bottom: 16%;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}

.code-dots {
  display: flex;
  gap: 10px;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.6);
}

.dot.filled {
  background: #fff;
}

.keys {
  display: grid;
  grid-template-columns: repeat(3, 56px);
  gap: 10px;
}

.key {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.key:active {
  background: rgba(255, 255, 255, 0.22);
}

.key.spacer {
  background: none;
  cursor: default;
}
</style>
