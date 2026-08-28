<template>
  <div class="ledger-block">
    <template v-if="items.length">
      <div class="ledger-current">{{ formatValue(items[items.length - 1].value) }}</div>

      <svg
        v-if="numericValues.length > 1"
        class="ledger-chart"
        viewBox="0 0 280 64"
        preserveAspectRatio="none"
      >
        <line x1="0" :y1="baselineY" x2="280" :y2="baselineY" class="ledger-grid" />
        <polygon :points="areaPoints" class="ledger-area" />
        <polyline :points="linePoints" class="ledger-line" />
        <circle :cx="lastPoint.x" :cy="lastPoint.y" r="3" class="ledger-dot" />
      </svg>

      <div class="ledger-list">
        <div v-for="item in reversedItems" :key="item.key" class="ledger-row">
          <div class="ledger-row-key">{{ item.key }}</div>
          <div class="ledger-row-value">{{ formatValue(item.value) }}</div>
        </div>
      </div>
    </template>
    <div v-else class="ledger-empty">{{ t('customApps.ledger.empty') }}</div>
  </div>
</template>

<script setup>
// Renders a numeric flag COLLECTION (see blockKinds.js) as a mini area-chart
// + the entry list below — a wallet balance, a reputation score, anything
// an author already builds via `effects.collections`, given a bit more
// visual care than the raw `list` block gives it. Chart geometry is plain
// inline SVG (no chart library — this is 2 shapes and a line, not worth a
// dependency), same viewBox-relative-coordinates approach as any hand-drawn
// sparkline.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStoryStore } from '@/engine/stores/story'

const { t } = useI18n()
const props = defineProps({ block: { type: Object, required: true } })
const story = useStoryStore()

const items = computed(() => story.collectionItems(props.block.flagKey))
const reversedItems = computed(() => [...items.value].reverse()) // most recent first, matches every other list in this engine
const numericValues = computed(() => items.value.map((i) => Number(i.value) || 0))

const CHART_W = 280
const CHART_H = 64
const PAD = 4

function formatValue(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n.toLocaleString() : String(v)
}

const range = computed(() => {
  const vals = numericValues.value
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  return { min, max: max === min ? min + 1 : max } // flat data still draws a flat, not a division-by-zero line
})

function pointFor(i, v) {
  const vals = numericValues.value
  const x = vals.length > 1 ? PAD + (i / (vals.length - 1)) * (CHART_W - PAD * 2) : CHART_W / 2
  const { min, max } = range.value
  const y = CHART_H - PAD - ((v - min) / (max - min)) * (CHART_H - PAD * 2)
  return { x, y }
}

const points = computed(() => numericValues.value.map((v, i) => pointFor(i, v)))
const linePoints = computed(() => points.value.map((p) => `${p.x},${p.y}`).join(' '))
const areaPoints = computed(() => {
  if (!points.value.length) return ''
  const first = points.value[0]
  const last = points.value[points.value.length - 1]
  return `${first.x},${CHART_H} ${linePoints.value} ${last.x},${CHART_H}`
})
const lastPoint = computed(() => points.value[points.value.length - 1] || { x: 0, y: 0 })
const baselineY = computed(() => CHART_H - PAD)
</script>

<style scoped>
.ledger-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: var(--app-text);
}

.ledger-current {
  font-size: 26px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.ledger-chart {
  width: 100%;
  height: 64px;
  display: block;
}

.ledger-grid {
  stroke: rgba(255, 255, 255, 0.15);
  stroke-width: 1;
}

.ledger-area {
  fill: rgba(var(--app-accent-rgb), 0.18);
  stroke: none;
}

.ledger-line {
  fill: none;
  stroke: var(--app-accent);
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.ledger-dot {
  fill: var(--app-accent);
}

.ledger-empty {
  font-size: 13px;
  opacity: 0.5;
  font-style: italic;
}

.ledger-list {
  display: flex;
  flex-direction: column;
}

.ledger-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 13px;
}

.ledger-row-key {
  opacity: 0.6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ledger-row-value {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
</style>
