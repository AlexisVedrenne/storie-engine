<template>
  <q-expansion-item dense-toggle icon="flag_circle" class="panel">
    <template #header>
      <q-item-section avatar><q-icon name="flag_circle" /></q-item-section>
      <q-item-section>
        {{ t('chapterEndScreen.title') }}
        <FieldHelp :text="t('chapterEndScreen.help')" />
      </q-item-section>
    </template>
    <div class="panel-body">
      <q-input
        dense
        outlined
        :label="t('chapterEndScreen.titleLabel')"
        v-model="chapter.endScreen.title"
      />
      <q-input
        dense
        outlined
        type="textarea"
        autogrow
        :label="t('chapterEndScreen.textLabel')"
        v-model="chapter.endScreen.text"
      />
      <AssetField v-model="chapter.endScreen.image" :label="t('chapterEndScreen.imageLabel')" />
    </div>
  </q-expansion-item>
</template>

<script setup>
// Only ever mounted by EditorPage.vue when the selected chapter currently
// has no outgoing edges (see its own isEndingChapter computed) — same
// condition ChapterGraph.vue already uses for the "FIN" badge, so this
// panel appears and disappears exactly when it's relevant, never dead UI on
// an ordinary chapter. All 3 fields optional — see EndScreen.vue (the
// player-facing side) for the generic fallback when nothing's filled in.
import AssetField from '@/editor/components/AssetField.vue'
import FieldHelp from '@/editor/components/FieldHelp.vue'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
const props = defineProps({ chapter: { type: Object, required: true } })

// Lazily initializes chapter.endScreen once, at setup — same "ensure the
// optional nested object exists" pattern useCloudSync.js's
// ensureCloudSyncField() uses, just done eagerly here rather than on each
// read (a computed with this side effect trips vue/no-side-effects-in-
// computed-properties, rightfully — a computed can re-run more than once).
// `chapter` is the live reactive project object (mutated in place, standard
// convention across every editor form), so this write is immediately
// visible to the live preview and picked up by EditorPage.vue's generic
// autosave watcher like any other field. Safe to run unconditionally on
// every mount: this component is itself only ever mounted while the
// chapter has no outgoing edges (see EditorPage.vue's isEndingChapter), so
// there's no risk of stamping an empty endScreen onto an ordinary chapter.
if (!props.chapter.endScreen) props.chapter.endScreen = {}
</script>

<style scoped>
.panel-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
</style>
