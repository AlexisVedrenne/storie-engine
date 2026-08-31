<template>
  <div class="layout-block" :style="wrapperStyle">
    <BlockList
      :blocks="block.blocks || []"
      :direction="block.direction || 'row'"
      :gap="block.gap ?? 8"
    />
  </div>
</template>

<script setup>
// Pure flex arranger — no background/padding of its own by default, unlike
// CardBlock (visually "layout, column direction, + a grouped-card
// background"). Recurses through the same BlockList every screen's top
// level uses. `bgColor` is optional — unset (the common case), the wrapper
// gets no style at all (same zero-chrome look as before this field
// existed); set, the wrapper picks up the same visual chrome (padding,
// radius) CardBlock always has, since a flush-edge background with no
// padding reads as a layout bug rather than an intentional panel.
import { computed } from 'vue'
import BlockList from './BlockList.vue'

const props = defineProps({ block: { type: Object, required: true } })
const wrapperStyle = computed(() =>
  props.block.bgColor
    ? { background: props.block.bgColor, borderRadius: 'var(--app-radius)', padding: '4px 14px' }
    : {},
)
</script>

<style scoped>
/* Lets a nested `overlay` block (pilier 03) position itself against THIS
   layout specifically instead of bubbling up to the screen root — the only
   reason this file has a style block at all, LayoutBlock is otherwise
   chrome-free by design (see wrapperStyle's own comment above). */
.layout-block {
  position: relative;
}
</style>
