<template>
  <div class="block-list" :style="{ flexDirection: direction, gap: `${gap}px` }">
    <div
      v-for="(block, i) in visibleBlocks"
      :key="i"
      class="block-wrap"
      :style="{
        marginTop: block.spacingBefore ? `${block.spacingBefore}px` : undefined,
        marginBottom: block.spacingAfter ? `${block.spacingAfter}px` : undefined,
      }"
      @click.stop="phone.selectCustomAppBlock(block)"
    >
      <component :is="blockComponent(block.type)" :block="block" />
    </div>
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
//
// Every block is wrapped in a click-catching div (`@click.stop`, so a
// nested block's click never also selects its ancestors) that reports the
// clicked block to phone.editorSelectedBlock — see BlockBuilder.vue, which
// watches it to auto-expand/scroll to the matching row in the editor. The
// wrapper also carries the block's own optional spacingBefore/spacingAfter
// override (see BlockPropertiesForm.vue's generic "advanced" section).
import { computed } from 'vue'
import { usePhoneStore } from '@/engine/stores/phone'
import { useStoryStore } from '@/engine/stores/story'
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
import ListBlock from './ListBlock.vue'
import ConversationsBlock from './ConversationsBlock.vue'
import ScheduleBlock from './ScheduleBlock.vue'
import LedgerBlock from './LedgerBlock.vue'

const phone = usePhoneStore()
const story = useStoryStore()

// Same optional `requires` (flags/following) every timeline entry already
// supports (see TimelineEntryCard.vue's identical "Condition d'affichage"
// UX in BlockPropertiesForm.vue) — checked via the same story.checkConditions()
// used everywhere else, a block failing its condition is silently skipped,
// not rendered blank/disabled.
const props = defineProps({
  blocks: { type: Array, default: () => [] },
  direction: { type: String, default: 'column' },
  gap: { type: [String, Number], default: 10 },
})
const visibleBlocks = computed(() => props.blocks.filter((b) => story.checkConditions(b.requires)))

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
  list: ListBlock,
  conversations: ConversationsBlock,
  schedule: ScheduleBlock,
  ledger: LedgerBlock,
}
function blockComponent(type) {
  return BLOCK_COMPONENTS[type] || null
}
</script>

<style scoped>
.block-list {
  display: flex;
}

.block-wrap {
  min-width: 0;
}
</style>
