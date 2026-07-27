<template>
  <div class="dm-list">
    <AppHeader :title="t('social.dmListTitle')" @back="$emit('back')" />

    <div class="search-bar">
      <q-icon name="search" size="17px" color="#f5576c" />
      <input v-model="query" type="text" :placeholder="t('social.searchPlaceholder')" />
    </div>

    <div class="list">
      <div v-if="!threads.length" class="empty">
        <q-icon name="send" size="46px" />
        <span>{{ t('social.dmEmpty') }}</span>
      </div>
      <div v-else-if="!filteredThreads.length" class="empty">
        <q-icon name="search_off" size="46px" />
        <span>{{ t('social.dmNoResults', { query }) }}</span>
      </div>
      <button
        v-for="(t, i) in filteredThreads"
        :key="t.id"
        class="thread-row"
        :style="{ animationDelay: `${i * 40}ms` }"
        @click="$emit('open', t.id)"
      >
        <AppAvatar
          :name="t.group ? t.name : contactName(t)"
          :color="t.group ? '#607d8b' : contactColor(t)"
          :image="t.group ? '' : contactAvatar(t)"
          :size="46"
        />
        <div class="thread-info">
          <div class="thread-name">{{ t.name }}</div>
          <div class="thread-preview">{{ t.preview }}</div>
        </div>
        <span v-if="t.unread" class="unread-dot">{{ t.unread }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStoryStore } from '@/engine/stores/story'
import AppHeader from '@/components/phone/AppHeader.vue'
import AppAvatar from '@/components/phone/AppAvatar.vue'

defineEmits(['back', 'open'])
const story = useStoryStore()
const { t } = useI18n()
const threads = computed(() => story.dmThreadsList)
const query = ref('')

const filteredThreads = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return threads.value
  return threads.value.filter(t => t.name.toLowerCase().includes(q))
})

// real name (not the pseudo shown in .thread-name) — AppAvatar needs it to
// compute sensible initials when there's no photo, "@handle" would give a
// broken-looking "@" initial otherwise.
function contactName(t) {
  return story.getContact(t.participants[0]).name
}

function contactColor(t) {
  return story.getContact(t.participants[0]).color
}

function contactAvatar(t) {
  return story.getContact(t.participants[0]).socialAvatar
}
</script>

<style scoped>
.dm-list {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 16px 10px;
  padding: 9px 12px;
  border-radius: 11px;
  background: rgba(245, 87, 108, 0.12);
  border: 1px solid rgba(245, 87, 108, 0.25);
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

.list {
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

.thread-row {
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

.thread-row:active {
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
}
</style>
