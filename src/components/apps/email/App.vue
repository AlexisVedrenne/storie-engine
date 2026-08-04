<template>
  <div class="app-screen">
    <transition name="screen-swap" mode="out-in">
      <div v-if="!openEmailId" key="list" class="list-stack">
        <!-- Gmail's own header IS the search bar — no big app-name title
             like every other app here (AppTitleBar). Back arrow, a rounded
             search pill taking most of the width, the player's own avatar
             on the right (Gmail always shows the signed-in account there). -->
        <div class="gmail-header">
          <button class="icon-btn" :aria-label="t('common.back')" @click="phone.goHome()">
            <q-icon name="chevron_left" size="24px" />
          </button>
          <div class="gmail-search">
            <q-icon name="search" size="17px" color="rgba(255,255,255,0.45)" />
            <input v-model="query" type="text" :placeholder="t('email.searchPlaceholder')" />
          </div>
          <AppAvatar :name="story.playerName || '?'" :color="story.myColor" :size="30" />
        </div>

        <div class="inbox-list">
          <div v-if="!emails.length" class="empty">
            <q-icon name="mail" size="46px" />
            <span>{{ t('email.empty') }}</span>
          </div>
          <div v-else-if="!filteredEmails.length" class="empty">
            <q-icon name="search_off" size="46px" />
            <span>{{ t('email.noResults', { query }) }}</span>
          </div>
          <button
            v-for="(mail, i) in filteredEmails"
            :key="mail.id"
            class="mail-row"
            :class="{ unread: !mail.read }"
            :style="{ animationDelay: `${i * 40}ms` }"
            @click="open(mail.id)"
          >
            <AppAvatar
              :name="mail.fromName || mail.fromEmail || '?'"
              :color="colorFor(mail)"
              :size="42"
              class="mail-avatar"
            />
            <div class="mail-info">
              <div class="mail-row-top">
                <span class="mail-from">{{ mail.fromName || mail.fromEmail }}</span>
                <span class="mail-time">{{ formatTime(mail.ts) }}</span>
              </div>
              <div class="mail-preview">
                <span class="mail-subject-inline">{{ mail.subject }}</span>
                <span v-if="mail.text"> — {{ mail.text }}</span>
              </div>
            </div>
          </button>
        </div>

        <!-- Purely decorative, same "authentic silhouette, no real backend"
             precedent as the fake SIM keypad/Wi-Fi list in SetupWizard.vue
             — the point is Gmail's iconic red compose FAB, not a real
             compose flow (there's no one for the player to write TO in
             this engine). -->
        <button class="compose-fab" :aria-label="t('email.title')" @click.stop>
          <q-icon name="edit" size="22px" color="white" />
        </button>
      </div>

      <div v-else key="detail" class="detail-stack">
        <div class="gmail-header gmail-header-detail">
          <button class="icon-btn" :aria-label="t('common.back')" @click="openEmailId = null">
            <q-icon name="chevron_left" size="24px" />
          </button>
        </div>
        <div v-if="openEmail" class="detail-scroll">
          <h1 class="detail-subject">{{ openEmail.subject }}</h1>
          <div class="detail-header">
            <AppAvatar
              :name="openEmail.fromName || openEmail.fromEmail || '?'"
              :color="colorFor(openEmail)"
              :size="40"
            />
            <div class="detail-sender">
              <div class="detail-name">{{ openEmail.fromName || openEmail.fromEmail }}</div>
              <div v-if="openEmail.fromEmail" class="detail-email">{{ openEmail.fromEmail }}</div>
            </div>
            <span class="detail-time">{{ formatTime(openEmail.ts) }}</span>
          </div>
          <div class="detail-body">{{ openEmail.text }}</div>
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
import AppAvatar from '@/components/phone/AppAvatar.vue'

const phone = usePhoneStore()
const story = useStoryStore()
const { t } = useI18n()
const query = ref('')

// Local, not phone store — a plug-in app doesn't need core changes just to
// track "which email am I reading" for itself.
const openEmailId = ref(null)

function formatTime(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso || ''
  return d.toLocaleTimeString(story.activeLocale, { hour: '2-digit', minute: '2-digit' })
}

