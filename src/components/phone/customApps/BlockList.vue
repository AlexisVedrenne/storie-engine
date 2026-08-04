<template>
  <div class="block-list">
    <component :is="blockComponent(block.type)" v-for="(block, i) in blocks" :key="i" :block="block" />
  </div>
</template>

<script setup>
// The actual interpreter — one dispatch point, reused recursively by
// CardBlock.vue (a block can contain its own `blocks[]`). Unknown/future
// block types are silently skipped rather than crashing, same "additive,
// tolerate the unknown" spirit as story.js's plug-in entry type fallback.
import HeaderBlock from './HeaderBlock.vue'
import TextBlock from './TextBlock.vue'
import ImageBlock from './ImageBlock.vue'
import AvatarBlock from './AvatarBlock.vue'
import RowBlock from './RowBlock.vue'
import CardBlock from './CardBlock.vue'
import BadgeBlock from './BadgeBlock.vue'
import DividerBlock from './DividerBlock.vue'
import ButtonBlock from './ButtonBlock.vue'
import TabsBlock from './TabsBlock.vue'

defineProps({ blocks: { type: Array, default: () => [] } })

const BLOCK_COMPONENTS = {
  header: HeaderBlock,
  text: TextBlock,
  image: ImageBlock,
  avatar: AvatarBlock,
  row: RowBlock,
  card: CardBlock,
  badge: BadgeBlock,
  divider: DividerBlock,
  button: ButtonBlock,
  tabs: TabsBlock,
}
function blockComponent(type) {
  return BLOCK_COMPONENTS[type] || null
}
</script>

<style scoped>
.block-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
