<template>
  <div
    ref="viewportRef"
    class="map-viewport"
    :style="{ height: `${block.height || 280}px` }"
    :class="{ dragging, picking: phone.mapPoiPicker }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @wheel="onWheel"
  >
    <div v-if="phone.mapPoiPicker" class="map-pick-hint">
      {{ t('customApps.map.pickHint') }}
    </div>
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
        :class="{ clickable: hasAction(poi), 'map-poi-card': poi.content?.length }"
        :style="{
          left: `${poiPosition(poi).x}%`,
          top: `${poiPosition(poi).y}%`,
          background: poi.content?.length ? undefined : poi.color || undefined,
        }"
        @click="onPoiClick(poi)"
      >
        <template v-if="poi.content?.length">
          <BlockList :blocks="poi.content" />
        </template>
        <template v-else>
          <img
            v-if="poi.image"
            :src="resolveAssetUrl(poi.image)"
            class="map-poi-image"
            :style="{ width: `${poi.size || 16}px`, height: `${poi.size || 16}px` }"
          />
          <q-icon v-else-if="poi.icon" :name="poi.icon" :size="`${poi.size || 16}px`" />
          <span
            v-if="poi.label"
            class="map-poi-label"
            :style="{
              fontSize: poi.labelSize ? `${poi.labelSize}px` : undefined,
              color: poi.labelColor || undefined,
            }"
            >{{ resolveDynamicText(poi.label, story) }}</span
          >
        </template>
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
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStoryStore } from '@/engine/stores/story'
import { usePhoneStore } from '@/engine/stores/phone'
import { resolveAssetUrl } from '@/engine/assets'
import { resolveDynamicText } from '@/engine/customApps/resolveDynamicText'
import { useBlockAction } from '@/engine/customApps/useBlockAction'
// Circular with BlockList.vue (it dispatches to MapBlock for the `map`
// type, MapBlock renders a POI's own `content` blocks back through it) —
// same tolerated pattern as CardBlock.vue/LayoutBlock.vue.
import BlockList from './BlockList.vue'

const props = defineProps({ block: { type: Object, required: true } })
const block = props.block
const story = useStoryStore()
const phone = usePhoneStore()
const { t } = useI18n()
const { runAction } = useBlockAction()

function hasAction(poi) {
  return Boolean(poi.action && poi.action.type !== 'none')
}

// A POI's position is either the authored static x/y (default), or — when
// `poi.link` is set — read live from one entity instance's own two number
// fields (e.g. a character's `posX`/`posY`, kept in sync by an automation
// reacting to their `schedule` field's current place). Falls back to the
// static x/y (then dead-center) whenever the link is incomplete or the
// instance/field doesn't exist yet, so an author mid-setup never sees the
// pin vanish or jump to (0,0).
function poiPosition(poi) {
  const link = poi.link
  if (!link?.schemaId || !link?.xField || !link?.yField) {
    return { x: poi.x ?? 50, y: poi.y ?? 50 }
  }
  const entityId = link.entityId || '*'
  const bucket = story.entities?.[link.schemaId] || {}
  const instance =
    entityId === '*' ? Object.values(bucket)[0] : bucket[entityId]
  const x = instance?.[link.xField]
  const y = instance?.[link.yField]
  return {
    x: typeof x === 'number' ? x : (poi.x ?? 50),
    y: typeof y === 'number' ? y : (poi.y ?? 50),
  }
}

const MIN_ZOOM = 0.2
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

// The `zoom` ref above only reads `block.initialZoom` once, at setup — the
// editor's live preview keeps this component mounted while the author
// tweaks block props, so without this watch, changing "initial zoom" would
// never visibly apply until the whole preview remounts (same class of bug
// as the Apps-tab stale-preview fixes elsewhere in this file's history).
watch(
  () => block.initialZoom,
  (v) => {
    zoom.value = clamp((v ?? 100) / 100, MIN_ZOOM, MAX_ZOOM)
    panX.value = 0
    panY.value = 0
    clampPan()
  },
)

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

