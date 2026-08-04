<template>
  <div class="block-list" :style="{ flexDirection: direction, gap: `${gap}px` }">
    <component :is="blockComponent(block.type)" v-for="(block, i) in blocks" :key="i" :block="block" />
  </div>
</template>

<script setup>
// The actual interpreter — one dispatch point, reused recursively by
// CardBlock.vue and LayoutBlock.vue (a block can contain its own
// `blocks[]`). Unknown/future block types are silently skipped rather than
// crashing, same "additive, tolerate the unknown" spirit as story.js's
// plug-in entry type fallback.
//
// `direction`/`gap` default to a plain vertical stack (every existing
// caller — CardBlock, the top-level screen render) — LayoutBlock is the
// only one that overrides them. Note: a `row` direction still stacks
// intrinsically-full-width blocks (image, text) on top of each other
// visually since they don't shrink to content — row layout reads best with
// blocks that size to their own content (badge, avatar, button).
import HeaderBlock from './HeaderBlock.vue'
import TextBlock from './TextBlock.vue'
import ImageBlock from './ImageBlock.vue'
import AvatarBlock from './AvatarBlock.vue'
import RowBlock from './RowBlock.vue'
import CardBlock from './CardBlock.vue'
import LayoutBlock from './LayoutBlock.vue'
import BadgeBlock from './BadgeBlock.vue'
import DividerBlock from './DividerBlock.vue'
import ButtonBlock from './ButtonBlock.vue'
import TabsBlock from './TabsBlock.vue'

defineProps({
  blocks: { type: Array, default: () => [] },
  direction: { type: String, default: 'column' },
  gap: { type: [String, Number], default: 10 },
})

const BLOCK_COMPONENTS = {
  header: HeaderBlock,
  text: TextBlock,
  image: ImageBlock,
  avatar: AvatarBlock,
  row: RowBlock,
  card: CardBlock,
  layout: LayoutBlock,
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
}
</style>
