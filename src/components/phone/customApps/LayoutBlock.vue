<template>
  <BlockList
    :blocks="block.blocks || []"
    :direction="block.direction || 'row'"
    :gap="block.gap ?? 8"
  />
</template>

<script setup>
// Pure flex arranger — no background/padding of its own, unlike CardBlock
// (visually "layout, column direction, + a grouped-card background").
// Recurses through the same BlockList every screen's top level uses.
import BlockList from './BlockList.vue'

defineProps({ block: { type: Object, required: true } })
</script>
