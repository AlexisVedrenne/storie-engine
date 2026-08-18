<template>
  <div class="conversations-block">
    <div v-if="!openThreadId" class="thread-list">
      <div v-if="!threads.length" class="empty">{{ t('customApps.conversations.empty') }}</div>
      <button v-for="th in threads" :key="th.id" class="thread-row" @click="openThread(th.id)">
        <AppAvatar
          v-if="block.showAvatar"
          :name="rowName(th)"
          :color="rowColor(th)"
          :image="rowImage(th)"
          :size="44"
        />
        <div class="thread-info">
          <div class="thread-name">{{ rowName(th) }}</div>
          <div class="thread-preview">{{ th.preview }}</div>
        </div>
        <span v-if="th.unread" class="unread-dot">{{ th.unread }}</span>
      </button>
    </div>

    <div v-else class="thread-view">
      <div class="thread-header">
        <button class="back-btn" :aria-label="t('common.back')" @click="closeThread">
          <q-icon name="chevron_left" size="26px" />
        </button>
        <AppAvatar
          v-if="block.showAvatar"
          :name="headerName"
          :color="headerColor"
          :image="headerImage"
          :size="30"
        />
        <span class="thread-title">{{ headerName }}</span>
      </div>

      <div ref="scrollEl" class="messages">
        <div class="messages-inner">
          <template v-for="item in chatItems" :key="item.id">
            <div v-if="item.kind === 'divider'" class="chat-label">{{ item.label }}</div>
            <div v-else class="bubble-row" :class="{ me: item.message.from === 'me' }">
              <AppAvatar
                v-if="block.showAvatar && meta.group && item.message.from !== 'me'"
                class="sender-avatar"
                :name="displayName(item.message.from)"
                :color="story.getContact(item.message.from).color"
                :image="story.getContact(item.message.from).avatar"
                :size="24"
              />
              <div class="bubble-col">
                <div v-if="meta.group && item.message.from !== 'me'" class="sender-name">
                  {{ displayName(item.message.from) }}
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
          <div v-if="isTyping" class="bubble-row">
            <AppAvatar
              v-if="block.showAvatar && meta.group"
              class="sender-avatar"
              :name="displayName(story.typingAppDm.contact)"
              :color="story.getContact(story.typingAppDm.contact).color"
              :image="story.getContact(story.typingAppDm.contact).avatar"
              :size="24"
            />
            <div class="bubble-col">
              <div v-if="meta.group" class="sender-name">
                {{ displayName(story.typingAppDm.contact) }}
              </div>
              <div class="bubble typing-bubble"><span></span><span></span><span></span></div>
            </div>
          </div>
        </div>
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
        <span>{{ t('customApps.conversations.privateNotice') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
// The one "real" custom-app block — reads/writes actual game state instead
// of just rendering authored data (see blockKinds.js's own comment on
// 'conversations'). Deliberately reuses the NATIVE Pixly DM engine
// mechanics (story.js's pushDm/igThreads family) wholesale, just re-keyed
// per (appId, threadId) instead of one global bucket — see story.js's own
// appThreads/appThreadsList/pushAppMessage comments for why. Layout/markup
// closely mirrors src/components/apps/social/DmListScreen.vue +
// DmThreadScreen.vue (the native Pixly DM list + thread screens) — same
// group-vs-1:1 rendering rules, same choice-box/typing-dots mechanics.
//
// Navigation between the thread list and an open thread is LOCAL to this
// block instance (openThreadId, a plain ref) rather than phone-level state
// like the native apps' phone.activeConversation/activeDmThread — the
// author explicitly wanted this to stay "inside the app's own screen", not
// take over the whole phone. phone.activeAppThread is the one exception:
// written here specifically so pushAppMessage() (story.js) has a
// phone-level signal to check for "already viewing this exact thread",
// same as isViewingDmThread/isViewingConversation do for the native paths
// — everything else about navigation stays local.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePhoneStore } from '@/engine/stores/phone'
import { useStoryStore } from '@/engine/stores/story'
import { resolveAssetUrl } from '@/engine/assets'
import { toChatItems } from '@/utils/chatTime'
import AppAvatar from '@/components/phone/AppAvatar.vue'

const props = defineProps({ block: { type: Object, required: true } })
const phone = usePhoneStore()
const story = useStoryStore()
const { t } = useI18n()

const threads = computed(() => story.appThreadsList(phone.currentApp))

// Thread DEFINITIONS (id/name/participants for a group; nothing needed for
// a 1:1) are the project's own native `project.threads` — reused via
// story.getThread()/findThread() exactly like DmListScreen.vue/
// DmThreadScreen.vue, not re-authored per block/app. Only the MESSAGE
// HISTORY is app-scoped (story.appThreads, via `threads` above).
function displayName(contactId) {
  const contact = story.getContact(contactId)
  return props.block.nameField === 'pseudo' ? story.socialHandle(contact) : contact.name
}
// Same 'common' i18n bucket a native project.threads group name goes
// through (see story.js's dmThreadsList/DmThreadScreen.vue) — translated
// at the use site, not stored, matching the native pattern.
function groupName(meta) {
  return story.translateStory(meta.name, 'common')
}

function rowName(row) {
  const m = story.getThread(row.id)
  return m.group ? groupName(m) : displayName(m.participants[0])
}
function rowColor(row) {
  const m = story.getThread(row.id)
  return m.group ? '#607d8b' : story.getContact(m.participants[0]).color
}
function rowImage(row) {
  const m = story.getThread(row.id)
  return m.group ? '' : story.getContact(m.participants[0]).avatar
}

// phone.pendingThreadId (set by openApp(), see phone.js) deep-links straight
// into a specific thread instead of the list view — read and immediately
// cleared here (consumed once, same pattern as CustomAppRenderer.vue's own
// pendingScreenId) so a later organic re-open of this app/screen never
// reuses a stale target. If the app has more than one `conversations` block
// on the same screen, only the first one mounted claims it — an unlikely
// authoring shape, not worth extra guarding.
const initialThreadId = phone.pendingThreadId
phone.pendingThreadId = null
const openThreadId = ref(initialThreadId || null)
if (initialThreadId) {
  story.markAppThreadRead(phone.currentApp, initialThreadId)
  phone.openAppThread(phone.currentApp, initialThreadId)
}
const meta = computed(() => story.getThread(openThreadId.value))
const headerName = computed(() =>
  meta.value.group ? groupName(meta.value) : displayName(meta.value.participants[0]),
)
const headerColor = computed(() =>
  meta.value.group ? '#607d8b' : story.getContact(meta.value.participants[0]).color,
)
const headerImage = computed(() =>
  meta.value.group ? '' : story.getContact(meta.value.participants[0]).avatar,
)

const messages = computed(() => story.appThreadMessages(phone.currentApp, openThreadId.value))
const chatItems = computed(() => toChatItems(messages.value, story.resolvedClock()))
const choice = computed(() =>
  story.activeChoice &&
  story.activeChoice.app === phone.currentApp &&
  story.activeChoice.thread === openThreadId.value
    ? story.activeChoice
    : null,
)
const isTyping = computed(
  () =>
    story.typingAppDm &&
    story.typingAppDm.app === phone.currentApp &&
    story.typingAppDm.thread === openThreadId.value,
)

function openThread(id) {
  openThreadId.value = id
  story.markAppThreadRead(phone.currentApp, id)
  phone.openAppThread(phone.currentApp, id)
}
function closeThread() {
  openThreadId.value = null
  phone.closeAppThread()
}

const scrollEl = ref(null)
function scrollToBottom() {
  if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
}
watch(openThreadId, () => nextTick(scrollToBottom))
watch([() => messages.value.length, isTyping, choice], () => nextTick(scrollToBottom))
onMounted(scrollToBottom)
// Belt-and-suspenders: also cleared by phone.js's own openApp()/goHome()/
// lock()/requestReboot() (leaving the app entirely), but this block can
// also disappear on its own — a `tabs` block switching away from the
// screen it lives on unmounts it directly, which none of those phone.js
// actions observe.
onBeforeUnmount(() => phone.closeAppThread())
</script>

<style scoped>
.conversations-block {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}

.thread-list {
  display: flex;
  flex-direction: column;
}

.empty {
  padding: 24px 12px;
  color: rgba(255, 255, 255, 0.35);
  font-size: 13px;
  text-align: center;
}

.thread-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  background: none;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding: 10px 4px;
  cursor: pointer;
  text-align: left;
}

.thread-info {
  flex: 1;
  min-width: 0;
  color: #fff;
}

.thread-name {
  font-weight: 600;
  font-size: 14px;
}

.thread-preview {
  font-size: 12px;
  opacity: 0.6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.unread-dot {
  background: #ee2a7b;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  flex-shrink: 0;
}

.thread-view {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}

.thread-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
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
  padding: 10px 0;
  min-height: 120px;
  max-height: 360px;
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
  padding: 8px 4px 4px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 11.5px;
  flex-shrink: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.choice-box {
  padding: 10px 4px 4px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
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
}
</style>
