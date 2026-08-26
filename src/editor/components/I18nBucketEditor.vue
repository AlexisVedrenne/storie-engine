<template>
  <div class="i18n-editor">
    <div class="panel toolbar">
      <q-btn-toggle
        dense
        no-caps
        unelevated
        :model-value="bucket"
        :options="bucketOptions"
        @update:model-value="(v) => emit('update:bucket', v)"
      />
      <div class="spacer" />
      <span class="count">{{ t('i18nBucketEditor.translatedInFolder', { done: translatedCount, total: strings.length }) }}</span>
    </div>

    <div v-if="!strings.length" class="empty-state">
      {{ t('i18nBucketEditor.noStrings') }}
    </div>

    <template v-else>
      <div class="panel toolbar">
        <q-input
          dense
          outlined
          clearable
          v-model="search"
          :placeholder="t('i18nBucketEditor.searchPlaceholder')"
          class="string-search"
        >
          <template #prepend>
            <q-icon name="search" size="18px" />
          </template>
        </q-input>
        <q-toggle dense v-model="hideTranslated" :label="t('i18nBucketEditor.hideTranslated')" color="primary" />
      </div>

      <!-- "commun" mixes contact names/bios, group names, and every seed
           sub-type in one pile — grouped by origin here instead of one flat
           alphabetical list. Chapter buckets stay flat: everything in there
           already belongs to the one chapter you picked, a sub-grouping
           by entry type wouldn't earn its keep the same way. -->
      <template v-if="bucket === 'common'">
        <div v-if="!commonGroups.length" class="empty-state">
          {{ t('i18nBucketEditor.noMatch') }}
        </div>
        <q-list v-else bordered class="common-group-list">
          <q-expansion-item
            v-for="group in commonGroups"
            :key="group.key + JSON.stringify(group.params || '')"
            :label="`${groupLabel(group)} (${group.items.length})`"
            dense-toggle
          >
            <div class="rows common-group-rows">
              <div v-for="frText in group.items" :key="frText" class="row">
                <div class="source" :title="frText">{{ frText }}</div>
                <q-input
                  dense
                  outlined
                  :ref="(el) => (translationRefs[frText] = el)"
                  class="translation-input"
                  :model-value="getValue(frText)"
                  @update:model-value="(v) => setValue(frText, v)"
                >
                  <template #append>
                    <EmojiPickerBtn @pick="(e) => setValue(frText, insertEmojiAtCaret(translationRefs[frText], getValue(frText), e))" />
                  </template>
                </q-input>
                <span class="badge" :class="getValue(frText) ? 'badge-translated' : 'badge-missing'">
                  {{ getValue(frText) ? t('i18nBucketEditor.translated') : t('i18nBucketEditor.missing') }}
                </span>
              </div>
            </div>
          </q-expansion-item>
        </q-list>
      </template>

      <template v-else>
        <div v-if="!filteredStrings.length" class="empty-state">
          {{ t('i18nBucketEditor.noMatch') }}
        </div>

        <div v-else class="rows">
          <div v-for="frText in filteredStrings" :key="frText" class="row">
            <div class="source" :title="frText">{{ frText }}</div>
            <q-input
              dense
              outlined
              :ref="(el) => (translationRefs[frText] = el)"
              class="translation-input"
              :model-value="getValue(frText)"
              @update:model-value="(v) => setValue(frText, v)"
            >
              <template #append>
                <EmojiPickerBtn @pick="(e) => setValue(frText, insertEmojiAtCaret(translationRefs[frText], getValue(frText), e))" />
              </template>
            </q-input>
            <span class="badge" :class="getValue(frText) ? 'badge-translated' : 'badge-missing'">
              {{ getValue(frText) ? 'Traduit' : 'Manquant' }}
            </span>
          </div>
        </div>
      </template>
    </template>

    <template v-if="orphanKeys.length">
      <div class="section-label orphan-label">
        {{ t('i18nBucketEditor.unusedTranslations') }} ({{ orphanSearch ? `${filteredOrphanKeys.length}/${orphanKeys.length}` : orphanKeys.length }})
        <FieldHelp :text="t('i18nBucketEditor.unusedTranslationsHelp')" />
      </div>
      <q-input
        dense
        outlined
        clearable
        v-model="orphanSearch"
        :placeholder="t('i18nBucketEditor.searchOrphansPlaceholder')"
        class="orphan-search"
      >
        <template #prepend>
          <q-icon name="search" size="18px" />
        </template>
      </q-input>
      <div class="rows">
        <div v-for="frText in filteredOrphanKeys" :key="frText" class="row orphan-row">
          <div class="source" :title="frText">{{ frText }}</div>
          <div class="translation-readonly" :title="getValue(frText)">{{ getValue(frText) }}</div>
          <q-btn dense flat round icon="delete" size="sm" color="negative" @click="deleteKey(frText)">
            <q-tooltip>{{ t('i18nBucketEditor.deleteUnusedTooltip') }}</q-tooltip>
          </q-btn>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import { extractTranslatableStrings, extractCommonCategories } from '@/project/extractTranslatableStrings'
import FieldHelp from '@/editor/components/FieldHelp.vue'
import EmojiPickerBtn from '@/components/shared/EmojiPickerBtn.vue'
import { insertEmojiAtCaret } from '@/components/shared/emojiInsert'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
const props = defineProps({
  locale: { type: String, required: true },
  bucket: { type: String, required: true },
})
const emit = defineEmits(['update:bucket'])
const story = useStoryStore()
// Plain object (not reactive) — per-row DOM ref bag for EmojiPickerBtn's
// caret insertion, keyed by source string since rows aren't index-stable
// (filtering/sorting can reorder them).
const translationRefs = {}