// A flat, newest-first inbox — unlike SMS/Pixly DM, an email isn't grouped
// by sender (see entryType.js's own comment): every entry is its own row,
// same as a real Gmail inbox.
const emails = computed(() => story.customData?.emails || [])

const filteredEmails = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return emails.value
  return emails.value.filter((mail) =>
    [mail.fromName, mail.fromEmail, mail.subject, mail.text].some((field) =>
      field?.toLowerCase().includes(q),
    ),
  )
})

const openEmail = computed(() => emails.value.find((mail) => mail.id === openEmailId.value) || null)

function open(id) {
  openEmailId.value = id
  const mail = emails.value.find((m) => m.id === id)
  if (mail) mail.read = true
}

// Deterministic avatar color per sender (name, falling back to the raw
// address) — same "consistent identity color" idea as a real Gmail inbox,
// but there's no project.contacts record to read a `color` from here (the
// whole point of this redesign — an email's sender is free text, not a
// contact), so it's hashed from the string itself instead. A small fixed
// palette (not a full RGB hash) keeps every avatar legible on the dark
// phone UI, same reasoning contact colors are always hand-picked hex
// values elsewhere rather than randomly generated.
const AVATAR_PALETTE = [
  '#3f8cff',
  '#ff6f91',
  '#32e3b1',
  '#ffb648',
  '#a78bfa',
  '#4caf50',
  '#ff7043',
  '#26c6da',
]
function colorFor(mail) {
  const key = mail.fromName || mail.fromEmail || ''
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
}
</script>

<style scoped>
.app-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.list-stack,
.detail-stack {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.list-stack {
  position: relative;
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

/* --- Gmail's header IS the search bar, no separate big app-title (see
   the template comment above) --- */
.gmail-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px 8px;
  flex-shrink: 0;
}

.gmail-header-detail {
  padding-bottom: 4px;
}

.icon-btn {
  flex-shrink: 0;
  background: none;
  border: none;
  color: #fff;
  opacity: 0.85;
  cursor: pointer;
  display: flex;
  padding: 4px;
  transition: transform 0.12s ease;
}

.icon-btn:active {
  transform: scale(0.88);
}

.gmail-search {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.09);
}

.gmail-search input {
  flex: 1;
  min-width: 0;
  background: none;
  border: none;
  outline: none;
  color: #fff;
  font-size: 14px;
}

.gmail-search input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.inbox-list {
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

/* --- inbox rows, Gmail-like: a colored left accent bar + bold sender for
   an unread row (dimmed avatar once read), "subject — snippet" on one
   truncated line, time top-right --- */
.mail-row {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  background: none;
  border: none;
  border-left: 3px solid transparent;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding: 12px 16px 12px 11px;
  cursor: pointer;
  text-align: left;
  transition: transform 0.12s ease;
  animation: row-in 0.28s cubic-bezier(0.34, 1.2, 0.64, 1) both;
}

.mail-row.unread {
  border-left-color: var(--phone-accent, #3f8cff);
}

.mail-row:not(.unread) .mail-avatar {
  opacity: 0.55;
}

.mail-row:active {
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

.mail-info {
  flex: 1;
  min-width: 0;
  color: #fff;
}

.mail-row-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.mail-from {
  font-size: 14px;
  opacity: 0.75;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mail-row.unread .mail-from {
  font-weight: 700;
  opacity: 1;
}

.mail-time {
  flex-shrink: 0;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

.mail-preview {
  font-size: 12.5px;
  opacity: 0.55;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.mail-row.unread .mail-subject-inline {
  color: #fff;
  font-weight: 600;
  opacity: 1;
}

/* Purely decorative Gmail-style compose FAB — see the template comment. */
.compose-fab {
  position: absolute;
  right: 16px;
  bottom: 18px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  background: var(--phone-accent, #3f8cff);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
  transition: transform 0.12s ease;
}

.compose-fab:active {
  transform: scale(0.9);
}

/* --- email detail --- */
.detail-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.detail-subject {
  margin: 0;
  font-size: 19px;
  font-weight: 800;
  color: #fff;
  line-height: 1.3;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.detail-sender {
  flex: 1;
  min-width: 0;
}

.detail-name {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}

.detail-email {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.detail-time {
  flex-shrink: 0;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

.detail-body {
  font-size: 14px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.9);
  white-space: pre-wrap;
}
</style>
