<template>
  <div class="block-builder" :class="{ nested: depth > 0 }">
    <div class="palette">
      <button
        v-for="kind in BLOCK_KINDS"
        :key="kind.type"
        type="button"
        class="palette-btn"
        draggable="true"
        :title="t('blockBuilder.paletteBtnHint')"
        @click="addBlock(kind.type)"
        @dragstart="onPaletteDragStart(kind.type, $event)"
        @dragend="clearDrag"
      >
        <q-icon :name="kind.icon" size="16px" />
        {{ t(`blockKinds.${kind.type}.label`) }}
      </button>
    </div>

    <div class="palette presets">
      <button
        v-for="preset in BLOCK_PRESETS"
        :key="preset.id"
        type="button"
        class="palette-btn preset-btn"
        @click="addPreset(preset)"
      >
        <q-icon :name="preset.icon" size="16px" />
        {{ t(`blockPresets.${preset.id}.label`) }}
      </button>
    </div>

    <div class="drop-area" @dragover="onRootDragOver" @drop="performDrop">
      <div v-if="!blocks.length && depth === 0" class="empty-state">
        <q-icon name="widgets" size="28px" />
        <p>{{ t('blockBuilder.emptyRootTitle') }}</p>
        <p class="empty-state-detail">{{ t('blockBuilder.emptyRootDetail') }}</p>
      </div>
      <div v-else-if="!blocks.length" class="empty-hint">{{ t('blockBuilder.empty') }}</div>

      <template v-for="(block, i) in blocks" :key="i">
        <div class="drop-line" :class="{ active: dropIndex === i }" />
        <q-expansion-item
          :ref="(el) => (rowRefs[i] = el)"
          v-model="expanded[i]"
          class="block-row"
          :class="{
            'drag-source': isDraggedBlock(block),
            'just-selected': block === phone.editorSelectedBlock,
          }"
          draggable="true"
          @dragstart="onBlockDragStart(i, $event)"
          @dragover="onListDragOver(i, $event)"
          @dragend="clearDrag"
          @mouseenter="phone.hoveredEditorBlock = block"
          @mouseleave="onRowMouseLeave(block)"
        >
          <template #header>
            <q-icon name="drag_indicator" size="16px" class="drag-handle" />
            <q-icon :name="paletteIcon(block.type)" size="16px" class="row-icon" />
            <q-item-section>
              {{ t(`blockKinds.${block.type}.label`) }}{{ summaryFor(block) }}
              <span
                v-if="block.requires"
                class="requires-badge"
                :title="t('timelineEntryCard.hasCondition')"
              >
                <q-icon name="rule" size="12px" /> {{ t('timelineEntryCard.conditionBadge') }}
              </span>
            </q-item-section>
            <q-item-section side>
              <div class="row-actions">
                <q-btn dense flat round icon="content_copy" size="sm" @click.stop="duplicate(i)">
                  <q-tooltip>{{ t('blockBuilder.duplicate') }}</q-tooltip>
                </q-btn>
                <q-btn
                  dense
                  flat
                  round
                  icon="close"
                  size="sm"
                  color="negative"
                  @click.stop="remove(i)"
                >
                  <q-tooltip>{{ t('common.delete') }}</q-tooltip>
                </q-btn>
              </div>
            </q-item-section>
          </template>
          <div class="block-body">
            <BlockPropertiesForm
              :block="block"
              :screens="screens"
              :sheets="sheets"
              :item-scope="itemScope"
              :depth="depth"
            />
          </div>
        </q-expansion-item>
      </template>
      <div class="drop-line" :class="{ active: dropIndex === blocks.length }" />
    </div>
  </div>
</template>

<script setup>
import { inject, nextTick, reactive, ref, watch } from 'vue'
import { usePhoneStore } from '@/engine/stores/phone'
import { BLOCK_KINDS, paletteIcon, defaultBlock } from '@/engine/customApps/blockKinds'
import { BLOCK_PRESETS } from '@/engine/customApps/blockPresets'
import BlockPropertiesForm from '@/editor/components/BlockPropertiesForm.vue'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
const phone = usePhoneStore()

// `blocks` is mutated in place — same convention as TimelineEditor's
// `entries` prop (the caller passes the real reactive array: a screen's own
// `blocks`, or a `card`/`layout` block's nested `blocks`, see
// BlockPropertiesForm.vue).
const props = defineProps({
  blocks: { type: Array, required: true },
  screens: { type: Array, default: () => [] },
  // Every `sheet` block anywhere in the app (id + display label) — see
  // BlockPropertiesForm.vue's own comment on this, same "derived, not
  // hand-maintained" precedent as `screens`.
  sheets: { type: Array, default: () => [] },
  // `false`, `'contacts'`, or `'flagCollection'` — set when this builder
  // edits a `list` block's per-item template (or is nested inside one),
  // and which of the two item shapes applies (see blockKinds.js's `list`
  // source) — forwarded down to BlockPropertiesForm so its
  // VariablePickerBtn instances offer the matching `{item:...}` token set.
  // See resolveDynamicText.js.
  itemScope: { type: [Boolean, String], default: false },
  // How many card/layout/list-template levels deep this instance is nested
  // — 0 at a screen's own top level. Only used for the left indent guide
  // (see .nested below) and to pick the empty-state treatment (a friendly
  // onboarding panel only at the root; a terse one-liner everywhere nested,
  // where a full explanation would just repeat itself down every branch).
  depth: { type: Number, default: 0 },
})