// Converts a real page/pointer coordinate into this viewport's OWN local
// pixel space — the same space panX/panY/zoom/imgSize already live in.
// These aren't always the same unit: the whole phone UI renders inside a
// fixed-design-width canvas that PhoneShell.vue scales as a block to fit
// whatever panel size the preview actually has (see its own `canvasScale`)
// — so `getBoundingClientRect()` (the viewport's REAL on-screen box, in
// page pixels, post-scale) can differ from `clientWidth`/`clientHeight`
// (its LAYOUT size, which — like all CSS layout — is computed pre-transform
// and therefore stays in the map's own design-pixel space regardless of how
// small/large the preview is currently rendered on screen). Comparing the
// two gives the ambient scale factor with no dependency on PhoneShell's own
// internals; dividing it back out is what makes a click land under the
// actual cursor instead of drifting further off the more zoomed-out the
// preview panel happens to be.
function viewportPoint(clientX, clientY) {
  const vp = viewportRef.value
  const rect = vp ? vp.getBoundingClientRect() : { left: 0, top: 0, width: 1 }
  const scale = vp && rect.width ? vp.clientWidth / rect.width : 1
  return { x: (clientX - rect.left) * scale, y: (clientY - rect.top) * scale }
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
  // Same class of bug as BlockBuilder.vue's palette-drag fix: an interactive
  // child (the zoom buttons) sitting inside a container that runs its own
  // pointer-gesture machinery needs to be excluded up front, or the
  // container's pan/pinch state machine (pointer capture, dragStart) steps
  // on the child's own click.
  if (e.target.closest('.map-zoom-btn')) return
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
  const wasDrag = dragDistance > 6
  justDragged = wasDrag
  dragStart = null

  // "Click the map instead of typing x/y" — done from the SAME pointerup
  // pan/zoom already trusts, not a native `click` listener: a `click` event
  // races against `setPointerCapture()` (called on pointerdown above for
  // every non-zoom-button press, to drive panning) in ways that turned out
  // unreliable in practice. `document.elementFromPoint` (real hit-testing at
  // the release coordinates) replaces `e.target` for the poi/zoom-button
  // exclusion check for the same reason — under an active pointer capture,
  // a pointer event's own `target` is retargeted to the capturing element,
  // so it can no longer tell what was actually under the finger/cursor.
  if (phone.mapPoiPicker && !wasDrag) placePoiAt(e.clientX, e.clientY)
}
function onPoiClick(poi) {
  if (justDragged) {
    justDragged = false
    return
  }
  runAction(poi.action)
}

// BlockPropertiesForm.vue arms `phone.mapPoiPicker` with the exact poi being
// positioned; see onPointerUp above for why this reads coordinates directly
// instead of a click event. Inverts the SAME translate(pan) scale(zoom)
// transform the canvas itself uses, so it lands correctly at any pan/zoom
// level.
function placePoiAt(clientX, clientY) {
  const hit = document.elementFromPoint(clientX, clientY)
  if (hit?.closest('.map-poi') || hit?.closest('.map-zoom-btn')) return
  if (!imgSize.value.w || !imgSize.value.h) return
  const vp = viewportPoint(clientX, clientY)
  const canvasX = (vp.x - panX.value) / zoom.value
  const canvasY = (vp.y - panY.value) / zoom.value
  phone.mapPoiPicker.x = clamp(Math.round((canvasX / imgSize.value.w) * 1000) / 10, 0, 100)
  phone.mapPoiPicker.y = clamp(Math.round((canvasY / imgSize.value.h) * 1000) / 10, 0, 100)
  phone.mapPoiPicker = null
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

.map-viewport.picking {
  cursor: crosshair;
}

.map-pick-hint {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 999px;
  pointer-events: none;
  white-space: nowrap;
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

.map-poi-image {
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

/* Compact mini-card mode (poi.content set) — bounded size so pins with
   authored blocks (avatar+text+badge...) still read as pins on a map, not
   full app screens. Overrides the pill look above rather than a separate
   component: same block, same click/drag handling, just a different shell. */
.map-poi.map-poi-card {
  display: block;
  width: max-content;
  max-width: 130px;
  padding: 6px;
  border-radius: var(--app-radius, 10px);
  background: var(--app-surface, #fff);
  color: var(--app-text, inherit);
  font-size: 11px;
  font-weight: 400;
  white-space: normal;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
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
