<template>
  <div
    class="phone-frame"
    :class="{ ringing, large: props.large, 'fill-mobile': props.fillMobileViewport }"
    :style="accentStyle"
  >
    <div class="phone-notch" />

    <div
      ref="screenEl"
      class="phone-screen"
      :class="{ 'screen-shaking': story.screenEffect?.kind === 'shake' }"
    >
      <div class="screen-canvas" :style="canvasStyle">
        <transition name="phase-fade" mode="out-in">
          <AgeGateScreen
            v-if="bootPhase === 'ageGate'"
            :key="`ageGate-${phone.rebootCount}`"
            @confirmed="onAgeGateConfirmed"
          />

          <SlotPickerScreen v-else-if="bootPhase === 'slots'" key="slots" @picked="onSlotPicked" />

          <BootScreen
            v-else-if="bootPhase === 'boot' || bootPhase === 'reboot'"
            key="boot"
            @done="onBootDone"
          />
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

                    <component
                      :is="currentAppComponent"
                      v-else-if="phone.currentApp"
                      :key="phone.currentApp"
                    />

                    <HomeScreen v-else key="home" />
                  </transition>
                </div>
              </transition>
            </div>

            <NotificationBanner />
            <TimeSkipToast />
            <AppToast />

            <!-- Inside .screen-canvas (unlike InteractionPlayer below), so
                 it inherits the SAME 390px-design-width scale transform
                 every real app screen renders at — mounted outside that
                 canvas, its bubble/avatar sizes wouldn't actually match
                 the real Pixly DM thread it's meant to mimic (see its own
                 comment on why the look matters here). Last in this phase's
                 DOM, so it naturally paints above the home/app content
                 beneath it without needing its own z-index for that. -->
            <HallucinationPlayer
              v-if="story.activeHallucination"
              :messages="story.activeHallucination.messages"
              @finish="story.finishHallucination"
            />

            <EndScreen v-if="story.activeEnding" />
          </div>
        </transition>
      </div>

      <div class="timeskip-veil" :class="{ active: story.timeSkipFading }" />

      <div
        v-if="story.screenEffect"
        :key="story.screenEffect.id"
        class="screen-effect-veil"
        :class="`effect-${story.screenEffect.kind}`"
      />

      <InteractionPlayer
        v-if="story.activeInteraction"
        :steps="story.activeInteraction.steps"
        :background="story.activeInteraction.background"
        @finish="story.finishInteraction"
      />
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
import { DEFAULT_LOCALE } from '@/engine/i18n/locales'
import { accentGradient } from '@/engine/utils/color'

import AgeGateScreen from './AgeGateScreen.vue'
import BootScreen from './BootScreen.vue'
import SlotPickerScreen from './SlotPickerScreen.vue'
import SetupWizard from './SetupWizard.vue'
import StatusBar from './StatusBar.vue'
import LockScreen from './LockScreen.vue'
import HomeScreen from './HomeScreen.vue'
import NotificationBanner from './NotificationBanner.vue'
import TimeSkipToast from './TimeSkipToast.vue'
import AppToast from './AppToast.vue'

import IncomingCallScreen from '@/components/apps/calls/IncomingCallScreen.vue'
import InteractionPlayer from './interactions/InteractionPlayer.vue'
import HallucinationPlayer from './HallucinationPlayer.vue'
import EndScreen from './EndScreen.vue'

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
  () => story.mergedAppRegistry.find((app) => app.id === phone.currentApp)?.component,
)

// window.storieGameSave only exists in a shipped game (see story.js's own
// save()/loadSlotsSummary()) — the editor's own live preview embeds this
// exact same component (EditorPage.vue) and never goes through it, so the
// slot picker must never show there: gated on the same runtime check
// story.js already uses everywhere else for "shipped game vs editor
// preview". In a shipped game, no slot is loaded into story state yet at
// this point (GamePage.vue only fetched the 3 slots' SUMMARIES
// synchronously before mount, see loadSlotsSummary()) — story.playerName
// is genuinely unset until the player picks one, so 'slots' has to be the
// unconditional starting phase there, not derived from playerName like the
// editor-preview branch still is.
function resolvePastGatePhase() {
  return window.storieGameSave ? 'slots' : story.playerName ? 'ready' : 'boot'
}