const expanded = reactive({})
const rowRefs = {}

function summaryFor(block) {
  const text = block.title || block.content || block.label || ''
  return text ? ` — ${text}` : ''
}

function remove(i) {
  props.blocks.splice(i, 1)
}

function duplicate(i) {
  props.blocks.splice(i + 1, 0, JSON.parse(JSON.stringify(props.blocks[i])))
}

function addPreset(preset) {
  props.blocks.push(JSON.parse(JSON.stringify(preset.build())))
  expanded[props.blocks.length - 1] = true
}

// Click, not just drag — dragging a palette button in was the ONLY way to
// add a block until real users hit this and didn't discover it (confirmed
// live). Appends to the end and jumps straight to it, same as addPreset()
// above; drag & drop still works for both new blocks and reordering.
function addBlock(type) {
  props.blocks.push(defaultBlock(type))
  const idx = props.blocks.length - 1
  expanded[idx] = true
  nextTick(() => rowRefs[idx]?.$el?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
}

// Only clears the shared hover ref if IT'S STILL this block — without the
// guard, quickly moving the pointer from row A to row B could fire A's
// mouseleave (queued) after B's mouseenter already set the ref to B,
// wiping out the correct highlight a moment after it appeared.
function onRowMouseLeave(block) {
  if (phone.hoveredEditorBlock === block) phone.hoveredEditorBlock = null
}

// Native HTML5 drag & drop, same hand-rolled approach as TimelineEditor.vue
// (no library) — `kind` set while dragging a NEW block in from the
// palette, `sourceArray`/`sourceIndex` set while dragging an EXISTING one.
// This state is SHARED across every BlockBuilder instance on the screen
// (provided once by CustomAppEditor.vue) rather than local to each — a
// `card`/`layout`'s nested blocks are edited by their OWN BlockBuilder
// instance, and without a shared drag source a block could only ever be
// reordered within the single container it started in, never moved into
// or out of one. `dropIndex` (the insertion-point preview) stays local:
// only the instance currently under the pointer needs it.
const dragState = inject(
  'blockDragState',
  reactive({ kind: null, sourceArray: null, sourceIndex: null, draggedBlock: null }),
)
const dropIndex = ref(null)

function isDraggedBlock(block) {
  return dragState.sourceArray === props.blocks && dragState.draggedBlock === block
}

// `stopPropagation()` on every one of these handlers matters as soon as a
// container is nested more than one level deep (a `list`/`card`/`layout`
// block's OWN row is itself `draggable="true"`, and its nested
// BlockBuilder's palette/rows are DOM descendants of that row) — a native
// `dragstart` bubbles, so without this an inner palette button's dragstart
// would also re-trigger the ANCESTOR row's `onBlockDragStart` right after,
// overwriting the shared `dragState` (kind → null, sourceArray → the
// ancestor container itself) before `performDrop` ever runs. Confirmed via
// a real repro: dragging from a `list` block's own nested palette silently
// failed to insert because of exactly this (dragState ended up as "moving
// the list block", not "adding a new block") — bubbling wasn't guarded on
// dragstart/drop, only on the per-row dragover below.
function onPaletteDragStart(kind, ev) {
  ev.stopPropagation()
  dragState.kind = kind
  dragState.sourceArray = null
  dragState.sourceIndex = null
  dragState.draggedBlock = null
  if (ev.dataTransfer) {
    ev.dataTransfer.effectAllowed = 'copy'
    ev.dataTransfer.setData('text/plain', '')
  }
}

function onBlockDragStart(i, ev) {
  ev.stopPropagation()
  dragState.kind = null
  dragState.sourceArray = props.blocks
  dragState.sourceIndex = i
  dragState.draggedBlock = props.blocks[i]
  if (ev.dataTransfer) {
    ev.dataTransfer.effectAllowed = 'move'
    ev.dataTransfer.setData('text/plain', '')
  }
}

function onListDragOver(i, ev) {
  if (dragState.kind === null && dragState.sourceArray === null) return
  ev.preventDefault()
  ev.stopPropagation()
  const rect = ev.currentTarget.getBoundingClientRect()
  dropIndex.value = ev.clientY - rect.top < rect.height / 2 ? i : i + 1
}

// Root-level fallback so dropping below the last row (or into an empty
// list) still resolves to a valid, always-updated insertion index — same
// "dead pixel gap" reasoning as TimelineEditor.vue's own root handler.
function onRootDragOver(ev) {
  if (dragState.kind === null && dragState.sourceArray === null) return
  ev.preventDefault()
  ev.stopPropagation()
  if (dropIndex.value === null) dropIndex.value = props.blocks.length
}

function clearDrag() {
  dragState.kind = null
  dragState.sourceArray = null
  dragState.sourceIndex = null
  dragState.draggedBlock = null
  dropIndex.value = null
}

// Whether `block` (a container being dragged) is `arr` itself, or contains
// it anywhere in its own nested blocks/template — guards against dropping a
// card/layout/list into its own (possibly deeply nested) children, which
// would create a cyclic reference and hang the renderer.
function isOwnDescendantArray(block, arr) {
  for (const children of [block.blocks, block.template]) {
    if (!Array.isArray(children)) continue
    if (children === arr) return true
    if (children.some((b) => isOwnDescendantArray(b, arr))) return true
  }
  return false
}

function performDrop(ev) {
  ev.preventDefault()
  ev.stopPropagation()
  const at = dropIndex.value ?? props.blocks.length
  if (dragState.kind) {
    props.blocks.splice(at, 0, defaultBlock(dragState.kind))
    expanded[at] = true
  } else if (dragState.sourceArray) {
    if (dragState.draggedBlock && isOwnDescendantArray(dragState.draggedBlock, props.blocks)) {
      clearDrag()
      return
    }
    const sameArray = dragState.sourceArray === props.blocks
    const [item] = dragState.sourceArray.splice(dragState.sourceIndex, 1)
    let insertAt = at
    if (sameArray && dragState.sourceIndex < at) insertAt -= 1
    props.blocks.splice(insertAt, 0, item)
  }
  clearDrag()
}

// Reacts to a block clicked in the live phone preview (see BlockList.vue /
// phone.editorSelectedBlock) — every BlockBuilder instance on screen runs
// this independently, so a nested selection auto-expands every ancestor
// card/layout's own row along the way, not just the leaf.
function blockContains(block, target) {
  if (block === target) return true
  for (const children of [block.blocks, block.template]) {
    if (Array.isArray(children) && children.some((b) => blockContains(b, target))) return true
  }
  return false
}
watch(
  () => phone.editorSelectedBlock,
  (target) => {
    if (!target) return
    const idx = props.blocks.findIndex((b) => blockContains(b, target))
    if (idx === -1) return
    expanded[idx] = true
    nextTick(() => rowRefs[idx]?.$el?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  },
)
</script>

<style scoped>
.block-builder {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.palette {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.palette-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: var(--text-xs);
  padding: 4px 8px;
  cursor: grab;
}

.preset-btn {
  cursor: pointer;
  border-style: dashed;
}

.drop-area {
  display: flex;
  flex-direction: column;
  min-height: 40px;
}

.empty-hint {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  font-style: italic;
  padding: var(--space-2) 0;
}

/* Root-screen-only onboarding (see `depth === 0` in the template) — a
   nested empty card/layout keeps the terser .empty-hint above instead,
   since the full explanation would just repeat itself at every level. */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-1);
  padding: var(--space-6) var(--space-3);
  color: var(--color-text-muted);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
}

.empty-state p {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text);
}

