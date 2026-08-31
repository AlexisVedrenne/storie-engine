<template>
  <q-dialog v-model="isOpen" @show="focusInput">
    <q-card class="search-card">
      <q-input
        ref="inputRef"
        dense
        outlined
        clearable
        v-model="query"
        :placeholder="t('globalSearch.placeholder')"
        class="search-input"
      >
        <template #prepend><q-icon name="search" /></template>
      </q-input>

      <div class="results">
        <div v-if="!query.trim()" class="hint">{{ t('globalSearch.hint') }}</div>
        <div v-else-if="!results.length" class="hint">{{ t('globalSearch.noResults') }}</div>
        <q-list v-else dense class="result-list">
          <q-item v-for="(r, i) in results" :key="i" clickable v-ripple @click="go(r)">
            <q-item-section avatar>
              <q-icon :name="ICONS[r.kind] || 'help_outline'" color="primary" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ r.label }}</q-item-label>
              <q-item-label caption>{{ r.context }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
        <div v-if="results.length >= MAX_RESULTS" class="hint truncated">
          {{ t('globalSearch.truncated', { n: MAX_RESULTS }) }}
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup>
// Command-palette-style project-wide search — no existing UI pattern in
// this codebase to copy (checked before building this), so it's a plain
// q-dialog + q-input + q-list rather than an anchored dropdown, matching
// this app's other full-screen-ish dialogs (EditorSettingsDialog, the
// advanced cloud provider picker) instead of a novel widget shape.
// searchProject() is pure and cheap (no cache, same "just recompute"
// precedent as EventForm.vue's own option lists) — filtering re-runs on
// every keystroke, no debounce needed at this project scale.
import { computed, nextTick, ref } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import { searchProject } from '@/project/searchProject'
import { useEditorI18n } from '@/editor/i18n'

const emit = defineEmits(['navigate', 'open-flags'])
const { t } = useEditorI18n()
const story = useStoryStore()

const isOpen = ref(false)
const query = ref('')
const inputRef = ref(null)
const MAX_RESULTS = 50

const ICONS = {
  chapter: 'auto_stories',
  contact: 'contacts',
  thread: 'groups',
  app: 'widgets',
  event: 'sensors',
  automation: 'bolt',
  interaction: 'touch_app',
  entitySchema: 'dataset',
  flag: 'flag',
}

const results = computed(() =>
  query.value.trim() ? searchProject(story.project, query.value).slice(0, MAX_RESULTS) : [],
)

function focusInput() {
  nextTick(() => inputRef.value?.focus())
}

function go(result) {
  isOpen.value = false
  // Flags have no navigable descriptor (the catalog is a dialog, not a
  // viewMode/selection combination) — see searchProject.js's own comment.
  if (result.kind === 'flag' || !result.descriptor) {
    emit('open-flags')
    return
  }
  emit('navigate', result.descriptor, result.navHint)
}

defineExpose({
  open: () => {
    query.value = ''
    isOpen.value = true
  },
})
</script>

<style scoped>
.search-card {
  width: 560px;
  max-width: 92vw;
  padding: var(--space-3);
}
.search-input {
  margin-bottom: var(--space-2);
}
.results {
  max-height: 60vh;
  overflow-y: auto;
}
.hint {
  padding: var(--space-4);
  text-align: center;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}
.hint.truncated {
  padding: var(--space-2);
  font-size: var(--text-xs);
}
</style>
