<template>
  <div class="dm-thread">
    <div v-if="!meta.group" class="thread-header">
      <button class="back-btn" :aria-label="t('common.back')" @click="$emit('back')">
        <q-icon name="chevron_left" size="26px" />
      </button>
      <button class="thread-identity" @click="$emit('open-profile', otherContact.id)">
        <AppAvatar
          :name="otherContact.name"
          :color="otherContact.color"
          :image="otherContact.socialAvatar"
          :size="30"
        />
        <span class="thread-title">{{ title }}</span>
      </button>
    </div>
    <AppHeader v-else :title="title" @back="$emit('back')" />

    <div ref="scrollEl" class="messages">
      <transition-group tag="div" name="bubble" class="messages-inner">
        <template v-for="item in chatItems" :key="item.id">
          <div v-if="item.kind === 'divider'" class="chat-label">{{ item.label }}</div>
          <div v-else class="bubble-row" :class="{ me: item.message.from === 'me' }">
            <button
              v-if="meta.group && item.message.from !== 'me'"
              class="sender-avatar-btn"
              @click="$emit('open-profile', item.message.from)"
            >
              <AppAvatar
                :name="story.getContact(item.message.from).name"
                :color="story.getContact(item.message.from).color"
                :image="story.getContact(item.message.from).socialAvatar"
                :size="24"
              />
            </button>
            <div class="bubble-col">
              <div v-if="meta.group && item.message.from !== 'me'" class="sender-name">
                {{ story.socialHandle(story.getContact(item.message.from)) }}
              </div>
              <img
                v-if="item.message.image"
                :src="resolveAssetUrl(item.message.image)"
                class="bubble-image"
                @load="scrollToBottom"
              />
              <div v-if="item.message.text" class="bubble">{{ item.message.text }}</div>
            </div>
          </div>
        </template>
        <div v-if="isTyping" key="typing" class="bubble-row">
          <AppAvatar
            v-if="meta.group"
            class="sender-avatar-btn"
            :name="story.getContact(story.typingDm.contact).name"
            :color="story.getContact(story.typingDm.contact).color"
            :image="story.getContact(story.typingDm.contact).socialAvatar"
            :size="24"
          />
          <div class="bubble-col">
            <div v-if="meta.group" class="sender-name">
              {{ story.socialHandle(story.getContact(story.typingDm.contact)) }}
            </div>
            <div class="bubble typing-bubble"><span></span><span></span><span></span></div>
          </div>
        </div>
      </transition-group>
    </div>

    <div v-if="choice" class="choice-box">
      <div class="choice-prompt">{{ choice.prompt }}</div>
      <button
        v-for="(opt, i) in choice.options"
        :key="i"
        class="choice-btn"
        @click="story.makeChoice(i)"
      >
        {{ opt.text }}
      </button>
    </div>
    <div v-else class="input-bar">
      <span>{{ t('social.dmPrivateNotice') }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStoryStore } from '@/engine/stores/story'
import { resolveAssetUrl } from '@/engine/assets'
import { toChatItems } from '@/utils/chatTime'
import AppHeader from '@/components/phone/AppHeader.vue'
import AppAvatar from '@/components/phone/AppAvatar.vue'

const props = defineProps({ threadId: { type: String, required: true } })
defineEmits(['back', 'open-profile'])

const story = useStoryStore()
const { t } = useI18n()
const meta = computed(() => story.getThread(props.threadId))
const messages = computed(() => story.igThreads[props.threadId] || [])
const chatItems = computed(() => toChatItems(messages.value, story.resolvedClock()))
const choice = computed(() =>
  story.activeChoice && story.activeChoice.thread === props.threadId ? story.activeChoice : null,
)
const isTyping = computed(() => story.typingDm && story.typingDm.thread === props.threadId)