.empty-state-detail {
  font-size: var(--text-xs) !important;
  color: var(--color-text-muted) !important;
  max-width: 34ch;
}

/* Left indent guide for a card/layout/list-template's OWN nested builder —
   without this, a nested palette+drop-area looked pixel-identical to the
   screen's own top-level one, with nothing showing it's actually "inside"
   the block above it. */
.block-builder.nested {
  border-left: 2px solid var(--color-border);
  padding-left: var(--space-3);
  margin-left: var(--space-1);
}

.drop-line {
  height: 2px;
  margin: 2px 0;
  border-radius: 1px;
  background: transparent;
}

.drop-line.active {
  background: var(--color-accent);
}

.block-row {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: border-color var(--transition-fast, 0.15s ease);
}

.block-row.drag-source {
  opacity: 0.4;
}

.block-row.just-selected {
  border-color: var(--color-accent);
}

.drag-handle {
  color: var(--color-text-muted);
  cursor: grab;
  margin-right: var(--space-1);
}

.row-icon {
  color: var(--color-text-muted);
  margin-right: var(--space-2);
}

.requires-badge {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 10px;
  padding: 1px 6px;
  margin-left: var(--space-2);
  border-radius: var(--radius-sm);
  background: var(--color-warning-tint);
  color: var(--color-warning);
}

.row-actions {
  display: flex;
  align-items: center;
}

.block-body {
  padding: var(--space-3);
}
</style>
