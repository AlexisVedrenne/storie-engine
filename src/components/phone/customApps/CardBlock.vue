<template>
  <div
    class="card-block"
    :class="{ clickable: hasAction }"
    :style="{ background: block.bgColor || undefined }"
    @click="onClick"
  >
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
//
// `action` (user request — "rendre cliquable comme le bouton") reuses the
// SAME fixed catalog/dispatch a button offers. A click anywhere on the
// card's own background runs it; a click that actually lands on a NESTED
// interactive block (a button placed inside the card, say) never reaches
// this listener at all — BlockList.vue already wraps every block, including
// nested ones, in its own `@click.stop` div, so the inner block's click is
// stopped before it can bubble up here. No extra guarding needed.
import { computed, inject } from 'vue'
import { useBlockAction } from '@/engine/customApps/useBlockAction'
import BlockList from './BlockList.vue'

const props = defineProps({ block: { type: Object, required: true } })
const listItem = inject('customAppListItem', null)
const { runAction } = useBlockAction()
const hasAction = computed(() => Boolean(props.block.action && props.block.action.type !== 'none'))
function onClick() {
  if (hasAction.value) runAction(props.block.action, listItem)
}
</script>

<style scoped>
.card-block {
  /* Lets a nested `overlay` block (pilier 03) position itself against THIS
     card specifically instead of bubbling up to the screen root. */
  position: relative;
  background: var(--app-surface);
  border-radius: var(--app-radius);
  padding: 4px 14px;
}

.card-block.clickable {
  cursor: pointer;
}
</style>
