<template>
  <div class="debug-panel-root">
    <q-btn round unelevated color="primary" icon="bug_report" class="debug-fab" @click="isOpen = !isOpen">
      <q-tooltip>{{ t('debugPanel.toggleTooltip') }}</q-tooltip>
    </q-btn>

    <transition name="debug-panel-fade">
      <div v-if="isOpen" class="debug-panel">
        <div class="debug-panel-header">
          <q-icon name="bug_report" size="18px" color="primary" />
          <span class="text-subtitle2">{{ t('debugPanel.title') }}</span>
          <div class="spacer" />
          <q-btn dense flat round icon="close" size="sm" @click="isOpen = false" />
        </div>
        <p class="debug-panel-hint">{{ t('debugPanel.hint') }}</p>

        <div v-if="!flags.length" class="debug-empty">{{ t('debugPanel.empty') }}</div>
        <div v-else class="debug-flag-list">
          <div v-for="flag in flags" :key="flag.key" class="debug-flag-row">
            <div class="debug-flag-name">
              <span class="debug-flag-key">{{ flag.key }}</span>
              <span v-if="flag.label" class="debug-flag-label">{{ flag.label }}</span>
            </div>
            <q-toggle
              v-if="widgetFor(flag) === 'toggle'"
              dense
              :model-value="story.flags[flag.key] === 1"
              color="primary"
              @update:model-value="(v) => (story.flags[flag.key] = v ? 1 : 0)"
            />
            <q-input
              v-else
              dense
              outlined
              type="number"
              class="debug-flag-input"
              :model-value="story.flags[flag.key] ?? 0"
              @update:model-value="(v) => (story.flags[flag.key] = Number(v) || 0)"
            />
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
// QA tool: force a flag's LIVE value mid-preview to test "what happens if
// trustLevel >= 5 here" without replaying from the start — previously the
// only way was startChapter()'s own accumulation (play/jump repeatedly
// until the flag happens to reach that value) or restartPreview()'s full
// wipe. story.flags is plain reactive Pinia state (see story.js) — a
// direct mutation here is picked up by the running preview with zero
// extra plumbing, same as any other write to it (applyEffects, etc.).
//
// Mounted once at EditorPage.vue's page root (not inside any of the 3
// Teleport slots the phone itself cycles through) with `position: fixed`,
// so it floats above the phone regardless of which slot is active —
// docked, chapter-page, or "Aperçu seul" — without needing a duplicate
// trigger button in each of those views. EditorPage.vue only mounts this
// at all while `story.started` (nothing to debug before a preview has
// actually begun).
import { computed, ref } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import { collectFlags } from '@/project/collectFlags'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
const story = useStoryStore()
const isOpen = ref(false)

// Collection flags (key->value maps) excluded — a live editor for those
// would need its own add/remove-item UI, not a single value widget; out of
// scope for a quick QA tool, same "bounded, not a generic engine" instinct
// as the rest of this feature set (see docs/interactions-et-apps-custom.md).
// Recomputed from the whole project on every access rather than cached —
// same "cheap enough, always current" precedent as EventForm.vue's own
// option lists; the catalog itself rarely changes mid-testing-session.
const flags = computed(() => collectFlags(story.project).filter((f) => !f.isCollection))

// Storage is ALWAYS a plain number (story.js's applyEffects: a boolean
// effect is stored as 1/0, never a real JS boolean) — isBoolean/isNumeric
// are authoring-USAGE hints from collectFlags.js, not guaranteed mutually
// exclusive (a key reused inconsistently across the project can be both).
// Numeric usage wins the tie — a toggle would misrepresent a flag whose
// value can legitimately exceed 1.
function widgetFor(flag) {
  if (flag.isNumeric) return 'number'
  if (flag.isBoolean) return 'toggle'
  return 'number'
}
</script>

<style scoped>
.debug-panel-root {
  position: fixed;
  right: var(--space-4);
  bottom: var(--space-4);
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-2);
}

.spacer {
  flex: 1;
}

.debug-panel {
  width: 320px;
  max-width: 85vw;
  max-height: 60vh;
  overflow-y: auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.debug-panel-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.debug-panel-hint {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  margin: 0 0 var(--space-3);
}

.debug-empty {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  text-align: center;
  padding: var(--space-4);
}

.debug-flag-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.debug-flag-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-border);
}
.debug-flag-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.debug-flag-name {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.debug-flag-key {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text);
}

.debug-flag-label {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.debug-flag-input {
  width: 90px;
  flex-shrink: 0;
}

.debug-panel-fade-enter-active,
.debug-panel-fade-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.debug-panel-fade-enter-from,
.debug-panel-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
