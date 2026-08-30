<template>
  <div
    ref="viewportRef"
    class="map-viewport"
    :style="{ height: `${block.height || 280}px` }"
    :class="{ dragging }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @wheel="onWheel"
  >
    <div
      class="map-canvas"
      :style="{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})` }"
    >
      <img
        v-if="block.src"
        ref="imgRef"
        :src="resolveAssetUrl(block.src)"
        class="map-image"
        draggable="false"
        @load="onImageLoad"
      />
      <button
        v-for="(poi, i) in block.pois || []"
        :key="i"
        type="button"
        class="map-poi"
        :class="{ clickable: hasAction(poi) }"
        :style="{ left: `${poi.x}%`, top: `${poi.y}%`, background: poi.color || undefined }"
        @click="onPoiClick(poi)"
      >
        <q-icon v-if="poi.icon" :name="poi.icon" size="16px" />
        <span v-if="poi.label" class="map-poi-label">{{
          resolveDynamicText(poi.label, story)
        }}</span>
      </button>
    </div>
    <div v-if="!block.src" class="map-empty">{{ t('customApps.map.empty') }}</div>
    <div v-if="block.src" class="map-zoom-controls">
      <button type="button" class="map-zoom-btn" @click="zoomStep(1)">
        <q-icon name="add" size="18px" />
      </button>
      <button type="button" class="map-zoom-btn" @click="zoomStep(-1)">
        <q-icon name="remove" size="18px" />
      </button>
    </div>
  </div>
</template>

<script setup>
// A fake map (upload an image, place points of interest over it) — no real
// GPS/space modeling, same "a place is a name + a fixed image" spirit the
// engine already commits to elsewhere (see schedule's own place field).
// Displays the image at its NATURAL size (never scaled to fit the phone) —
// when that's bigger than the block's own `height`, the player drags to pan
// around it, clamped so they can't drag past an edge into empty space.
//
// Panning is a manual translate() on `.map-canvas`, not native scroll —
// deliberate: POI markers are children of that same canvas, positioned in
// PERCENT of the image's own box (`left/top: N%`), so they scroll together
// with the image for free via the same transform, with no separate
// coordinate math needed for "where's this POI relative to the current
// scroll position".
//
// Zoom multiplies the SAME transform (`translate(pan) scale(zoom)`) — POIs
// stay correctly placed at any zoom level for free, same reasoning as pan.
// Three input paths, all converging on `zoomAt(newZoom, viewportPoint)`:
// the +/- buttons (anchor = viewport center), mouse wheel (anchor = cursor),
// and two-finger pinch (anchor = the pinch midpoint, recomputed every move
// so the point under the fingers stays put as they spread/pinch).
//
// Distinguishing a tap from a drag: a browser still fires a native `click`
// on whatever element is under the pointer at release, regardless of how
// far a transform visually moved things in between — `justDragged` (set
// once total pointer movement crosses a small threshold) suppresses a POI's
// action when the tap was actually the END of a pan gesture.
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStoryStore } from '@/engine/stores/story'
import { resolveAssetUrl } from '@/engine/assets'
import { resolveDynamicText } from '@/engine/customApps/resolveDynamicText'
import { useBlockAction } from '@/engine/customApps/useBlockAction'

const props = defineProps({ block: { type: Object, required: true } })
const block = props.block
const story = useStoryStore()
const { t } = useI18n()
const { runAction } = useBlockAction()

function hasAction(poi) {
  return Boolean(poi.action && poi.action.type !== 'none')
}

const MIN_ZOOM = 0.5
const MAX_ZOOM = 3
const ZOOM_STEP = 0.25

const viewportRef = ref(null)
const imgRef = ref(null)
const panX = ref(0)
const panY = ref(0)
const zoom = ref(clamp((props.block.initialZoom ?? 100) / 100, MIN_ZOOM, MAX_ZOOM))
const dragging = ref(false)
const imgSize = ref({ w: 0, h: 0 })
let dragStart = null
let dragDistance = 0
let justDragged = false

const pointers = new Map()
let pinchStartDist = null
let pinchStartZoom = 1

