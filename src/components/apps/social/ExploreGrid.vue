<template>
  <div class="explore-screen">
    <div class="search-bar">
      <q-icon name="search" size="18px" color="#f5576c" />
      <input v-model="query" type="text" :placeholder="t('social.searchPlaceholder')" class="search-input" />
    </div>

    <transition name="tab-fade" mode="out-in">
      <div v-if="query.trim()" key="results" class="results">
        <div v-if="!results.length" class="empty">{{ t('social.noResults') }}</div>
        <button
          v-for="(c, i) in results"
          :key="c.id"
          class="result-row"
          :style="{ animationDelay: `${i * 35}ms` }"
          @click="$emit('open-profile', c.id)"
        >
          <AppAvatar :name="c.name" :color="c.color" :image="c.socialAvatar" :size="42" />
          <div class="result-info">
            <div class="result-name">{{ story.socialHandle(c) }}</div>
            <div v-if="c.bio" class="result-bio">{{ story.translateStory(c.bio, 'common') }}</div>
          </div>
        </button>
      </div>

      <div v-else key="grid" class="explore-grid">
        <div v-for="(tile, i) in tiles" :key="i" class="tile" :style="{ background: tile.bg }">
          <span class="emoji">{{ tile.emoji }}</span>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStoryStore } from '@/engine/stores/story'
import AppAvatar from '@/components/phone/AppAvatar.vue'

defineEmits(['open-profile'])
const story = useStoryStore()
const { t } = useI18n()

const query = ref('')
const results = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  return story.contactsList.filter(c => c.id !== 'me' && c.hasSocial !== false && c.name.toLowerCase().includes(q))
})

// Purely decorative grid shown before typing — same spirit as the home-screen
// widgets: placeholder flavor content that makes the app feel alive,
// with no narrative meaning attached. Not driven by the story engine.
const tiles = [
  { emoji: '🌆', bg: 'linear-gradient(135deg,#f093fb,#f5576c)' },
  { emoji: '🎧', bg: 'linear-gradient(135deg,#4facfe,#00f2fe)' },
  { emoji: '🍜', bg: 'linear-gradient(135deg,#fa709a,#fee140)' },
  { emoji: '🐾', bg: 'linear-gradient(135deg,#30cfd0,#330867)' },
  { emoji: '🛹', bg: 'linear-gradient(135deg,#a8edea,#fed6e3)' },
  { emoji: '🌧️', bg: 'linear-gradient(135deg,#5f72bd,#9b23ea)' },
  { emoji: '📸', bg: 'linear-gradient(135deg,#ff9a9e,#fecfef)' },
  { emoji: '🌵', bg: 'linear-gradient(135deg,#0ba360,#3cba92)' },
  { emoji: '🎬', bg: 'linear-gradient(135deg,#ff6e7f,#bfe9ff)' },
  { emoji: '🧋', bg: 'linear-gradient(135deg,#f6d365,#fda085)' },
  { emoji: '🏙️', bg: 'linear-gradient(135deg,#667eea,#764ba2)' },
  { emoji: '🌊', bg: 'linear-gradient(135deg,#43cea2,#185a9d)' }
]
</script>

<style scoped>
.explore-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 12px;
  padding: 8px 12px;
  background: rgba(245, 87, 108, 0.12);
  border: 1px solid rgba(245, 87, 108, 0.25);
  border-radius: 10px;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: #fff;
  font-size: 13.5px;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.tab-fade-enter-active,
.tab-fade-leave-active {
  transition: opacity 0.15s ease;
}

.tab-fade-enter-from,
.tab-fade-leave-to {
  opacity: 0;
}

.results {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.empty {
  padding: 24px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
  text-align: center;
}

.result-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  background: none;
  border: none;
  padding: 8px 14px;
  cursor: pointer;
  text-align: left;
  transition: transform 0.12s ease;
  animation: row-in 0.24s cubic-bezier(0.34, 1.2, 0.64, 1) both;
}

.result-row:active {
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

.result-info {
  min-width: 0;
  color: #fff;
}

.result-name {
  font-weight: 600;
  font-size: 14px;
}

.result-bio {
  font-size: 12px;
  opacity: 0.6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.explore-grid {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3px;
  padding: 3px;
  align-content: start;
}

.tile {
  aspect-ratio: 1;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.emoji {
  font-size: 26px;
  opacity: 0.9;
}
</style>
