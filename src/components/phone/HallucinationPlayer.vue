<template>
  <div class="hallucination-player">
    <div v-if="headerContact" class="thread-header">
      <button type="button" class="back-btn" tabindex="-1">
        <q-icon name="chevron_left" size="26px" />
      </button>
      <button type="button" class="thread-identity" tabindex="-1">
        <AppAvatar
          :name="headerContact.name"
          :color="headerContact.color"
          :image="headerContact.socialAvatar"
          :size="30"
        />
        <span class="thread-title">{{ story.socialHandle(headerContact) }}</span>
      </button>
      <span class="header-spacer" />
    </div>

    <div ref="scrollEl" class="messages">
      <div class="messages-inner">
        <template v-for="(msg, i) in visibleMessages" :key="i">
          <div class="bubble-row" :class="{ me: msg.from === 'me' }">
            <AppAvatar
              v-if="msg.from !== 'me'"
              class="sender-avatar"
              :name="senderContact(msg.from).name"
              :color="senderContact(msg.from).color"
              :image="senderContact(msg.from).socialAvatar"
              :size="24"
            />
            <div class="bubble-col">
              <div v-if="msg.from !== 'me'" class="sender-name">{{ senderName(msg.from) }}</div>
              <div class="bubble">{{ msg.text }}</div>
            </div>
          </div>
        </template>
        <div v-if="isTyping" class="bubble-row" :class="{ me: typingFrom === 'me' }">
          <AppAvatar
            v-if="typingFrom !== 'me'"
            class="sender-avatar"
            :name="senderContact(typingFrom).name"
            :color="senderContact(typingFrom).color"
            :image="senderContact(typingFrom).socialAvatar"
            :size="24"
          />
          <div class="bubble-col">
            <div v-if="typingFrom !== 'me'" class="sender-name">{{ senderName(typingFrom) }}</div>
            <div class="bubble typing-bubble"><span></span><span></span><span></span></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// A hallucinated "conversation" the player can only watch, never touch —
// see story.js's 'hallucination' entry: a fixed-vocabulary sibling of
// `interaction`/`timeskip` (a `messages[]` list authored on the entry, not
// project state — see HallucinationEntryForm.vue), reusing the SAME
// enter/exit glitch mechanism a `vfx` entry already has (VFX_KINDS,
// story.triggerScreenEffect) for the "reality tearing" transition in/out.
// Deliberately writes to NOTHING persistent — the messages shown here never
// touch igThreads/customData/any real thread, so there's nothing to undo
// once it's over; the whole point is a glimpse that never really happened.
//
// Markup/bubble CSS is a deliberate close copy of the real Pixly DM thread
// (src/components/apps/social/DmThreadScreen.vue) — user asked for "l'exact
// même interface", down to the header/chevron, so it reads as a genuine
// conversation right up until the glitch — full-bleed message list,
// per-sender avatar+name (every sender treated like a group thread's,
// since unlike a real DM this has no single fixed "other contact", each
// message picks its own `from`), same bubble/typing-dot styling, same
// thread-header/back-btn/thread-identity markup+CSS. The back button/
// avatar row is decorative only (see their own CSS comment) — there's
// nothing to navigate to, this can't be exited early. Only genuinely
// dropped: the input-bar/choice-box (no player input exists here at all).
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import AppAvatar from '@/components/phone/AppAvatar.vue'

const props = defineProps({ messages: { type: Array, default: () => [] } })
const emit = defineEmits(['finish'])
const story = useStoryStore()

// Same "typing time scales with text length" formula story.js's own
// (private) typingDelay() uses for real SMS/DM — duplicated here rather
// than imported since story.js doesn't export it and this component has no
// other reason to reach into the store's internals.
function typingDelay(text) {
  return Math.min(2600, Math.max(650, 350 + (text || '').length * 32))
}

const START_DELAY_MS = 350 // lets the enter glitch read before the first line starts
const GAP_MS = 260 // pause between one bubble landing and the next "typing" beat
// Deliberately short — the cut back to reality should read as an abrupt
// interruption ("wtf just happened"), not a lingering fade the player has
// time to sit with and re-read the last line. (First cut used 1400ms here;
// user asked for the whole end-of-hallucination beat to be fast.)
const HOLD_AFTER_LAST_MS = 350

