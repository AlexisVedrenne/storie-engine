<template>
  <div class="schedule-block">
    <div class="schedule-now">
      <div class="schedule-now-label">{{ t('customApps.schedule.nowLabel') }}</div>
      <div class="schedule-now-place">
        {{ currentPlace || t('customApps.schedule.unknown') }}
      </div>
    </div>

    <div v-if="!slots.length" class="schedule-empty">{{ t('customApps.schedule.empty') }}</div>
    <div
      v-for="(slot, i) in slots"
      :key="i"
      class="schedule-row"
      :class="{ active: i === activeIndex }"
    >
      <div class="schedule-row-time">{{ slot.from }}–{{ slot.to }}</div>
      <div class="schedule-row-place">{{ slot.place }}</div>
    </div>
  </div>
</template>

<script setup>
// Reads ONE entity instance's own `type: 'schedule'` field (an array of
// `{ from, to, place }` slots — see EntityFieldInput.vue) and shows it as a
// day timeline, highlighting whichever slot covers the current in-fiction
// time. `entityId: '*'` is the same sentinel `{entity:...}` tokens use (see
// resolveDynamicText.js) for "the first/only instance of that schema".
//
// Time comparison is plain string comparison on 'HH:MM' (zero-padded values
// sort correctly as strings) — except when a slot's own `from > to` (an
// overnight slot, e.g. 22:00–06:00), where "current is inside" instead means
// "at or after from, OR before to". No real clock arithmetic needed for
// either case.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStoryStore } from '@/engine/stores/story'

// Player-facing chrome (vue-i18n's own global instance, src/i18n/<locale>/
// index.js) — NOT @/editor/i18n, which is editor-only tooling that never
// ships (see docs/architecture.md's build boundary). Same precedent as
// ConversationsBlock.vue's own `customApps.conversations.*` keys.
const { t } = useI18n()
const props = defineProps({ block: { type: Object, required: true } })
const story = useStoryStore()

const instance = computed(() => {
  if (!props.block.schemaId) return null
  if (props.block.entityId === '*' || !props.block.entityId) {
    return story.entityItems(props.block.schemaId)[0] || null
  }
  return story.entities?.[props.block.schemaId]?.[props.block.entityId]
    ? { id: props.block.entityId, ...story.entities[props.block.schemaId][props.block.entityId] }
    : null
})

const slots = computed(() => {
  const value = props.block.fieldKey ? instance.value?.[props.block.fieldKey] : null
  return Array.isArray(value) ? value : []
})

const nowLabel = computed(() => {
  const d = story.resolvedClock()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
})

function slotContains(slot, now) {
  if (!slot.from || !slot.to) return false
  return slot.from <= slot.to
    ? now >= slot.from && now < slot.to
    : now >= slot.from || now < slot.to
}

const activeIndex = computed(() => slots.value.findIndex((s) => slotContains(s, nowLabel.value)))
const currentPlace = computed(() => slots.value[activeIndex.value]?.place || '')
</script>

<style scoped>
.schedule-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: var(--app-text);
}

.schedule-now {
  padding: 12px 14px;
  border-radius: var(--app-radius);
  background: var(--app-surface);
}

.schedule-now-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.6;
}

.schedule-now-place {
  font-size: 16px;
  font-weight: 700;
  margin-top: 2px;
}

.schedule-empty {
  font-size: 13px;
  opacity: 0.5;
  font-style: italic;
}

.schedule-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 8px;
}

.schedule-row.active {
  background: rgba(255, 255, 255, 0.08);
}

.schedule-row-time {
  flex-shrink: 0;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  opacity: 0.6;
  width: 90px;
}

.schedule-row.active .schedule-row-time {
  opacity: 1;
}

.schedule-row-place {
  font-size: 14px;
}
</style>
