<template>
  <div class="thread">
    <div class="thread-header">
      <button class="back-btn" :aria-label="t('common.back')" @click="$emit('back')">
        <q-icon name="chevron_left" size="26px" />
      </button>
      <AppAvatar :name="displayName" :color="contact.color" :image="contact.avatar" :size="30" />
      <span class="thread-title">{{ displayName }}</span>
    </div>

    <div ref="scrollEl" class="messages">
      <transition-group tag="div" name="bubble" class="messages-inner">
        <template v-for="item in chatItems" :key="item.id">
          <div v-if="item.kind === 'divider'" class="chat-label">{{ item.label }}</div>
          <div v-else class="bubble-row" :class="{ me: item.message.from === 'me' }">
            <div class="bubble-col">
              <img v-if="item.message.image" :src="resolveAssetUrl(item.message.image)" class="bubble-image" @load="scrollToBottom" />
              <div v-if="item.message.text" class="bubble">{{ item.message.text }}</div>
            </div>
          </div>
        </template>
        <div v-if="isTyping" key="typing" class="bubble-row">
          <div class="bubble-col">
            <div class="bubble typing-bubble">
              <span></span><span></span><span></span>
            </div>
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
      <span>{{ t('messages.waitingFor', { name: displayName }) }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, watch, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStoryStore } from '@/engine/stores/story'
import { resolveAssetUrl } from '@/engine/assets'
import { toChatItems } from '@/utils/chatTime'
import AppAvatar from '@/components/phone/AppAvatar.vue'

const props = defineProps({ contactId: { type: String, required: true } })
defineEmits(['back'])

const story = useStoryStore()
const { t } = useI18n()

const contact = computed(() => story.getContact(props.contactId))
const displayName = computed(() => story.contactName(props.contactId))
const messages = computed(() => story.contactMessages(props.contactId))
const chatItems = computed(() => toChatItems(messages.value, story.resolvedClock()))
const choice = computed(() =>
  story.activeChoice && story.activeChoice.contact === props.contactId ? story.activeChoice : null
)
const isTyping = computed(() => story.typingContact === props.contactId)

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
  // vertical space the message list actually has (choice box appearing,
  // typing dots appearing) — not just the message count itself.
  [() => messages.value.length, isTyping, choice],
  () => {
    nextTick(scrollToBottom)
  }
)
</script>

<style scoped>
.thread {
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
  gap: 6px;
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

.bubble-row.me {
  justify-content: flex-end;
}

.bubble-col {
  max-width: 75%;
  display: flex;
  flex-direction: column;
  gap: 4px;
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
  background: #4c8bf5;
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

.input-bar {
  padding: 10px 14px 16px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
  flex-shrink: 0;
}
</style>
