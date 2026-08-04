<template>
  <img
    v-if="block.src"
    class="image-block"
    :class="{ 'full-bleed': block.fullBleed }"
    :src="resolveAssetUrl(block.src)"
    alt=""
  />
</template>

<script setup>
import { resolveAssetUrl } from '@/engine/assets'

defineProps({ block: { type: Object, required: true } })
</script>

<style scoped>
.image-block {
  display: block;
  width: 100%;
  max-height: 220px;
  object-fit: cover;
  border-radius: 12px;
}

/* Escapes the screen's own 16px side padding (CustomAppRenderer.vue's
   .app-screen) to go edge to edge — assumes that top-level 16px inset;
   inside a nested card/layout with a different padding, the edges won't
   quite line up (known v1 limitation, not worth a context-aware fix yet). */
.image-block.full-bleed {
  width: calc(100% + 32px);
  margin: 0 -16px;
  max-height: 260px;
  border-radius: 0;
}
</style>
