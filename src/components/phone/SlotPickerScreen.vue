<template>
  <div class="slot-picker">
    <div class="picker-icon">
      <q-icon name="save" size="30px" color="white" />
    </div>
    <h1>{{ t('slotPicker.title') }}</h1>
    <p>{{ t('slotPicker.subtitle') }}</p>

    <div class="slot-list">
      <div v-for="card in cards" :key="card.id" class="slot-row">
        <template v-if="confirmDeleteId === card.id">
          <span class="confirm-question">{{ t('slotPicker.deleteConfirmQuestion') }}</span>
          <button class="confirm-btn confirm-yes" @click="doDelete(card.id)">
            {{ t('slotPicker.deleteConfirmYes') }}
          </button>
          <button class="confirm-btn confirm-no" @click="confirmDeleteId = null">
            {{ t('slotPicker.deleteConfirmNo') }}
          </button>
        </template>

        <template v-else>
          <div
            class="slot-main"
            role="button"
            tabindex="0"
            @click="pick(card.id)"
            @keyup.enter="pick(card.id)"
          >
            <div class="slot-info">
              <span class="slot-name">{{
                card.occupied ? card.playerName : t('slotPicker.newGame')
              }}</span>
              <span class="slot-detail">{{ card.detail }}</span>
            </div>
            <q-icon name="chevron_right" size="18px" color="rgba(255,255,255,0.4)" />
          </div>
          <button
            v-if="card.occupied"
            class="delete-btn"
            :aria-label="t('slotPicker.deleteTooltip')"
            @click="confirmDeleteId = card.id"
          >
            <q-icon name="delete_outline" size="18px" />
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
// First screen in a shipped game (see PhoneShell.vue's bootPhase — gated on
// window.storieGameSave existing, never shown in the editor's own live
// preview). 3 fixed slots (see story.js's activeSlotId/loadSlotsSummary()/
// loadSlot()/deleteSlot()) — no existing UI pattern in this codebase to
// model against, this is genuinely new.
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStoryStore } from '@/engine/stores/story'

const emit = defineEmits(['picked'])
const story = useStoryStore()
const { t } = useI18n()

const SLOT_IDS = ['slot1', 'slot2', 'slot3']
const slots = ref(story.loadSlotsSummary())
const confirmDeleteId = ref(null)

function relativeTime(ts) {
  if (!ts) return ''
  const minutes = Math.floor((Date.now() - ts) / 60000)
  if (minutes < 1) return t('slotPicker.justNow')
  if (minutes < 60) return t('slotPicker.minutesAgo', { n: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('slotPicker.hoursAgo', { n: hours })
  return t('slotPicker.daysAgo', { n: Math.floor(hours / 24) })
}

// Chapter title translated through the 'common' bucket — same reasoning
// (and the exact same call) as the Journal app's own progress rail: a
// title names the chapter itself rather than being narrative content
// authored inside it, so it isn't tied to any one chapter's own i18n
// bucket. A chapter deleted from the project since this slot was last
// saved (author edited the project, rebuilt) just shows no chapter line —
// not an error, the slot itself is still perfectly loadable.
const cards = computed(() =>
  SLOT_IDS.map((id) => {
    const snapshot = slots.value?.[id]
    if (!snapshot) return { id, occupied: false, detail: t('slotPicker.emptySlot') }
    const chapter = story.project?.chapters?.find((c) => c.id === snapshot.currentChapterId)
    const chapterTitle = chapter ? story.translateStory(chapter.title || chapter.id, 'common') : ''
    const savedAtLabel = relativeTime(snapshot.savedAt)
    return {
      id,
      occupied: true,
      playerName: snapshot.playerName || '',
      detail: [chapterTitle, savedAtLabel].filter(Boolean).join(' · '),
    }
  }),
)

function pick(slotId) {
  story.loadSlot(slotId)
  emit('picked')
}

function doDelete(slotId) {
  story.deleteSlot(slotId)
  confirmDeleteId.value = null
  slots.value = story.loadSlotsSummary()
}
</script>

<style scoped>
.slot-picker {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
  background: linear-gradient(180deg, #1f1a3a 0%, #0d0d17 100%);
  color: #fff;
  text-align: center;
}

.picker-icon {
  width: 68px;
  height: 68px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
  background: linear-gradient(135deg, #7b5cff, #f5576c);
  box-shadow: 0 0 30px rgba(123, 92, 255, 0.35);
}

h1 {
  font-size: 21px;
  font-weight: 800;
  margin: 10px 0 0;
}

p {
  font-size: 13.5px;
  opacity: 0.7;
  line-height: 1.4;
  margin: 0 0 20px;
}

.slot-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.slot-row {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  padding: 6px;
  min-height: 56px;
}

.slot-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  cursor: pointer;
  text-align: left;
  border-radius: 10px;
  transition: background 0.15s ease;
}

.slot-main:hover,
.slot-main:focus-visible {
  background: rgba(255, 255, 255, 0.06);
  outline: none;
}

.slot-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.slot-name {
  font-size: 14.5px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.slot-detail {
  font-size: 12px;
  opacity: 0.6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delete-btn {
  flex-shrink: 0;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  padding: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.delete-btn:hover {
  color: #f44336;
}

.confirm-question {
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  padding: 0 8px;
  text-align: left;
}

.confirm-btn {
  flex-shrink: 0;
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}

.confirm-yes {
  background: #f44336;
  color: #fff;
}

.confirm-no {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}
</style>