// The setup wizard's own "Langue · Language" step (SetupWizard.vue) doesn't
// run until AFTER this gate (and, in a shipped game, the slot picker) — so
// left alone, the gate's own text would render in DEFAULT_LOCALE (the
// engine's source language) regardless of the player's real language, right
// up until the wizard finally lets them pick one. Auto-detecting now avoids
// that mismatched first impression; same navigator.language matching
// EditorPage.vue's previewFrom() already uses elsewhere. The wizard's
// language step still runs afterward and can freely override this.
function enterAgeGate() {
  const osLocale = story.availableLocales.some((l) => l.code === navigator.language)
    ? navigator.language
    : DEFAULT_LOCALE
  story.setLocale(osLocale)
  return 'ageGate'
}

// gameConfig.matureContent (see GameForm.vue's "Contenu adulte" panel) gates
// EVERYTHING else, including the slot picker — an 18+ warning that only
// showed up after already picking a save slot would be pointless. Whatever
// resolvePastGatePhase() would otherwise have started on runs once the
// player confirms (see onAgeGateConfirmed below).
const bootPhase = ref(story.gameConfig?.matureContent ? enterAgeGate() : resolvePastGatePhase()) // 'ageGate' | 'slots' | 'boot' | 'setup' | 'reboot' | 'ready'
// editor-preview safety net only — scoped to 'ready' (not just story.playerName)
// so it doesn't fire early while the age gate is still showing.
if (bootPhase.value === 'ready') story.startIfNeeded()

function onAgeGateConfirmed() {
  bootPhase.value = resolvePastGatePhase()
  if (bootPhase.value === 'ready') story.startIfNeeded()
}

// Called once the player picks a card on SlotPickerScreen.vue —
// story.loadSlot() has already run by the time this fires (see that
// component), so playerName is now whatever that slot actually holds.
// Mirrors the 'reboot' branch below: an occupied slot skips straight to
// 'ready' with no boot animation (like reloading an already-set-up real
// phone), so startIfNeeded() has to be called explicitly here too — it's
// otherwise only ever reached via onBootDone()'s own branches.
function onSlotPicked() {
  bootPhase.value = story.playerName ? 'ready' : 'boot'
  if (bootPhase.value === 'ready') story.startIfNeeded()
}

