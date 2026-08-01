<template>
  <div
    class="phone-frame"
    :class="{ ringing, large: props.large, 'fill-mobile': props.fillMobileViewport }"
    :style="accentStyle"
  >
    <div class="phone-notch" />

    <div ref="screenEl" class="phone-screen">
      <div class="screen-canvas" :style="canvasStyle">
        <transition name="phase-fade" mode="out-in">
          <BootScreen v-if="bootPhase === 'boot' || bootPhase === 'reboot'" key="boot" @done="onBootDone" />
          <SetupWizard v-else-if="bootPhase === 'setup'" key="setup" @finish="onSetupDone" />

          <div v-else key="ready" class="ready-phase">
            <StatusBar v-if="!phone.locked" />

            <div class="screen-content">
              <transition name="unlock-slide">
                <div v-if="phone.locked" key="lock" class="screen-layer lock-layer">
                  <LockScreen />
                </div>

                <div v-else key="unlocked" class="screen-layer unlocked-layer">
                  <transition name="app-switch" mode="out-in">
                    <IncomingCallScreen v-if="story.pendingCall" key="call" />

                    <component :is="currentAppComponent" v-else-if="phone.currentApp" :key="phone.currentApp" />

                    <HomeScreen v-else key="home" />
                  </transition>
                </div>
              </transition>
            </div>

            <NotificationBanner />
          </div>
        </transition>
      </div>

      <div class="timeskip-veil" :class="{ active: story.timeSkipFading }" />
    </div>

    <button
      v-if="bootPhase === 'ready' && !phone.locked"
      class="home-indicator"
      aria-label="Accueil"
      @click="phone.goHome()"
    />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { usePhoneStore } from '@/engine/stores/phone'
import { useStoryStore } from '@/engine/stores/story'

import BootScreen from './BootScreen.vue'
import SetupWizard from './SetupWizard.vue'
import StatusBar from './StatusBar.vue'
import LockScreen from './LockScreen.vue'
import HomeScreen from './HomeScreen.vue'
import NotificationBanner from './NotificationBanner.vue'

import IncomingCallScreen from '@/components/apps/calls/IncomingCallScreen.vue'
import { APP_REGISTRY } from '@/engine/apps/registry'

// `large` lets a caller (EditorPage.vue's "Aperçu seul" mode) raise the
// phone-frame's hard size cap — see docs/ui-ux-audit.md point 10: the
// normal cap is already ~94vw/94vh of the whole window regardless of the
// surrounding pane, so a caller with more room to give (no docked
// chapters/form panes eating the width) needs a bigger cap to actually
// render bigger, not just less padding around the same size.
// `fillMobileViewport` — only set by GamePage.vue (the actual player-facing
// shell: an exported game, or the web preview opened on a real phone, see
// docs on webPreview.js). Never set by EditorPage.vue's own embed, so
// shrinking the editor's preview pane never triggers this — it's keyed off
// "is this genuinely a small/mobile viewport", not "is this pane narrow
// right now", and the editor is desktop-only regardless of pane width. On
// an actual phone, drawing a fake phone-mockup (bezel/notch/shadow) inside
// the real device's own browser looks absurd — this makes the game fill
// the real screen edge to edge instead, so it reads as the phone itself
// rather than a screenshot of one. See the 'fill-mobile' media query below
// — the class alone does nothing on a wide (desktop) viewport.
const props = defineProps({
  large: { type: Boolean, default: false },
  fillMobileViewport: { type: Boolean, default: false },
})

const phone = usePhoneStore()
const story = useStoryStore()

// Renders whatever app is open regardless of enabledAppIds — a project
// disabling an app after the player already navigated into it (or a stale
// save) shouldn't render a blank screen; HomeScreen.vue's icon grid is what
// actually gates reachability going forward.
const currentAppComponent = computed(
  () => APP_REGISTRY.find((app) => app.id === phone.currentApp)?.component,
)

// the boot animation + setup wizard are a one-time first-run sequence, not
// something a real phone replays on every reload once it's already set up —
// so once playerName exists, skip straight to the phone (story.init(),
// called synchronously in PhonePage before this component mounts,
// guarantees playerName is already known at this point).
const bootPhase = ref(story.playerName ? 'ready' : 'boot') // 'boot' | 'setup' | 'reboot' | 'ready'
if (story.playerName) story.startIfNeeded() // safety net; no-op if already resumed by story.init()