const visibleCount = ref(0)
const isTyping = ref(false)
const visibleMessages = computed(() => props.messages.slice(0, visibleCount.value))
const typingFrom = computed(() => props.messages[visibleCount.value]?.from)

function senderContact(id) {
  return story.getContact(id)
}
function senderName(id) {
  return story.contactName(id) || id
}

// "Who this hallucinated conversation is with" — the same identity a real
// 1:1 DM thread's own header shows (avatar + socialHandle, see
// DmThreadScreen.vue). Messages can technically mix senders (no fixed
// thread concept here, see HallucinationEntryForm.vue), so this picks the
// first non-'me' sender authored — the common case is one imagined
// contact, same as how the player would actually read it.
const headerContact = computed(() => {
  const first = props.messages.find((m) => m.from !== 'me')
  return first ? story.getContact(first.from) : null
})

const scrollEl = ref(null)
function scrollToBottom() {
  if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
}
watch([visibleCount, isTyping], () => nextTick(scrollToBottom))

let timer = null
function playNext() {
  if (visibleCount.value >= props.messages.length) {
    timer = setTimeout(() => emit('finish'), HOLD_AFTER_LAST_MS)
    return
  }
  const msg = props.messages[visibleCount.value]
  isTyping.value = true
  timer = setTimeout(() => {
    isTyping.value = false
    visibleCount.value++
    timer = setTimeout(playNext, GAP_MS)
  }, typingDelay(msg?.text))
}

onMounted(() => {
  // No messages authored at all — nothing to play, finish immediately
  // rather than hang the timeline forever on a blocking entry.
  if (!props.messages.length) {
    emit('finish')
    return
  }
  timer = setTimeout(playNext, START_DELAY_MS)
})
onBeforeUnmount(() => clearTimeout(timer))
</script>

<style scoped>
.hallucination-player {
  position: absolute;
  overflow: hidden;
  inset: 0;
  z-index: 35;
  display: flex;
  flex-direction: column;
  /* Slightly off the real phone screen's own #1c1c28 (see PhoneShell.vue's
     .phone-screen) — same "subtly wrong" idea as the bubble palette below,
     a violet-leaning tint instead of the neutral blue-black everything
     else on the phone uses. */
  background: #221c30;
  /* Constant, SOFT tell that this isn't the real app — NOT the same
     language as PhoneShell's own .screen-effect-veil.effect-glitch (hard
     color-channel split + position jumps, reserved for the sharp
     enter/exit transition burst). The user wanted this constant cue to
     feel like "quelque chose de flou dans la tête, comme un souvenir" —
     a hazy, breathing memory, not digital corruption — so: a slow,
     gentle blur+desaturation breath (never sharp/jarring) plus a soft
     pulsing vignette below, instead of any hue/glitch flicker. */
  animation: halluc-haze 6s ease-in-out infinite;
}

@keyframes halluc-haze {
  0%,
  100% {
    filter: blur(0) saturate(0.9) brightness(1);
  }
  50% {
    filter: blur(0.7px) saturate(0.65) brightness(0.94);
  }
}

/* Soft vignette breathing in and out — reads as tunnel-vision/recollection
   rather than a screen malfunction, layered above the message list but
   below nothing (pointer-events off, purely decorative). */
.hallucination-player::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: radial-gradient(ellipse at center, transparent 40%, rgba(10, 6, 20, 0.55) 100%);
  animation: halluc-vignette 6s ease-in-out infinite;
}

@keyframes halluc-vignette {
  0%,
  100% {
    opacity: 0.45;
  }
  50% {
    opacity: 0.8;
  }
}

/* Punchier periodic glitch — the haze/vignette above carry the "hazy
   memory" feeling, this layer carries "it's still a PHONE screen" (user's
   own framing): a brief RGB-split + jitter flash every ~4.5s, on its own
   pseudo-element (not sharing the container's own `filter` animation, so
   it doesn't fight halluc-haze for that property) — same color-split
   technique as PhoneShell's .effect-glitch, just a short burst instead of
   a continuous loop, and confined to this overlay rather than the whole
   phone screen. */