function onBootDone() {
  if (bootPhase.value === 'reboot') {
    bootPhase.value = 'ready'
    story.startIfNeeded() // now that playerName is known, safe to run the timeline
    return
  }
  // Settings' "Changer de sauvegarde" — see phone.js's requestReboot() —
  // routes back to the picker instead of re-deriving from playerName.
  // Consumed once so it doesn't leak into the NEXT, unrelated reboot (e.g.
  // "reset phone" fired right after switching slots).
  if (phone.rebootTarget === 'slots') {
    bootPhase.value = 'slots'
    phone.rebootTarget = 'boot'
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

// Settings app "reset phone"/"changer de sauvegarde" — both bump
// rebootCount and always replay the boot animation; which phase it lands
// on afterward is onBootDone()'s job (branches on phone.rebootTarget).
// "reset phone" already wiped the story state (playerName included) via
// story.resetSave(), so its own reboot naturally routes to 'setup' there,
// same as a real fresh device.
watch(
  () => phone.rebootCount,
  () => {
    // Real shipped-game reboots (Settings' "Réinitialiser le téléphone" /
    // "Changer de sauvegarde") never re-show the gate — the player already
    // cleared it once this launch, and re-carding them on every in-game
    // reset would be obnoxious. The editor's OWN reboots (restartPreview()/
    // previewFrom()/custom-app preview, all plain requestReboot() calls,
    // window.storieGameSave unset) are different: they're the only way the
    // author can re-trigger a "fresh launch" to actually see the gate while
    // building it, since it otherwise only runs once, at this component's
    // very first mount.
    bootPhase.value =
      !window.storieGameSave && story.gameConfig?.matureContent ? enterAgeGate() : 'boot'
  },
)

// phone frame gently vibrates while a call is ringing and hasn't been picked up yet
const ringing = computed(
  () => !!story.pendingCall && !story.calls.some((c) => c.id === story.pendingCall.id),
)

// Sets --phone-accent on the root of all phone UI so every descendant's CSS
// can just do var(--phone-accent, #4c8bf5) instead of hardcoding the hex —
// a project can override the phone's accent color via Réglages > Jeu
// (game.accentColor, see GameForm.vue) without touching any component.
// Left unset (not even the fallback) when no override exists, so CSS's own
// var(..., #4c8bf5) default is the single source of truth for "what the
// color is when nobody customized it."
// game.caseColor (see GameForm.vue) — recolors the outer frame/notch, only
// ever visible in the desktop mockup (a real-device `fillMobileViewport`
// render drops the frame entirely, see .fill-mobile below).
// --phone-accent-gradient: the same override, auto-turned into a two-stop
// gradient (see color.js's own comment) so the boot/wizard/lock/slot-picker/
// age-gate/réglages screens — which hardcode the engine's own default
// violet->pink duotone rather than a flat color — can re-theme too, without
// an author having to pick a second color themselves. Left unset when no
// override exists, same "CSS's own fallback is the single source of truth
// for the un-customized look" reasoning as --phone-accent itself.
const accentStyle = computed(() => {
  const color = story.gameConfig?.accentColor
  const caseColor = story.gameConfig?.caseColor
  const gradient = color ? accentGradient(color) : null
  return {
    ...(color ? { '--phone-accent': color } : {}),
    ...(gradient ? { '--phone-accent-gradient': gradient } : {}),
    ...(caseColor ? { '--phone-case': caseColor } : {}),
  }
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
  transform: `translate(-50%, -50%) scale(${canvasScale.value})`,
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
  background: var(--phone-case, #0b0b12);
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
  background: var(--phone-case, #0b0b12);
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

/* `vfx` timeline entry (see story.js triggerScreenEffect) — a purely
   cosmetic, non-blocking overlay above the app content, below the timeskip
   veil (z-index 50) so a timeskip cutting in mid-effect always wins. Each
   `.effect-*` variant below owns its own keyframes and lifetime; the veil
   element itself carries no shared animation so kinds never bleed into
   each other. */
.screen-effect-veil {
  position: absolute;
  inset: 0;
  z-index: 40;
  pointer-events: none;
}

/* color-channel-split glitch: two mis-registered color layers plus random
   horizontal slice jumps, both looping fast for the whole entry duration
   (story.js clears `screenEffect` itself once the entry's `duration` is up —
   this animation just keeps repeating until then). */
.screen-effect-veil.effect-glitch {
  mix-blend-mode: screen;
  background:
    repeating-linear-gradient(
      transparent 0 2px,
      rgba(255, 0, 90, 0.35) 2px 3px,
      transparent 3px 5px
    ),
    repeating-linear-gradient(90deg, rgba(0, 220, 255, 0.25) 0 1px, transparent 1px 4px);
  animation:
    glitch-jump 0.25s steps(2, end) infinite,
    glitch-flicker 0.12s steps(1, end) infinite;
}

@keyframes glitch-jump {
  0%,
  100% {
    transform: translate(0, 0);
    clip-path: inset(0 0 0 0);
  }
  20% {
    transform: translate(-6px, 0);
    clip-path: inset(10% 0 60% 0);
  }
  40% {
    transform: translate(5px, 0);
    clip-path: inset(55% 0 20% 0);
  }
  60% {
    transform: translate(-4px, 0);
    clip-path: inset(30% 0 45% 0);
  }
  80% {
    transform: translate(6px, 0);
    clip-path: inset(75% 0 5% 0);
  }
}

@keyframes glitch-flicker {
  0%,
  100% {
    opacity: 0.9;
  }
  50% {
    opacity: 0.5;
  }
}

/* data-corruption blocks — chunky colored bands (green/magenta) that jump
   position every frame, distinct from `.effect-glitch`'s red/cyan scanline
   split: blend mode `difference` (vs glitch's `screen`) plus bigger, blockier
   gradient bands read as corrupted memory/video blocks rather than a
   signal-desync line split. */
.screen-effect-veil.effect-corrupted {
  mix-blend-mode: difference;
  background:
    repeating-linear-gradient(0deg, rgba(0, 255, 140, 0.9) 0 6px, transparent 6px 26px),
    repeating-linear-gradient(90deg, rgba(255, 0, 200, 0.7) 0 10px, transparent 10px 46px);
  animation: corrupt-blocks 0.15s steps(1, end) infinite;
}

@keyframes corrupt-blocks {
  0% {
    background-position:
      0 0,
      0 0;
    clip-path: inset(0 0 0 0);
  }
  20% {
    background-position:
      37px 11px,
      -18px 4px;
    clip-path: inset(12% 0 63% 0);
  }
  40% {
    background-position:
      -22px 5px,
      29px -9px;
    clip-path: inset(58% 0 8% 0);
  }
  60% {
    background-position:
      14px -13px,
      -33px 17px;
    clip-path: inset(3% 0 71% 0);
  }
  80% {
    background-position:
      -9px 21px,
      12px -6px;
    clip-path: inset(66% 0 15% 0);
  }
  100% {
    background-position:
      0 0,
      0 0;
    clip-path: inset(0 0 0 0);
  }
}

/* power-cut blackout — a few quick flickers then holds solid black. Runs
   its keyframes ONCE (not `infinite` like the others): an infinite flicker
   loop would read as strobing rather than "the screen just died", and
   looping strobe effects are also a real photosensitivity concern. The
   final keyframe (opacity 1) matches the class's own non-animated state, so
   the veil stays solid black after the one-shot animation ends without
   needing `animation-fill-mode: forwards`. */
.screen-effect-veil.effect-blackout {
  background: #000;
  animation: blackout-flicker 0.9s steps(1, end) 1;
}

@keyframes blackout-flicker {
  0% {
    opacity: 1;
  }
  8% {
    opacity: 0;
  }
  16% {
    opacity: 1;
  }
  22% {
    opacity: 0;
  }
  30% {
    opacity: 1;
  }
  38% {
    opacity: 0.15;
  }
  46% {
    opacity: 1;
  }
  100% {
    opacity: 1;
  }
}

/* dead-channel TV static — animated noise via a tight repeating checker
   pattern shifted every frame, `steps()` (not `ease`) so it reads as random
   noise rather than a smooth scroll. */
.screen-effect-veil.effect-static {
  background-image: repeating-conic-gradient(#fff 0% 25%, #000 0% 50%);
  background-size: 3px 3px;
  opacity: 0.35;
  mix-blend-mode: overlay;
  animation: static-noise 0.2s steps(4, end) infinite;
}

@keyframes static-noise {
  0% {
    background-position: 0 0;
  }
  25% {
    background-position: 3px 1px;
  }
  50% {
    background-position: -2px 3px;
  }
  75% {
    background-position: 1px -2px;
  }
  100% {
    background-position: 0 0;
  }
}

/* cracked/shattered glass — a static (non-animated) web of hairline
   fractures radiating from an off-center impact point, drawn entirely with
   gradients (no image asset): a bright impact core, a dark falloff vignette,
   and repeating conic-gradient "spokes" for the crack lines. Fades in/out
   via the shared v-if mount/unmount rather than its own animation, since a
   real cracked screen doesn't move. */
.screen-effect-veil.effect-crack {
  background:
    radial-gradient(
      circle at 62% 38%,
      rgba(255, 255, 255, 0.9) 0%,
      rgba(255, 255, 255, 0.5) 1.5%,
      transparent 3%
    ),
    repeating-conic-gradient(
      from 0deg at 62% 38%,
      rgba(255, 255, 255, 0.5) 0deg 0.6deg,
      transparent 0.6deg 13deg
    ),
    radial-gradient(circle at 62% 38%, transparent 55%, rgba(0, 0, 0, 0.35) 100%);
  animation: crack-flash 0.5s ease-out 1;
}

@keyframes crack-flash {
  0% {
    opacity: 0;
  }
  15% {
    opacity: 1;
  }
  100% {
    opacity: 1;
  }
}

/* hard, fast screen-only shake (vs. `.phone-frame.ringing`'s gentler
   whole-frame wobble) — for an impact/malfunction beat rather than a
   ringing phone. Applied to `.phone-screen` itself (see `screen-shaking`
   class below), not this veil — the veil renders nothing for `effect-shake`
   (transparent, unanimated) since the actual shake needs to move the real
   screen content, and animating `transform` here (an absolutely-positioned
   child with no visible fill) would be invisible. `.phone-screen` is the
   right layer to shake rather than `.screen-canvas`: the canvas already
   carries its own inline `transform` (translate + scale, see canvasStyle)
   that a CSS keyframe `transform` would clobber instead of compose with. */
.screen-shaking {
  animation: screen-shake-hard 0.35s linear infinite;
}

@keyframes screen-shake-hard {
  0%,
  100% {
    transform: translate(0, 0);
  }
  20% {
    transform: translate(-5px, 3px);
  }
  40% {
    transform: translate(4px, -4px);
  }
  60% {
    transform: translate(-3px, -2px);
  }
  80% {
    transform: translate(5px, 2px);
  }
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
