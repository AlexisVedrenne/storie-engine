<template>
  <div class="card-block" :style="{ background: block.bgColor || undefined }">
    <BlockList :blocks="block.blocks || []" />
  </div>
</template>

<script setup>
// Recursive container — the only block type that nests more blocks. Reuses
// BlockList (the same dispatch every screen's top level goes through), so a
// card's children support every block type, including another card.
// `bgColor` is optional — unset (the common case), the translucent default
// below applies untouched, same "override only if authored" precedent as
// TextBlock's color/size.
import BlockList from './BlockList.vue'

defineProps({ block: { type: Object, required: true } })
</script>

<style scoped>
.card-block {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 4px 14px;
}
</style>
