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
const positionStyle = computed(() => ({
  position: 'absolute',
  zIndex: 2,
  ...(ANCHOR_STYLES[props.block.anchor] || ANCHOR_STYLES['top-right']),
}))
</script>