function onBootDone() {
  if (bootPhase.value === 'reboot') {
    bootPhase.value = 'ready'
    story.startIfNeeded() // now that playerName is known, safe to run the timeline
    return
  }
  bootPhase.value = story.playerName ? 'ready' : 'setup'
}

// setup wizard finishes by "restarting" the phone — same boot screen,
// replayed once — before landing on the lock screen, like a real
// first-time device setup does.
function onSetupDone() {
  bootPhase.value = 'reboot'
}

// Settings app "reset phone" — story.resetSave() already wiped the story
// state (playerName included), so replaying the full boot animation here
// naturally routes back into onBootDone -> 'setup', same as a real fresh
// device.
watch(
  () => phone.rebootCount,
  () => {
    bootPhase.value = 'boot'
  }
)

// phone frame gently vibrates while a call is ringing and hasn't been picked up yet
const ringing = computed(
  () => !!story.pendingCall && !story.calls.some(c => c.id === story.pendingCall.id)
)

// Sets --phone-accent on the root of all phone UI so every descendant's CSS
// can just do var(--phone-accent, #4c8bf5) instead of hardcoding the hex —
// a project can override the phone's accent color via Réglages > Jeu
// (game.accentColor, see GameForm.vue) without touching any component.
// Left unset (not even the fallback) when no override exists, so CSS's own
// var(..., #4c8bf5) default is the single source of truth for "what the
// color is when nobody customized it."
const accentStyle = computed(() => {
  const color = story.gameConfig?.accentColor
  return color ? { '--phone-accent': color } : {}
})

// Every screen (status bar, home, apps, boot, setup wizard) is written in
// fixed px sizes designed against a "normal" phone-sized canvas — that's
// what lets a chapter author write a message bubble without thinking about
// viewport math, and what makes a UI element look the same PHYSICAL size
// regardless of the final container size: the canvas is rendered at a
// fixed design WIDTH, then scaled as a whole by container-width/390.
//
// The design HEIGHT, on the other hand, is NOT fixed — it's derived from
// the scale (container-height / scale) so the canvas always ends up
// exactly container-sized on both axes, no crop and no stretch. This
// matters because `fillMobileViewport` (see that prop's own comment) hands
// this a real device's own aspect ratio, which routinely differs from the
// design's 9:18 — a FIXED design height here forced a choice between
// stretching non-uniformly (the original bug) or cropping top/bottom via
// Math.max "cover" (a later attempt, still visibly truncated status
// bar/home indicator on real devices). Safe to do because nothing downstream
// depends on the canvas being exactly 780px tall: `.ready-phase` is a plain
// flex column (StatusBar's own height + `.screen-content`'s `flex: 1`)
// that already absorbs whatever room it's given — a taller/shorter design
// canvas just gives the main content more or less room, same as a real
// phone with more or less screen.
const DESIGN_WIDTH = 390

const screenEl = ref(null)
const canvasScale = ref(1)
const canvasHeight = ref(780)
let resizeObserver

function measureScreen() {
  const el = screenEl.value
  if (!el) return
  const { clientWidth, clientHeight } = el
  if (!clientWidth || !clientHeight) return
  const scale = clientWidth / DESIGN_WIDTH
  canvasScale.value = scale
  canvasHeight.value = clientHeight / scale
}

