<template>
  <div
    class="chapter-node"
    :class="{ active: data.isActive, ending: data.isEnding }"
    @click="data.onSelect"
  >
    <Handle type="target" :position="Position.Left" />
    <div class="node-body">
      <div class="node-title" :title="data.chapter.title || data.chapter.id">
        {{ data.chapter.title || data.chapter.id }}
      </div>
      <div class="node-id">{{ data.chapter.id }}</div>
      <span v-if="data.isEnding" class="ending-badge">FIN</span>
    </div>
    <div class="node-actions">
      <q-btn
        dense
        flat
        round
        icon="play_arrow"
        size="xs"
        color="primary"
        @click.stop="data.onPreview"
      >
        <q-tooltip>Prévisualiser depuis ce chapitre</q-tooltip>
      </q-btn>
      <q-btn dense flat round icon="delete" size="xs" color="negative" @click.stop="data.onDelete">
        <q-tooltip>Supprimer</q-tooltip>
      </q-btn>
    </div>
    <Handle type="source" :position="Position.Right" />
  </div>
</template>

<script setup>
import { Handle, Position } from '@vue-flow/core'

defineProps({
  data: { type: Object, required: true },
})
</script>

<style scoped>
.chapter-node {
  position: relative;
  display: flex;
  align-items: stretch;
  width: 220px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: pointer;
}

.chapter-node.active {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 1px var(--color-accent);
}

.chapter-node.ending {
  border-style: dashed;
}

.node-body {
  flex: 1;
  min-width: 0;
  padding: var(--space-2) var(--space-2);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.node-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-id {
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: var(--color-text-muted);
}

.ending-badge {
  align-self: flex-start;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0 4px;
}

.node-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity var(--transition-fast);
  background: var(--color-surface-hover);
}

.chapter-node:hover .node-actions {
  opacity: 1;
}
</style>
