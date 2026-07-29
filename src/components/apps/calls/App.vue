<template>
  <div class="app-screen">
    <AppTitleBar :title="t('calls.title')" icon="call" color="#8bc34a" @back="phone.goHome()" />

    <div class="tabs">
      <button class="tab-btn" :class="{ active: tab === 'recents' }" @click="tab = 'recents'">{{ t('calls.tabRecents') }}</button>
      <button class="tab-btn" :class="{ active: tab === 'contacts' }" @click="tab = 'contacts'">{{ t('calls.tabContacts') }}</button>
    </div>

    <div v-if="tab === 'recents'" class="call-list">
      <div v-if="!story.calls.length" class="empty">
        <q-icon name="call" size="46px" />
        <span>{{ t('calls.noRecent') }}</span>
      </div>
      <div
        v-for="(c, i) in story.calls"
        :key="c.id"
        class="call-row"
        :style="{ animationDelay: `${i * 35}ms` }"
      >
        <AppAvatar
          :name="story.contactName(c.contact)"
          :color="story.getContact(c.contact).color"
          :image="story.getContact(c.contact).avatar"
          :size="40"
        />
        <div class="call-info">
          <div class="call-name" :class="{ missed: c.type === 'missed' }">{{ story.contactName(c.contact) }}</div>
          <div class="call-meta" :class="{ missed: c.type === 'missed' }">
            {{ c.type === 'missed' ? t('calls.missed') : t('calls.received') }} · {{ c.ts }}
          </div>
        </div>
        <q-icon name="call" size="18px" color="#8bc34a" />
      </div>
    </div>

    <div v-else class="call-list">
      <div v-if="!contactList.length" class="empty">
        <q-icon name="person" size="46px" />
        <span>{{ t('calls.noContacts') }}</span>
      </div>
      <button
        v-for="(c, i) in contactList"
        :key="c.id"
        class="call-row contact-row"
        :style="{ animationDelay: `${i * 35}ms` }"
        @click="messageContact(c.id)"
      >
        <AppAvatar :name="story.contactName(c.id)" :color="c.color" :image="c.avatar" :size="40" />
        <div class="call-info">
          <div class="call-name">{{ story.contactName(c.id) }}</div>
        </div>
        <q-icon name="sms" size="18px" color="#4caf50" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePhoneStore } from '@/engine/stores/phone'
import { useStoryStore } from '@/engine/stores/story'
import AppTitleBar from '@/components/phone/AppTitleBar.vue'
import AppAvatar from '@/components/phone/AppAvatar.vue'

const phone = usePhoneStore()
const story = useStoryStore()
const { t } = useI18n()
const tab = ref('recents')

// only show a contact once an SMS has actually been received from them —
// this list isn't a full phonebook, it's "people you've heard from".
const contactList = computed(() =>
  story.contactsList.filter(c => c.id !== 'me' && (story.messages[c.id] || []).some(m => m.from !== 'me'))
)

function messageContact(id) {
  phone.openApp('messages')
  phone.openConversation(id)
  story.markRead(id)
}
</script>

<style scoped>
.app-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tabs {
  display: flex;
  gap: 8px;
  padding: 4px 16px 10px;
  flex-shrink: 0;
}

.tab-btn {
  background: rgba(255, 255, 255, 0.06);
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  font-weight: 600;
  padding: 7px 16px;
  border-radius: 20px;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.tab-btn.active {
  background: #8bc34a;
  color: #10160a;
}

.call-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.contact-row {
  width: 100%;
  background: none;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  text-align: left;
  cursor: pointer;
  transition: transform 0.12s ease;
}

.contact-row:active {
  transform: scale(0.98);
  background: rgba(255, 255, 255, 0.04);
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

.call-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  color: #fff;
  animation: row-in 0.28s cubic-bezier(0.34, 1.2, 0.64, 1) both;
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

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.call-info {
  flex: 1;
}

.call-name {
  font-weight: 600;
  font-size: 14px;
}

.call-name.missed {
  color: #f44336;
}

.call-meta {
  font-size: 12px;
  opacity: 0.6;
}

.call-meta.missed {
  color: #f44336;
  opacity: 1;
}
</style>
