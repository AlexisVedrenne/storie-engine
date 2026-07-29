<template>
  <div class="app-screen">
    <transition name="screen-swap" mode="out-in">
      <div v-if="!openContactId" key="list" class="list-stack">
        <AppTitleBar :title="t('email.title')" icon="mail" color="#3f8cff" @back="phone.goHome()" />

        <div class="search-bar">
          <q-icon name="search" size="17px" color="#7db2ff" />
          <input v-model="query" type="text" :placeholder="t('email.searchPlaceholder')" />
        </div>

        <div class="conv-list">
          <div v-if="!conversations.length" class="empty">
            <q-icon name="mail" size="46px" />
            <span>{{ t('email.empty') }}</span>
          </div>
          <div v-else-if="!filteredConversations.length" class="empty">
            <q-icon name="search_off" size="46px" />
            <span>{{ t('email.noResults', { query }) }}</span>
          </div>
          <button
            v-for="(c, i) in filteredConversations"
            :key="c.id"
            class="conv-row"
            :style="{ animationDelay: `${i * 40}ms` }"
            @click="open(c.id)"
          >
            <AppAvatar :name="c.name" :color="c.color" :image="c.avatar" :size="46" />
            <div class="conv-info">
              <div class="conv-name">{{ c.name }}</div>
              <div class="conv-preview">{{ c.preview }}</div>
            </div>
            <div class="conv-meta">
              <span class="conv-time">{{ c.time }}</span>
              <span v-if="c.unread" class="unread-dot">{{ c.unread }}</span>
            </div>
          </button>
        </div>
      </div>

      <div v-else key="thread" class="thread-stack">
        <AppTitleBar :title="threadContactName" icon="mail" color="#3f8cff" @back="openContactId = null" />
        <div class="thread-scroll">
          <div v-for="mail in threadEmails" :key="mail.id" class="mail-card">
            <div class="mail-subject">{{ mail.subject }}</div>
            <div class="mail-text">{{ mail.text }}</div>
            <div class="mail-time">{{ formatTime(mail.ts) }}</div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePhoneStore } from '@/engine/stores/phone'
import { useStoryStore } from '@/engine/stores/story'
import AppTitleBar from '@/components/phone/AppTitleBar.vue'
import AppAvatar from '@/components/phone/AppAvatar.vue'

const phone = usePhoneStore()
const story = useStoryStore()
const { t } = useI18n()
const query = ref('')

// Local, not phone store — a plug-in app doesn't need core changes just to
// track "which thread am I looking at" for itself.
const openContactId = ref(null)

function formatTime(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso || ''
  return d.toLocaleTimeString(story.activeLocale, { hour: '2-digit', minute: '2-digit' })
}

const emailsByContact = computed(() => story.customData?.emails || {})

const conversations = computed(() =>
  Object.keys(emailsByContact.value)
    .filter((id) => emailsByContact.value[id]?.length)
    .map((id) => {
      const contact = story.getContact(id)
      const thread = emailsByContact.value[id]
      const last = thread[thread.length - 1]
      return {
        id,
        name: story.contactName(id),
        color: contact.color,
        avatar: contact.avatar,
        preview: last ? last.subject : '',
        time: last ? formatTime(last.ts) : '',
        unread: story.customData?.emailUnread?.[id] || 0,
      }
    }),
)

const filteredConversations = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return conversations.value
  return conversations.value.filter((c) => c.name.toLowerCase().includes(q))
})

const threadEmails = computed(() => emailsByContact.value[openContactId.value] || [])
const threadContactName = computed(() => (openContactId.value ? story.contactName(openContactId.value) : ''))

function open(id) {
  openContactId.value = id
  if (story.customData.emailUnread) story.customData.emailUnread[id] = 0
}
</script>

<style scoped>
.app-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.list-stack,
.thread-stack {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.screen-swap-enter-active,
.screen-swap-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.22s cubic-bezier(0.34, 1.2, 0.64, 1);
}

.screen-swap-enter-from {
  opacity: 0;
  transform: translateX(14px);
}

.screen-swap-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 16px 10px;
  padding: 9px 12px;
  border-radius: 11px;
  background: rgba(63, 140, 255, 0.12);
  border: 1px solid rgba(63, 140, 255, 0.25);
  flex-shrink: 0;
}

.search-bar input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: #fff;
  font-size: 14px;
}

.search-bar input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.conv-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  color: rgba(255, 255, 255, 0.35);
  font-size: 13px;
  text-align: center;
}

.conv-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  background: none;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding: 12px 14px;
  cursor: pointer;
  text-align: left;
  transition: transform 0.12s ease;
  animation: row-in 0.28s cubic-bezier(0.34, 1.2, 0.64, 1) both;
}

.conv-row:active {
  transform: scale(0.98);
  background: rgba(255, 255, 255, 0.04);
}

@keyframes row-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.conv-info {
  flex: 1;
  min-width: 0;
  color: #fff;
}

.conv-name {
  font-weight: 600;
  font-size: 14px;
}

.conv-preview {
  font-size: 12px;
  opacity: 0.6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conv-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex-shrink: 0;
}

.conv-time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

.unread-dot {
  background: var(--phone-accent, #3f8cff);
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
}

.thread-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mail-card {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px 14px;
}

.mail-subject {
  font-weight: 600;
  font-size: 14px;
  color: #fff;
  margin-bottom: 4px;
}

.mail-text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.4;
}

.mail-time {
  margin-top: 6px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}
</style>
