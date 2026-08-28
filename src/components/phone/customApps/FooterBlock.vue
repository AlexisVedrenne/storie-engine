<template>
  <div class="footer-block" :class="{ sticky: block.sticky }" :style="wrapperStyle">
    <BlockList
      :blocks="block.blocks || []"
      :direction="block.direction || 'row'"
      :gap="block.gap ?? 8"
    />
  </div>
</template>

<script setup>
// Sticky action bar (pilier 03) — same recursive-container shape as
// LayoutBlock (row/column, its own `blocks[]`), not CardBlock's padded-panel
// look, since a footer is more often a row of buttons than a panel. `sticky`
// defaults to true in blockKinds.js (the whole point of reaching for this
// block over a plain `layout` placed last) but stays a toggle for a
// footer-STYLED bar that isn't actually pinned. When sticky, needs an opaque
// background (falls back to the app's own `--app-bg`, same "absent = engine
// default" precedent as everywhere else) so scrolled-past content doesn't
// show through underneath it.
import { computed } from 'vue'
import BlockList from './BlockList.vue'

const props = defineProps({ block: { type: Object, required: true } })
const wrapperStyle = computed(() => {
  const style = {}
  if (props.block.bgColor) style.background = props.block.bgColor
  else if (props.block.sticky) style.background = 'var(--app-bg)'
  if (props.block.bgColor || props.block.sticky) {
    style.borderRadius = 'var(--app-radius)'
    style.padding = '10px 14px'
  }
  return style
})
</script>

<style scoped>
.footer-block.sticky {
  position: sticky;
  bottom: 0;
  z-index: 1;
}
</style>
