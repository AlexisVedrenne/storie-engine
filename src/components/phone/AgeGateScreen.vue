<template>
  <div class="age-gate">
    <template v-if="!declined">
      <div
        class="gate-badge"
        :class="{
          entered,
          barred: phase !== 'appear',
          risen: phase === 'risen' || phase === 'text',
        }"
      >
        <span class="badge-value">18+</span>
        <span class="badge-slash" />
      </div>

      <div class="gate-copy" :class="{ visible: phase === 'text' }">
        <h1>{{ t('ageGate.title') }}</h1>
        <p>{{ t('ageGate.warning') }}</p>
        <div class="gate-actions">
          <button class="primary-btn" @click="confirm">{{ t('ageGate.confirmYes') }}</button>
          <button class="secondary-btn" @click="decline">{{ t('ageGate.confirmNo') }}</button>
        </div>
      </div>
    </template>

    <div v-else class="gate-blocked">
      <q-icon name="block" size="38px" color="rgba(255,255,255,0.45)" />
      <p>{{ t('ageGate.blocked') }}</p>
    </div>
  </div>
</template>

<script setup>
// Shown before EVEN the boot animation when the author enables
// gameConfig.matureContent (see GameForm.vue's "Contenu adulte" panel) —
// wired as the first branch in PhoneShell.vue's bootPhase chain, ahead of
// SlotPickerScreen/BootScreen. Player-facing, so shipped-game i18n
// (useI18n from vue-i18n), not the editor's own — see src/i18n/*/index.js's
// `ageGate` bucket.
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const emit = defineEmits(['confirmed'])

// One straight-line sequence, no input needed to advance any of it (same
// "just watch it happen" pacing as BootScreen.vue):
//   'appear' — the 18+ badge pops in
//   'barred' — a slash draws across it, forming the restricted-content icon
//   'risen'  — the badge rises to make room below it
//   'text'   — warning copy + Oui/Non fade in under it
const phase = ref('appear')
const declined = ref(false)
const timers = []

// Drives the badge's own pop-in via a plain CSS transition (`.entered`
// below) instead of a `@keyframes animation` — an `animation` with
// fill-mode `both` keeps "winning" the cascade for `transform` forever
// after it finishes (that's the CSS spec, not a bug), which silently ate
// the LATER `.risen` transform change and made the rise jump instantly
// instead of easing. One transition mechanism for both moments avoids that
// fight entirely. Flipped a frame after mount (not on mount itself) so the
// browser paints the pre-transition state first — same "wait a frame"
// trick a real `<transition>` uses internally.
const entered = ref(false)

onMounted(() => {
  requestAnimationFrame(() => {
    entered.value = true
  })
  timers.push(setTimeout(() => (phase.value = 'barred'), 650))
  timers.push(setTimeout(() => (phase.value = 'risen'), 1250))
  timers.push(setTimeout(() => (phase.value = 'text'), 1700))
})

onBeforeUnmount(() => timers.forEach(clearTimeout))

function confirm() {
  emit('confirmed')
}

// Dead end, deliberately — no button, no timeout, nothing that lets the
// player back out of it short of closing the game themselves.
function decline() {
  declined.value = true
}
</script>

<style scoped>
.age-gate {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 28px;
  background: linear-gradient(180deg, #1f1a3a 0%, #0d0d17 100%);
  color: #fff;
  text-align: center;
  gap: 18px;
}

.gate-badge {
  position: relative;
  flex-shrink: 0;
  width: 104px;
  height: 104px;
  border-radius: 50%;
  border: 5px solid #f5576c;
  display: flex;
  align-items: center;
  justify-content: center;
  /* Clips badge-slash to the circle below — its bar is wider than the
     badge on purpose (so the rotated ends reach past the border) but
     without this it drew straight past the ring instead of stopping at
     its edge. */
  overflow: hidden;
  opacity: 0;
  transform: scale(0.6);
  transition:
    opacity 0.4s cubic-bezier(0.34, 1.4, 0.64, 1),
    transform 0.4s cubic-bezier(0.34, 1.4, 0.64, 1);
}

.gate-badge.entered {
  opacity: 1;
  transform: scale(1);
}

.gate-badge.entered.risen {
  transform: scale(1) translateY(-16px);
}

.badge-value {
  position: relative;
  z-index: 1;
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -1px;
}

.badge-slash {
  position: absolute;
  z-index: 2;
  top: 50%;
  left: 50%;
  width: 135%;
  height: 5px;
  background: #f5576c;
  border-radius: 3px;
  transform: translate(-50%, -50%) rotate(-45deg) scaleX(0);
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.gate-badge.barred .badge-slash {
  transform: translate(-50%, -50%) rotate(-45deg) scaleX(1);
}

.gate-copy {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
  /* Mounted from the start (not v-if) and just invisible — .age-gate is a
     centered flex column, so popping this in later would reflow the WHOLE
     group (badge included) in one instant frame no transition can smooth.
     Reserving its space up front means only opacity/translateY move. */
  opacity: 0;
  transform: translateY(8px);
  pointer-events: none;
  transition:
    opacity 0.35s ease,
    transform 0.35s ease;
}

.gate-copy.visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.gate-copy h1 {
  font-size: 19px;
  font-weight: 800;
  margin: 0;
}

.gate-copy p {
  font-size: 13px;
  opacity: 0.7;
  line-height: 1.45;
  margin: 0 0 4px;
}

.gate-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.primary-btn,
.secondary-btn {
  width: 100%;
  border: none;
  border-radius: 12px;
  font-weight: 700;
  font-size: 14px;
  padding: 12px 0;
  cursor: pointer;
  transition: transform 0.12s ease;
}

.primary-btn {
  background: linear-gradient(135deg, #7b5cff, #f5576c);
  color: #fff;
}

.secondary-btn {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.primary-btn:active,
.secondary-btn:active {
  transform: scale(0.97);
}

.gate-blocked {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.gate-blocked p {
  font-size: 13.5px;
  opacity: 0.7;
  line-height: 1.5;
  margin: 0;
  max-width: 240px;
}
</style>
