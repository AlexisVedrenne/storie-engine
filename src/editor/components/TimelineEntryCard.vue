<template>
  <div class="entry-card" :class="{ open: expanded }">
    <div class="entry-header">
      <q-icon
        v-if="showCheckbox"
        :name="checked ? 'check_box' : 'check_box_outline_blank'"
        size="18px"
        class="select-box"
        @click.stop="emit('check', !checked)"
      />
      <q-icon name="drag_indicator" size="18px" class="drag-handle" />
      <div class="header-clickable" @click="emit('toggle')">
        <q-icon :name="expanded ? 'expand_less' : 'expand_more'" size="18px" class="chevron" />
        <q-icon :name="iconFor(entry.type)" size="16px" class="type-icon" />
        <span class="type-badge">{{ entry.type }}</span>
        <span class="summary" :title="summaryFor(entry)">{{ summaryFor(entry) }}</span>
        <span v-if="entry.requires" class="requires-badge" title="Cette entrée a une condition d'affichage">
          <q-icon name="rule" size="12px" /> condition
        </span>
      </div>
      <div class="spacer" />
      <div class="row-actions">
        <q-btn dense flat round icon="arrow_upward" size="sm" :disable="!canMoveUp" @click.stop="emit('move-up')">
          <q-tooltip>Monter</q-tooltip>
        </q-btn>
        <q-btn dense flat round icon="arrow_downward" size="sm" :disable="!canMoveDown" @click.stop="emit('move-down')">
          <q-tooltip>Descendre</q-tooltip>
        </q-btn>
        <q-btn dense flat round icon="content_copy" size="sm" @click.stop="emit('duplicate')">
          <q-tooltip>Dupliquer</q-tooltip>
        </q-btn>
        <q-btn dense flat round icon="delete" size="sm" color="negative" @click.stop="emit('remove')">
          <q-tooltip>Supprimer</q-tooltip>
        </q-btn>
      </div>
    </div>

    <div v-if="expanded" class="entry-body">
      <p class="entry-help">{{ helpFor(entry.type) }}</p>
      <component
        :is="formFor(entry.type)"
        :entry="entry"
        v-bind="entry.type === 'choice' ? { breadcrumb: [...breadcrumb, choiceSegment()] } : {}"
      />
      <div class="section-label">
        Condition d'affichage (optionnel)
        <FieldHelp text="N'affiche cette entrée que si toutes les conditions sont vraies. Rien d'ajouté = toujours affichée." />
      </div>
      <RequiresBuilder :model-value="entry.requires" @update:model-value="(v) => (entry.requires = v)" />
    </div>
  </div>
</template>

<script setup>
import RequiresBuilder from '@/editor/components/RequiresBuilder.vue'
import FieldHelp from '@/editor/components/FieldHelp.vue'

// One row of TimelineEditor.vue's list — extracted so the same markup can
// be used both at the top level and nested inside a group's accordion body
// without duplicating it. Stateless: `expanded`/`checked` are booleans
// owned by the parent (keyed by entry reference there, not by position —
// see TimelineEditor.vue's `expandedSet`), so reordering/dragging entries
// never desyncs which card looks open.
const props = defineProps({
  entry: { type: Object, required: true },
  expanded: { type: Boolean, default: false },
  breadcrumb: { type: Array, default: () => [] },
  iconFor: { type: Function, required: true },
  helpFor: { type: Function, required: true },
  formFor: { type: Function, required: true },
  summaryFor: { type: Function, required: true },
  canMoveUp: { type: Boolean, default: true },
  canMoveDown: { type: Boolean, default: true },
  showCheckbox: { type: Boolean, default: false },
  checked: { type: Boolean, default: false },
})
const emit = defineEmits(['toggle', 'close', 'move-up', 'move-down', 'duplicate', 'remove', 'check'])

// `close` (force-collapse, not toggle) is what a breadcrumb segment needs —
// clicking "Choix : ..." further up the trail must collapse THIS entry
// regardless of its current state, not flip it back open.
function choiceSegment() {
  return { label: `Choix : ${props.entry.prompt || '(prompt vide)'}`, collapse: () => emit('close') }
}
</script>

<style scoped>
.entry-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-surface);
}

.entry-card.open {
  border-color: var(--color-accent);
}

.entry-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--row-height);
  padding: 0 var(--space-2) 0 var(--space-1);
  transition: background-color var(--transition-fast);
}

.entry-header:hover {
  background: var(--color-surface-hover);
}

.select-box {
  color: var(--color-text-muted);
  cursor: pointer;
  flex-shrink: 0;
}

.drag-handle {
  color: var(--color-text-muted);
  cursor: grab;
  flex-shrink: 0;
}

.header-clickable {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.chevron,
.type-icon {
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.type-badge {
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.requires-badge {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  background: var(--color-warning-tint);
  color: var(--color-warning);
  flex-shrink: 0;
}

.summary {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--text-sm);
  color: var(--color-text);
}

.spacer {
  flex: 1;
}

.row-actions {
  display: flex;
  align-items: center;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.entry-header:hover .row-actions {
  opacity: 1;
}

.entry-body {
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  border-top: 1px solid var(--color-border);
  background: var(--color-bg);
}

.section-label {
  display: flex;
  align-items: center;
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  margin-top: var(--space-1);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}

.entry-help {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  line-height: 1.5;
}
</style>
