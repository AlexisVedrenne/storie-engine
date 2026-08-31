<template>
  <div
    class="block-list"
    :style="{
      flexDirection: direction,
      gap: `${gap}px`,
      justifyContent: justify || undefined,
      alignItems: align || undefined,
    }"
  >
    <div
      v-for="(block, i) in visibleBlocks"
      :key="i"
      class="block-wrap"
      :class="{ 'editor-hover': block === phone.hoveredEditorBlock }"
      :style="{
        marginTop:
          block.type === 'footer' && block.sticky
            ? 'auto'
            : block.spacingBefore
              ? `${block.spacingBefore}px`
              : undefined,
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
// override (see BlockPropertiesForm.vue's generic "advanced" section) — EXCEPT
// for a sticky footer, whose wrap gets `margin-top: auto` instead (bug fix:
// a footer used to just sit wherever it fell in the block order, only
// reading as "pinned to the bottom" once there was enough OTHER content to
// scroll past — margin-auto pushes it to the bottom of the flex column
// immediately, and CustomAppRenderer.vue's own `.app-screen-scroll > .block-list`
// rule makes sure that column actually fills the full screen height first,
// or this would have nothing to push against on a short screen).
//
// `editor-hover` is the OTHER direction of that same link — outlines
// whichever block the author is currently hovering in the editor's own row
// list (phone.hoveredEditorBlock, set/cleared by BlockBuilder.vue), so the
// abstract list of rows and the actual visual result read as the same
// thing rather than two disconnected views.
import { computed } from 'vue'
import { usePhoneStore } from '@/engine/stores/phone'
import { useStoryStore } from '@/engine/stores/story'
import HeaderBlock from './HeaderBlock.vue'
import FooterBlock from './FooterBlock.vue'
import TextBlock from './TextBlock.vue'
import ImageBlock from './ImageBlock.vue'
import AvatarBlock from './AvatarBlock.vue'
import RowBlock from './RowBlock.vue'
import CardBlock from './CardBlock.vue'
import OverlayBlock from './OverlayBlock.vue'
import LayoutBlock from './LayoutBlock.vue'
import BadgeBlock from './BadgeBlock.vue'
import DividerBlock from './DividerBlock.vue'
import ButtonBlock from './ButtonBlock.vue'
import TabsBlock from './TabsBlock.vue'
import ListBlock from './ListBlock.vue'
import ConversationsBlock from './ConversationsBlock.vue'
import ScheduleBlock from './ScheduleBlock.vue'
import LedgerBlock from './LedgerBlock.vue'
import FormBlock from './FormBlock.vue'
import LookupBlock from './LookupBlock.vue'
import MapBlock from './MapBlock.vue'

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
  // `justify`/`align` (user request, forwarded from a `layout` block's own
  // fields — see LayoutBlock.vue) map onto justify-content/align-items.
  // Empty/undefined leaves the CSS property unset entirely (the browser's
  // own flex-start/stretch defaults), not just visually equivalent to one
  // of the picker's own options, so every OTHER caller of BlockList (the
  // screen root, card, footer...) keeps its exact original layout with zero
  // migration.
  justify: { type: String, default: '' },
  align: { type: String, default: '' },
})
// `sheet` blocks (pilier 03) are never rendered in their own natural
// position — only CustomAppRenderer.vue renders the currently-open one, as
// a modal overlay above everything. A block anywhere in the tree still gets
// to author one (it's just another entry in the palette), it just never
// shows up inline.
const visibleBlocks = computed(() =>
  props.blocks.filter((b) => b.type !== 'sheet' && story.checkConditions(b.requires)),
)

const BLOCK_COMPONENTS = {
  header: HeaderBlock,
  footer: FooterBlock,
  text: TextBlock,
  image: ImageBlock,
  avatar: AvatarBlock,
  row: RowBlock,
  card: CardBlock,
  overlay: OverlayBlock,
  layout: LayoutBlock,
  badge: BadgeBlock,
  divider: DividerBlock,
  button: ButtonBlock,
  tabs: TabsBlock,
  list: ListBlock,
  conversations: ConversationsBlock,
  schedule: ScheduleBlock,
  ledger: LedgerBlock,
  form: FormBlock,
  lookup: LookupBlock,
  map: MapBlock,
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

.block-wrap.editor-hover {
  outline: 2px solid var(--app-primary, #4c8bf5);
  outline-offset: 2px;
  border-radius: 4px;
}
</style>