// the other participant in a 1:1 thread — used both for the title (via
// socialHandle, e.g. "@pseudo") and for the header avatar (real name/color
// as AppAvatar's fallback, socialAvatar as the actual Pixly photo).
const otherContact = computed(() => story.getContact(meta.value.participants[0]))
const title = computed(() =>
  meta.value.group
    ? story.translateStory(meta.value.name, 'common')
    : story.socialHandle(otherContact.value),
)

onMounted(() => story.markDmRead(props.threadId))

const scrollEl = ref(null)
function scrollToBottom() {
  if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
}
// `immediate: true` on the watch below would fire during setup(), before the
// component has mounted — scrollEl.value is still null at that point, even
// behind a nextTick(), because nothing has been queued for Vue to flush yet.
// onMounted() is what actually guarantees the ref is bound, for the initial
// scroll when the conversation is first opened.
onMounted(scrollToBottom)
watch(
  // choice/isTyping are included because either one changes how much
  // vertical space the message list actually has, not just the message count.
  [() => messages.value.length, isTyping, choice],
  () => {
    nextTick(scrollToBottom)
  },
)
</script>

<style scoped>
.dm-thread {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.thread-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 6px;
  color: #fff;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.back-btn {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 2px;
  flex-shrink: 0;
}

.thread-identity {
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  color: inherit;
  padding: 2px;
  cursor: pointer;
  transition: transform 0.12s ease;
}

.thread-identity:active {
  transform: scale(0.97);
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

.chat-label {
  align-self: center;
  margin: 6px 0 2px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
}

.bubble-row {
  display: flex;
  align-items: flex-end;
  gap: 6px;
}

.sender-avatar-btn {
  flex-shrink: 0;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  display: flex;
  transition: transform 0.12s ease;
}

.sender-avatar-btn:active {
  transform: scale(0.9);
}

.bubble-enter-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s cubic-bezier(0.34, 1.2, 0.64, 1);
}

.bubble-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.96);
}

/* Mostly relevant for the typing indicator disappearing with no message
   replacing it (see story.js's `fakeTyping` entry) — a real message
   arriving masks the removal since something else pops in at the same
   moment, but the typing dots vanishing into nothing needs their own soft
   fade or it reads as an abrupt glitch instead of a deliberate beat.
   Deliberately NOT `position: absolute` here — that pulls the element out
   of the flex column while it's still fading, and since flex layout has
   no static "was here" fallback for an absolutely-positioned child, it
   snapped to the top of the nearest positioned ancestor instead of fading
   in place (confirmed live: it visibly flew upward instead of just
   dissolving). A plain opacity fade with no position change is enough —
   the typing row is always the last element, nothing below it to reflow. */
.bubble-leave-active {
  transition: opacity 0.35s ease;
}

.bubble-leave-to {
  opacity: 0;
}

.bubble-row.me {
  justify-content: flex-end;
}

.bubble-col {
  max-width: 75%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sender-name {
  font-size: 10.5px;
  color: #fff;
  opacity: 0.55;
  padding-left: 4px;
}

.bubble {
  padding: 8px 12px;
  border-radius: 16px;
  background: #2e2e3d;
  color: #fff;
  font-size: 14px;
  line-height: 1.35;
}

.bubble-row.me .bubble {
  background: linear-gradient(135deg, #ee2a7b, #6228d7);
}

.bubble-image {
  width: 100%;
  border-radius: 14px;
  display: block;
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

.input-bar {
  padding: 10px 14px 16px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 11.5px;
  flex-shrink: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.choice-box {
  padding: 10px 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
  animation: choices-in 0.24s cubic-bezier(0.34, 1.2, 0.64, 1) both;
}

@keyframes choices-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.choice-prompt {
  font-size: 12px;
  opacity: 0.7;
  color: #fff;
  margin-bottom: 2px;
}

.choice-btn {
  background: #2e2e3d;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 14px;
  padding: 8px 12px;
  text-align: left;
  font-size: 14px;
  cursor: pointer;
  transition:
    background 0.15s ease,
    transform 0.12s ease;
}

.choice-btn:hover {
  background: #3a3a4d;
}

.choice-btn:active {
  transform: scale(0.97);
}
</style>