onMounted(() => {
  measureScreen()
  resizeObserver = new ResizeObserver(measureScreen)
  resizeObserver.observe(screenEl.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})

const canvasStyle = computed(() => ({
  width: `${DESIGN_WIDTH}px`,
  height: `${canvasHeight.value}px`,
  transform: `translate(-50%, -50%) scale(${canvasScale.value})`
}))
</script>

<style scoped>
.phone-frame {
  /* keep a fixed phone-like aspect ratio (9:18) no matter which axis is
     tighter — plain min()/calc() rather than the CSS `aspect-ratio`
     property, so the other dimension always shrinks in lockstep instead of
     just getting capped (which is what squashed the phone on short/narrow
     viewports). 9:18 rather than a true 9:19.5 device ratio so the frame
     stays reasonably wide on short laptop screens, where height is
     usually the binding constraint; 94vw/94vh (rather than 90) claims a
     bit more of the viewport for the same reason. */
  position: relative;
  width: min(94vw, 480px, calc(94vh * 9 / 18));
  height: min(94vh, 960px, calc(94vw * 18 / 9));
  background: #0b0b12;
  border-radius: 46px;
  padding: 12px;
  box-shadow:
    0 0 0 2px #33333f,
    0 0 60px 10px rgba(120, 140, 255, 0.14),
    0 30px 70px rgba(0, 0, 0, 0.55);
  transition: transform 0.2s ease;
}

.phone-frame.ringing {
  animation: phone-shake 0.6s ease-in-out infinite;
}

/* Bigger hard cap for contexts with more room to give (see the `large`
   prop above) — still bounded by 94vw/94vh so it never overflows a
   smaller window, just allowed to grow past the normal 480×960 cap. */
.phone-frame.large {
  width: min(94vw, 600px, calc(94vh * 9 / 18));
  height: min(94vh, 1200px, calc(94vw * 18 / 9));
}

/* On a real phone-sized viewport, a `fillMobileViewport` caller (see the
   prop's own comment above) drops the phone-mockup chrome entirely — full
   bleed, no bezel/notch/shadow/rounding — so the page reads as the device
   itself. `100dvh` (not `100vh`) so a mobile browser's address bar
   collapsing on scroll doesn't leave a gap or cause a jump. Scoped to
   `.fill-mobile` specifically so this never fires for the editor's own
   embed (see the prop comment) even if its preview pane happens to be
   narrow. */
@media (max-width: 600px) {
  .phone-frame.fill-mobile {
    width: 100vw;
    height: 100dvh;
    max-width: none;
    max-height: none;
    border-radius: 0;
    padding: 0;
    box-shadow: none;
  }

  .phone-frame.fill-mobile .phone-notch {
    display: none;
  }

  .phone-frame.fill-mobile .phone-screen {
    border-radius: 0;
  }
}

@keyframes phone-shake {
  0%,
  100% {
    transform: rotate(0deg) translateX(0);
  }
  20% {
    transform: rotate(-1.5deg) translateX(-3px);
  }
  40% {
    transform: rotate(1.5deg) translateX(3px);
  }
  60% {
    transform: rotate(-1.2deg) translateX(-2px);
  }
  80% {
    transform: rotate(1.2deg) translateX(2px);
  }
}

.phone-notch {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  width: 40%;
  max-width: 150px;
  height: 24px;
  background: #0b0b12;
  border-radius: 0 0 16px 16px;
  z-index: 20;
}

.phone-screen {
  position: relative;
  width: 100%;
  height: 100%;
  background: #1c1c28;
  border-radius: 34px;
  overflow: hidden;
}

/* fixed-size design canvas, scaled to fill `.phone-screen` — see the JS
   measureScreen()/canvasStyle above. */
.screen-canvas {
  position: absolute;
  top: 50%;
  left: 50%;
  transform-origin: center;
  display: flex;
  flex-direction: column;
}

/* film-style cut for a `timeskip` entry — fades to black while the clock/
   date/lock change happens underneath, then fades back in on the result,
   instead of a hard instant swap. See story.js scheduleTimeSkip(). */
.timeskip-veil {
  position: absolute;
  inset: 0;
  z-index: 50;
  background: #000;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.45s ease;
}

.timeskip-veil.active {
  opacity: 1;
}

.ready-phase {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.screen-content {
  flex: 1;
  min-height: 0;
  position: relative;
}

.phase-fade-enter-active,
.phase-fade-leave-active {
  transition: opacity 0.35s ease;
}

.phase-fade-enter-from,
.phase-fade-leave-to {
  opacity: 0;
}

.screen-layer {
  position: absolute;
  inset: 0;
}

.unlocked-layer {
  z-index: 1;
}

.lock-layer {
  z-index: 2;
}

.home-indicator {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 130px;
  height: 5px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.5);
  border: none;
  cursor: pointer;
  z-index: 30;
  transition: transform 0.15s ease;
}

.home-indicator:active {
  transform: translateX(-50%) scale(0.9);
}

/* lock screen slides up and off, revealing the already-mounted home screen beneath */
.unlock-slide-leave-active {
  transition: transform 0.4s cubic-bezier(0.32, 0.72, 0, 1);
}

.unlock-slide-leave-to {
  transform: translateY(-100%);
}

.unlock-slide-enter-active {
  transition: opacity 0.3s ease 0.05s;
}

.unlock-slide-enter-from {
  opacity: 0;
}

/* apps pop in/out when switching between home and an app (or an incoming call) */
.app-switch-enter-active {
  transition:
    opacity 0.22s ease,
    transform 0.26s cubic-bezier(0.34, 1.35, 0.64, 1);
}

.app-switch-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.app-switch-enter-from {
  opacity: 0;
  transform: scale(0.94) translateY(8px);
}

.app-switch-leave-to {
  opacity: 0;
  transform: scale(0.97);
}
</style>
