<template>
  <div class="overlay-block" :style="positionStyle">
    <BlockList :blocks="block.blocks || []" />
  </div>
</template>

<script setup>
// pilier 03 — a positioned layer above the normal row/column flow, for a
// floating badge, a tooltip, a "new message" bubble. `position: absolute`
// resolves against the nearest ancestor that sets `position: relative` —
// CustomAppRenderer.vue's `.app-screen` already does (so an overlay placed
// at a screen's root level pins to a corner/center of the WHOLE screen), and
// CardBlock/LayoutBlock now do too (so an overlay nested INSIDE one of those
// pins to a corner/center of just that container instead). Deliberately not
// "anchor to any block by id anywhere" — that needs a DOM lookup/measurement
// system this engine has no precedent for; nesting is the same "small
// bounded primitive" trade this project keeps making (flags-as-the-only-
// variable, blocks-not-a-canvas) rather than a more powerful but far more
// complex alternative.
import { computed } from 'vue'
import BlockList from './BlockList.vue'

const ANCHOR_STYLES = {
  'top-left': { top: '0', left: '0' },
  'top-right': { top: '0', right: '0' },
  'bottom-left': { bottom: '0', left: '0' },
  'bottom-right': { bottom: '0', right: '0' },
  center: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
}

const props = defineProps({ block: { type: Object, required: true } })
// `offsetX`/`offsetY` (px, user request — "once positioned, can't nudge it
// precisely") are plain margin, not an addition to the transform: for the
// 4 corner anchors, that's a no-op-compatible way to shift the box without
// touching top/left/right/bottom's own anchor math; for `center`, it
// composes cleanly with the anchor's OWN centering `transform`, since
// margin and transform are independent CSS properties (a translate offset
// would instead have needed to be merged into that same transform string).
// Positive X always means "further right", positive Y "further down",
// regardless of which edge the block is anchored to — simpler to reason
// about than "which direction is positive" changing per anchor.
const positionStyle = computed(() => ({
  position: 'absolute',
  zIndex: 2,
  marginLeft: props.block.offsetX ? `${props.block.offsetX}px` : undefined,
  marginTop: props.block.offsetY ? `${props.block.offsetY}px` : undefined,
  ...(ANCHOR_STYLES[props.block.anchor] || ANCHOR_STYLES['top-right']),
}))
</script>