function pinchDistance() {
  const pts = [...pointers.values()]
  return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
}
function pinchMidpoint() {
  const pts = [...pointers.values()]
  return viewportPoint((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2)
}

function onImageLoad() {
  imgSize.value = { w: imgRef.value.naturalWidth, h: imgRef.value.naturalHeight }
  clampPan()
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function clampPan() {
  const vp = viewportRef.value
  if (!vp) return
  const scaledW = imgSize.value.w * zoom.value
  const scaledH = imgSize.value.h * zoom.value
  const minX = Math.min(0, vp.clientWidth - scaledW)
  const minY = Math.min(0, vp.clientHeight - scaledH)
  panX.value = clamp(panX.value, minX, 0)
  panY.value = clamp(panY.value, minY, 0)
}

function viewportPoint(clientX, clientY) {
  const vp = viewportRef.value
  const rect = vp ? vp.getBoundingClientRect() : { left: 0, top: 0 }
  return { x: clientX - rect.left, y: clientY - rect.top }
}

function zoomAt(newZoom, point) {
  const clamped = clamp(newZoom, MIN_ZOOM, MAX_ZOOM)
  const oldZoom = zoom.value
  if (clamped === oldZoom) return
  const ratio = clamped / oldZoom
  panX.value = point.x - (point.x - panX.value) * ratio
  panY.value = point.y - (point.y - panY.value) * ratio
  zoom.value = clamped
  clampPan()
}

function zoomStep(direction) {
  const vp = viewportRef.value
  const center = vp ? { x: vp.clientWidth / 2, y: vp.clientHeight / 2 } : { x: 0, y: 0 }
  zoomAt(zoom.value + direction * ZOOM_STEP, center)
}

function onWheel(e) {
  if (!block.src) return
  e.preventDefault()
  const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
  zoomAt(zoom.value * factor, viewportPoint(e.clientX, e.clientY))
}

function onPointerDown(e) {
  e.currentTarget.setPointerCapture(e.pointerId)
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

  if (pointers.size === 2) {
    dragging.value = false
    pinchStartDist = pinchDistance()
    pinchStartZoom = zoom.value
    return
  }
  if (pointers.size > 2) return

  dragging.value = true
  dragDistance = 0
  dragStart = { x: e.clientX, y: e.clientY, panX: panX.value, panY: panY.value }
}
function onPointerMove(e) {
  if (!pointers.has(e.pointerId)) return
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

  if (pointers.size === 2) {
    if (!pinchStartDist) return
    const scale = pinchDistance() / pinchStartDist
    zoomAt(pinchStartZoom * scale, pinchMidpoint())
    return
  }

  if (!dragging.value || !dragStart) return
  const dx = e.clientX - dragStart.x
  const dy = e.clientY - dragStart.y
  dragDistance = Math.max(dragDistance, Math.hypot(dx, dy))
  panX.value = dragStart.panX + dx
  panY.value = dragStart.panY + dy
  clampPan()
}
function onPointerUp(e) {
  pointers.delete(e.pointerId)

  if (pointers.size >= 2) return
  pinchStartDist = null

  if (pointers.size === 1) {
    const [remaining] = pointers.values()
    dragStart = { x: remaining.x, y: remaining.y, panX: panX.value, panY: panY.value }
    dragDistance = 0
    dragging.value = true
    return
  }

  dragging.value = false
  justDragged = dragDistance > 6
  dragStart = null
}
function onPoiClick(poi) {
  if (justDragged) {
    justDragged = false
    return
  }
  runAction(poi.action)
}
</script>

<style scoped>
.map-viewport {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: var(--app-radius);
  background: var(--app-surface);
  touch-action: none;
  cursor: grab;
}

.map-viewport.dragging {
  cursor: grabbing;
}

.map-canvas {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
}

.map-image {
  display: block;
  max-width: none;
  user-select: none;
  -webkit-user-drag: none;
}

.map-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  opacity: 0.5;
  font-style: italic;
}

.map-poi {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 4px;
  transform: translate(-50%, -50%);
  border: none;
  border-radius: 999px;
  padding: 5px 10px;
  background: var(--app-accent);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  cursor: default;
}

.map-poi.clickable {
  cursor: pointer;
}

.map-zoom-controls {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.map-zoom-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 999px;
  background: var(--app-surface);
  color: var(--app-text);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
}
</style>
