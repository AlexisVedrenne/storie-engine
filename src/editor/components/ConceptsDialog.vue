<template>
  <q-dialog v-model="isOpen">
    <q-card class="concepts-card">
      <div class="concepts-header">
        <div class="header-title">
          <q-icon name="help_outline" size="22px" color="primary" />
          <span class="text-subtitle1">{{ t('conceptsDialog.title') }}</span>
        </div>
        <q-btn dense flat round icon="close" v-close-popup />
      </div>
      <q-separator />

      <div class="concepts-body">
        <p class="intro">{{ t('conceptsDialog.intro') }}</p>

        <div v-for="term in TERMS" :key="term.key" class="term-row">
          <q-icon :name="term.icon" size="18px" class="term-icon" />
          <div class="term-text">
            <div class="term-name">{{ t(`conceptsDialog.${term.key}Term`) }}</div>
            <div class="term-desc">{{ t(`conceptsDialog.${term.key}Desc`) }}</div>
          </div>
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup>
// Standing "?" glossary, opened from the topbar (EditorPage.vue) — plain-
// language definitions of every tab's core vocabulary in one place, for
// whoever opens the editor without already knowing what "flag"/"event"/
// "automatisation"/etc mean here. Complements FieldHelp.vue's per-field
// tooltips (which assume you already picked the right screen) rather than
// replacing them: this is the "what IS this tab even for" layer, FieldHelp
// is the "what does THIS field do" layer. One term per app concept, same
// order as the topbar tabs (chapterGraph.newChapter/flag/event/
// automationList/interactionList/customApp/entitySchema/seed/i18n) so
// browsing this list roughly retraces the tab bar left to right.
import { ref } from 'vue'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
const isOpen = ref(false)

const TERMS = [
  { key: 'chapter', icon: 'auto_stories' },
  { key: 'flag', icon: 'flag' },
  { key: 'event', icon: 'sensors' },
  { key: 'automation', icon: 'bolt' },
  { key: 'interaction', icon: 'touch_app' },
  { key: 'customApp', icon: 'widgets' },
  { key: 'entitySchema', icon: 'dataset' },
  { key: 'seed', icon: 'inventory_2' },
  { key: 'i18n', icon: 'translate' },
]

defineExpose({ open: () => (isOpen.value = true) })
</script>

<style scoped>
.concepts-card {
  width: 520px;
  max-width: 92vw;
}
.concepts-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
}
.header-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.concepts-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-4);
  max-height: 70vh;
  overflow-y: auto;
}
.intro {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  margin: 0 0 var(--space-2);
  line-height: 1.5;
}
.term-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-1);
  border-radius: var(--radius-sm);
}
.term-row:hover {
  background: var(--color-surface-hover);
}
.term-icon {
  color: var(--color-text-muted);
  margin-top: 2px;
  flex-shrink: 0;
}
.term-name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text);
}
.term-desc {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  line-height: 1.5;
}
</style>