const bucketOptions = computed(() => [
  { label: t('eventList.common'), value: 'common' },
  ...(story.project?.chapters || []).map((c) => ({ label: c.title || c.id, value: c.id })),
])

// The dict object at story.project.i18n[locale][bucket] must exist (even
// empty) before any row can bind to it — a freshly created locale only
// seeds common.js on disk (see project:createLocale), and a chapter bucket
// may never have been translated at all yet.
function ensureBucket() {
  if (!story.project.i18n[props.locale]) story.project.i18n[props.locale] = {}
  if (!story.project.i18n[props.locale][props.bucket]) story.project.i18n[props.locale][props.bucket] = {}
}
watch(() => [props.locale, props.bucket], ensureBucket, { immediate: true })

const extracted = computed(() => extractTranslatableStrings(story.project))
const strings = computed(() => extracted.value[props.bucket] || [])

const dict = computed(() => story.project.i18n?.[props.locale]?.[props.bucket] || {})

function getValue(frText) {
  return dict.value[frText] || ''
}
// A row just typed into stays visible even under "hide translated" — without
// this, the very first keystroke on an empty field flips getValue() truthy
// and the row (and the input being typed into) vanishes out from under the
// cursor. Pinned for 2s after the LAST keystroke (reset on every edit, same
// debounce shape as a search-as-you-type box), then matchesFilters applies
// the hide rule normally — the row settles out of view once the translator
// has actually moved on, not mid-edit.
const recentlyEdited = reactive(new Set())
const editTimers = {}
onUnmounted(() => {
  for (const timer of Object.values(editTimers)) clearTimeout(timer)
})

function setValue(frText, val) {
  ensureBucket()
  story.project.i18n[props.locale][props.bucket][frText] = val || undefined
  recentlyEdited.add(frText)
  clearTimeout(editTimers[frText])
  editTimers[frText] = setTimeout(() => recentlyEdited.delete(frText), 2000)
}
function deleteKey(frText) {
  ensureBucket()
  delete story.project.i18n[props.locale][props.bucket][frText]
}

const translatedCount = computed(() => strings.value.filter((s) => getValue(s)).length)

// Same search-over-the-list need as the orphan section below, but for the
// main strings — a translator hunting for what's left to do on a bucket
// with hundreds of entries (see docs/ui-ux-audit.md point 8) needs both a
// text filter and a way to hide what's already done, not just scroll.
const search = ref('')
const hideTranslated = ref(false)
function matchesFilters(s) {
  if (hideTranslated.value && getValue(s) && !recentlyEdited.has(s)) return false
  const q = search.value.trim().toLowerCase()
  if (!q) return true
  return s.toLowerCase().includes(q) || (getValue(s) || '').toLowerCase().includes(q)
}
const filteredStrings = computed(() => strings.value.filter(matchesFilters))

// Grouped view for the 'common' bucket only (see template) — same
// search/hideTranslated filters as filteredStrings above, applied inside
// each origin group instead of one flat list; a group that filters down to
// nothing just disappears rather than showing an empty subheader.
const commonGroups = computed(() => {
  if (props.bucket !== 'common') return []
  return extractCommonCategories(story.project)
    .map((g) => ({ key: g.key, params: g.params, items: g.items.filter(matchesFilters) }))
    .filter((g) => g.items.length)
})

// `app` groups interpolate the real app name; every other key is a plain
// editor i18n lookup (see i18nBucketEditor.group* keys) — kept out of
// extractTranslatableStrings.js since that module stays pure/store-free and
// must not depend on the editor's own i18n.
function groupLabel(group) {
  if (group.key === 'app') return t('i18nBucketEditor.groupApp', group.params)
  return t(`i18nBucketEditor.group${group.key[0].toUpperCase()}${group.key.slice(1)}`)
}

const orphanKeys = computed(() => Object.keys(dict.value).filter((k) => !strings.value.includes(k)).sort())

// Search over the orphan list only (docs/ui-ux-audit.md point 8) — the
// main strings list above isn't the pain point, it's this one that grows
// unbounded with no other way to navigate it (152 entries in the fixture).
const orphanSearch = ref('')
const filteredOrphanKeys = computed(() => {
  const q = orphanSearch.value.trim().toLowerCase()
  if (!q) return orphanKeys.value
  return orphanKeys.value.filter((k) => k.toLowerCase().includes(q) || (getValue(k) || '').toLowerCase().includes(q))
})
</script>

<style scoped>
.i18n-editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.spacer {
  flex: 1;
}

.count {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.empty-state {
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  padding: var(--space-6);
  text-align: center;
}

.rows {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.source {
  flex: 1;
  min-width: 0;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.translation-input {
  flex: 1;
  min-width: 0;
}

.translation-readonly {
  flex: 1;
  min-width: 0;
  font-size: var(--text-sm);
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}

.badge-translated {
  background: var(--color-surface-hover);
  color: var(--color-text-muted);
}

.badge-missing {
  background: var(--color-warning-tint);
  color: var(--color-warning);
}

.section-label {
  display: flex;
  align-items: center;
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
}

.common-group-list {
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.common-group-rows {
  padding: var(--space-2) var(--space-3) var(--space-3);
}

.orphan-label {
  margin-top: var(--space-2);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}

.orphan-search {
  margin-bottom: var(--space-1);
}

.string-search {
  flex: 1;
}

.orphan-row {
  opacity: 0.75;
}
</style>