.hallucination-player::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  mix-blend-mode: screen;
  background:
    repeating-linear-gradient(
      transparent 0 2px,
      rgba(255, 0, 90, 0.32) 2px 3px,
      transparent 3px 5px
    ),
    repeating-linear-gradient(90deg, rgba(0, 220, 255, 0.24) 0 1px, transparent 1px 4px);
  opacity: 0;
  animation: halluc-glitch-burst 4.5s steps(1, end) infinite;
}

@keyframes halluc-glitch-burst {
  0%,
  91%,
  100% {
    opacity: 0;
    transform: translate(0, 0);
  }
  92% {
    opacity: 0.85;
    transform: translate(-4px, 0);
  }
  93% {
    opacity: 0;
    transform: translate(0, 0);
  }
  94.5% {
    opacity: 0.7;
    transform: translate(3px, 0);
  }
  95.5% {
    opacity: 0;
    transform: translate(0, 0);
  }
}

/* Copied verbatim from DmThreadScreen.vue's own .thread-header/.thread-title
   (minus its back-btn/thread-identity click wrapper — nothing to navigate
   to here) — this was the actual bug: the markup above already matched
   DmThreadScreen's, but these two rules were never added, so the header
   rendered with zero layout (no flex, no padding, no border) instead of
   looking like the real one. */
.thread-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 6px;
  color: #fff;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

/* Decorative only — see the template comment on why this stays a visual
   match down to the chevron rather than dropping it, even though there's
   nothing to actually navigate back to (cursor stays default, not
   pointer, so it doesn't falsely invite a tap the way the rest of this
   screen already doesn't). */
.back-btn {
  background: none;
  border: none;
  color: inherit;
  cursor: default;
  display: flex;
  align-items: center;
  padding: 2px;
  flex-shrink: 0;
}

/* Centered, unlike DmThreadScreen's own 1:1 header (avatar+name packed to
   the left next to the back button, no centering) — same centering trick
   as AppHeader.vue's own `.title` uses for a GROUP thread's header
   (flex:1 + justify-content:center + a same-width trailing spacer to
   balance the back button), just applied to an avatar+name cluster
   instead of plain text. This is what the user meant by "le texte du
   header est centré" — the reference they had in mind. */
.thread-identity {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: none;
  border: none;
  color: inherit;
  padding: 2px;
  cursor: default;
}

.header-spacer {
  width: 26px;
  flex-shrink: 0;
}

.thread-title {
  font-weight: 600;
  font-size: 15px;
}

.messages {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px 12px;
}

.messages-inner {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bubble-row {
  display: flex;
  align-items: flex-end;
  gap: 6px;
}

.bubble-row.me {
  justify-content: flex-end;
}

.sender-avatar {
  flex-shrink: 0;
}

.bubble-col {
  max-width: 75%;
  display: flex;
  flex-direction: column;
  gap: 4px;
  animation: bubble-in 0.25s cubic-bezier(0.34, 1.3, 0.64, 1) both;
}

.sender-name {
  font-size: 10.5px;
  color: #fff;
  opacity: 0.55;
  padding-left: 4px;
}

/* Deliberately NOT the real Pixly bubble colors (#2e2e3d / pink-purple
   #ee2a7b→#6228d7, see DmThreadScreen.vue) — an "off" palette (violet-
   tinted instead of neutral gray, teal-violet instead of pink-purple) is
   its own tell, on top of the haze/vignette/glitch above: a player who's
   seen enough real conversations should feel these colors are subtly
   wrong even before consciously noticing why. */
.bubble {
  padding: 8px 12px;
  border-radius: 16px;
  background: #3a2c4d;
  color: #fff;
  font-size: 14px;
  line-height: 1.35;
}

.bubble-row.me .bubble {
  background: linear-gradient(135deg, #7b2eee, #22a8a0);
}

@keyframes bubble-in {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.typing-bubble {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 11px 14px;
}

.typing-bubble span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
  animation: typing-bounce 1s ease-in-out infinite;
}

.typing-bubble span:nth-child(2) {
  animation-delay: 0.15s;
}

.typing-bubble span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes typing-bounce {
  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  30% {
    transform: translateY(-4px);
    opacity: 1;
  }
}
</style>
