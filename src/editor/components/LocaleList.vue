<template>
  <div class="locale-list">
    <div class="pane-label">{{ t('localeList.paneLabel') }}</div>

    <div
      v-for="locale in locales"
      :key="locale"
      class="locale-row"
      :class="{ active: locale === modelValue }"
      @click="emit('update:modelValue', locale)"
    >
      <div class="active-bar" />
      <q-icon name="translate" size="16px" class="locale-icon" />
      <div class="locale-info">
        <div class="locale-name">{{ locale }}</div>
        <div class="locale-progress">{{ t('localeList.translatedProgress', { done: translatedCount(locale), total: totalStrings }) }}</div>
      </div>
      <q-btn
        dense
        flat
        round
        icon="delete"
        size="sm"
        color="negative"
        class="delete-btn"
        @click.stop="confirmDelete(locale)"
      >
        <q-tooltip>{{ t('localeList.deleteTooltip') }}</q-tooltip>
      </q-btn>
    </div>

    <q-btn
      class="new-locale-btn"
      dense
      flat
      no-caps
      icon="add"
      :label="t('localeList.newLocale')"
      color="primary"
      :disable="!addableLocales.length"
      @click="newDialog = true"
    >
      <q-tooltip v-if="!addableLocales.length">
        {{ t('localeList.allAdded') }}
      </q-tooltip>
    </q-btn>

    <q-dialog v-model="newDialog">
      <q-card class="new-card">
        <q-card-section>
          <div class="text-subtitle1">{{ t('localeList.newLocale') }}</div>
          <div class="dialog-hint">{{ t('localeList.constraintHint') }}</div>
          <div v-if="systemLocaleLabel" class="dialog-hint">
            {{ t('localeList.systemLocaleHidden', { locale: systemLocaleLabel }) }}
          </div>
          <q-select
            dense
            outlined
            emit-value
            map-options
            :label="t('localeList.languageLabel')"
            :options="addableLocales"
            v-model="newCode"
            class="q-mt-sm"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="t('common.cancel')" v-close-popup />
          <q-btn flat :label="t('common.create')" color="primary" :disable="!newCode" @click="createLocale" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { Dialog, Notify } from 'quasar'
import { useStoryStore } from '@/engine/stores/story'
import { extractTranslatableStrings } from '@/project/extractTranslatableStrings'
import { SUPPORTED_LOCALES } from '@/engine/i18n/locales'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
const props = defineProps({ modelValue: { type: String, default: '' } })
const emit = defineEmits(['update:modelValue'])
const story = useStoryStore()

const locales = computed(() => Object.keys(story.project.i18n || {}).sort())

// Best-effort guess at "the language the author writes chapters in": the
// host OS's own UI language (Electron's app.getLocale(), via
// project:getSystemLocale — see src-electron/ipc/app.js). Not exclude-by-
// hardcoded-French anymore (an English-system author might genuinely want
// to add fr-FR) — this is a per-machine heuristic instead, matched against
// SUPPORTED_LOCALES by exact code first, then by language subtag (system
// 'fr' matches catalog 'fr-FR'). Silently skipped (no exclusion) outside
// Electron or if detection fails — it's a convenience default, not a rule
// anything depends on.
const systemLocaleCode = ref('')
onMounted(async () => {
  if (!window.storieAPI?.getSystemLocale) return
  try {
    const raw = await window.storieAPI.getSystemLocale()
    const match = SUPPORTED_LOCALES.find((l) => l.code === raw || l.code.split('-')[0] === raw.split('-')[0])
    systemLocaleCode.value = match?.code || ''
  } catch {
    // non-fatal — just no exclusion
  }
})
const systemLocaleLabel = computed(() => SUPPORTED_LOCALES.find((l) => l.code === systemLocaleCode.value)?.label || '')

// Constrained to the engine's known UI-chrome languages (SUPPORTED_LOCALES)
// minus ones already added to this project, minus the detected system
// language (see above). No free-text code entry: an arbitrary code would
// have no interface translation at all, which is exactly the mismatch this
// constraint exists to avoid going forward (pre-existing locales created
// before this constraint, if any, are left as-is — see
// story.availableLocales' fallback for those).
const addableLocales = computed(() =>
  SUPPORTED_LOCALES.filter((l) => !locales.value.includes(l.code) && l.code !== systemLocaleCode.value).map((l) => ({
    label: l.label,
    value: l.code,
  })),
)

// Computed once, shared across every locale row's progress badge — pure and
// cheap enough for a project this size (same extractor used by the bucket
// editor pane).
const extracted = computed(() => extractTranslatableStrings(story.project))
const totalStrings = computed(() => Object.values(extracted.value).reduce((n, arr) => n + arr.length, 0))
function translatedCount(locale) {
  const dict = story.project.i18n[locale] || {}
  let n = 0
  for (const [bucket, strings] of Object.entries(extracted.value)) {
    const bucketDict = dict[bucket] || {}
    for (const s of strings) if (bucketDict[s]) n += 1
  }
  return n
}

const newDialog = ref(false)
const newCode = ref('')

async function createLocale() {
  const code = newCode.value.trim()
  if (!code) return
  try {
    const created = await window.storieAPI.createLocale({ rootPath: story.project.rootPath, locale: code })
    if (!story.project.i18n[created]) story.project.i18n[created] = { common: {} }
    emit('update:modelValue', created)
    newCode.value = ''
    Notify.create({ type: 'positive', message: t('localeList.localeCreated') })
  } catch (err) {
    Notify.create({ type: 'negative', message: err.message || String(err) })
  }
}

// Irreversible — deletes every translated string for that locale, both on
// disk (project:deleteLocale, i18n/<locale>/) and in the live project data.
// Guarded by a confirm dialog (same Dialog.create({color:'negative'})
// pattern as FlagsPanel.vue's own bulk-delete), unlike createLocale above
// which has nothing destructive to guard.
function confirmDelete(locale) {
  Dialog.create({
    title: t('localeList.confirmDeleteTitle', { locale }),
    message: t('localeList.confirmDeleteBody'),
    cancel: true,
    persistent: true,
    color: 'negative',
  }).onOk(async () => {
    try {
      await window.storieAPI.deleteLocale({ rootPath: story.project.rootPath, locale })
      delete story.project.i18n[locale]
      if (props.modelValue === locale) emit('update:modelValue', '')
      Notify.create({ type: 'positive', message: t('localeList.localeDeleted') })
    } catch (err) {
      Notify.create({ type: 'negative', message: err.message || String(err) })
    }
  })
}
</script>

<style scoped>
.locale-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-2);
}

.pane-label {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  padding: var(--space-2) var(--space-2) var(--space-1);
}

.locale-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--row-height);
  padding: var(--space-2) var(--space-2) var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.locale-row:hover {
  background: var(--color-surface-hover);
}

.locale-row.active {
  background: var(--color-accent-tint);
}

.active-bar {
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 3px;
  border-radius: 2px;
  background: transparent;
}

.locale-row.active .active-bar {
  background: var(--color-accent);
}

.delete-btn {
  flex-shrink: 0;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.locale-row:hover .delete-btn {
  opacity: 1;
}

.locale-icon {
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.locale-info {
  flex: 1;
  min-width: 0;
}

.locale-name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text);
  font-family: var(--font-mono);
}

.locale-progress {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.new-locale-btn {
  margin-top: var(--space-2);
  justify-content: flex-start;
}

.new-card {
  min-width: 320px;
  background: var(--color-surface);
  color: var(--color-text);
}

.dialog-hint {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  margin-top: var(--space-1);
}
</style>
