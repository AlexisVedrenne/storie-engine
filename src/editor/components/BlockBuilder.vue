<template>
  <div class="block-builder">
    <div class="palette">
      <button
        v-for="kind in BLOCK_KINDS"
        :key="kind.type"
        type="button"
        class="palette-btn"
        draggable="true"
        @dragstart="onPaletteDragStart(kind.type, $event)"
        @dragend="clearDrag"
      >
        <q-icon :name="kind.icon" size="16px" />
        {{ t(`blockKinds.${kind.type}.label`) }}
      </button>
    </div>

    <div class="drop-area" @dragover="onRootDragOver" @drop="performDrop">
      <div v-if="!blocks.length" class="empty-hint">{{ t('blockBuilder.empty') }}</div>

      <template v-for="(block, i) in blocks" :key="i">
        <div class="drop-line" :class="{ active: dropIndex === i }" />
        <q-expansion-item
          v-model="expanded[i]"
          class="block-row"
          :class="{ 'drag-source': dragIndex === i }"
          draggable="true"
          @dragstart="onBlockDragStart(i, $event)"
          @dragover="onListDragOver(i, $event)"
          @dragend="clearDrag"
        >
          <template #header>
            <q-icon name="drag_indicator" size="16px" class="drag-handle" />
            <q-icon :name="paletteIcon(block.type)" size="16px" class="row-icon" />
            <q-item-section>{{ t(`blockKinds.${block.type}.label`) }}{{ summaryFor(block) }}</q-item-section>
            <q-item-section side>
              <q-btn dense flat round icon="close" size="sm" color="negative" @click.stop="remove(i)">
                <q-tooltip>{{ t('common.delete') }}</q-tooltip>
              </q-btn>
            </q-item-section>
          </template>
          <div class="block-body">
            <BlockPropertiesForm :block="block" :screens="screens" />
          </div>
        </q-expansion-item>
      </template>
      <div class="drop-line" :class="{ active: dropIndex === blocks.length }" />
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { BLOCK_KINDS, paletteIcon, defaultBlock } from '@/engine/customApps/blockKinds'
import BlockPropertiesForm from '@/editor/components/BlockPropertiesForm.vue'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()

// `blocks` is mutated in place — same convention as TimelineEditor's
// `entries` prop (the caller passes the real reactive array: a screen's own
// `blocks`, or a `card` block's nested `blocks`, see BlockPropertiesForm.vue).
const props = defineProps({
  blocks: { type: Array, required: true },
  screens: { type: Array, default: () => [] },
})

const expanded = reactive({})

function summaryFor(block) {
  const text = block.title || block.content || block.label || ''
  return text ? ` — ${text}` : ''
}

function remove(i) {
  props.blocks.splice(i, 1)
}

// Native HTML5 drag & drop, same hand-rolled approach as TimelineEditor.vue
// (no library) — `dragKind` set while dragging a NEW block in from the
// palette, `dragIndex` set while reordering an EXISTING one; only one of
// the two is ever active at a time.
let dragKind = null
let dragIndex = null
const dropIndex = ref(null)

function onPaletteDragStart(kind, ev) {
  dragKind = kind
  dragIndex = null
  if (ev.dataTransfer) {
    ev.dataTransfer.effectAllowed = 'copy'
    ev.dataTransfer.setData('text/plain', '')
  }
}

function onBlockDragStart(i, ev) {
  dragIndex = i
  dragKind = null
  if (ev.dataTransfer) {
    ev.dataTransfer.effectAllowed = 'move'
    ev.dataTransfer.setData('text/plain', '')
  }
}

function onListDragOver(i, ev) {
  if (dragKind === null && dragIndex === null) return
  ev.preventDefault()
  ev.stopPropagation()
  const rect = ev.currentTarget.getBoundingClientRect()
  dropIndex.value = ev.clientY - rect.top < rect.height / 2 ? i : i + 1
}

// Root-level fallback so dropping below the last row (or into an empty
// list) still resolves to a valid, always-updated insertion index — same
// "dead pixel gap" reasoning as TimelineEditor.vue's own root handler.
function onRootDragOver(ev) {
  if (dragKind === null && dragIndex === null) return
  ev.preventDefault()
  if (dropIndex.value === null) dropIndex.value = props.blocks.length
}

function clearDrag() {
  dragKind = null
  dragIndex = null
  dropIndex.value = null
}

function performDrop(ev) {
  ev.preventDefault()
  const at = dropIndex.value ?? props.blocks.length
  if (dragKind) {
    props.blocks.splice(at, 0, defaultBlock(dragKind))
    expanded[at] = true
  } else if (dragIndex !== null) {
    const [item] = props.blocks.splice(dragIndex, 1)
    const insertAt = dragIndex < at ? at - 1 : at
    props.blocks.splice(insertAt, 0, item)
  }
  clearDrag()
}
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
}

.block-row.drag-source {
  opacity: 0.4;
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

.block-body {
  padding: var(--space-3);
}
</style>
