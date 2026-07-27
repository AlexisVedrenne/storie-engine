<template>
  <q-page class="editor-page">
    <div class="topbar">
      <span class="project-name">{{ story.project?.manifest?.name || '(projet)' }}</span>
      <span v-if="dirty" class="dirty-dot" title="Modifications non enregistrées">●</span>
      <div class="spacer" />
      <q-btn
        dense
        flat
        :icon="focusPreview ? 'visibility_off' : 'smartphone'"
        :label="focusPreview ? `Afficher l'édition` : 'Aperçu seul'"
        @click="focusPreview = !focusPreview"
      />
      <q-toggle dense v-model="autosave" label="Sauvegarde auto" />
      <q-btn dense flat icon="refresh" label="Relancer l'aperçu" @click="restartPreview" />
      <q-btn dense flat icon="save" label="Enregistrer" :disable="!dirty" @click="save" />
      <q-btn dense flat icon="folder_open" label="Changer de projet" @click="closeProject" />
    </div>

    <div class="panes">
      <q-splitter v-if="!focusPreview" v-model="splitOuter" :limits="[12, 45]" class="full-splitter">
        <template #before>
          <div class="pane chapters-pane">
            <ChapterList v-model="selectedIndex" @preview-from="previewFrom" />
          </div>
        </template>

        <template #after>
          <q-splitter v-model="splitInner" :limits="[30, 85]" class="full-splitter">
            <template #before>
              <div class="pane timeline-pane">
                <div v-if="selectedChapter" class="chapter-header">
                  <q-input dense outlined label="Titre" v-model="selectedChapter.title" />
                  <q-input dense outlined label="Id" v-model="selectedChapter.id" />
                </div>
                <div class="sub-title">Condition de démarrage du chapitre (requires, optionnel)</div>
                <RequiresBuilder
                  v-if="selectedChapter"
                  :model-value="selectedChapter.requires"
                  @update:model-value="(v) => (selectedChapter.requires = v)"
                />
                <TimelineEditor v-if="selectedChapter" :entries="selectedChapter.timeline" />
              </div>
            </template>

            <template #after>
              <div class="pane preview-pane">
                <PhoneShell />
              </div>
            </template>
          </q-splitter>
        </template>
      </q-splitter>

      <div v-else class="pane preview-pane focus-mode">
        <PhoneShell />
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Notify } from 'quasar'
import { useStoryStore } from '@/engine/stores/story'
import { serializeChapter } from '@/project/serializeChapter'
import PhoneShell from '@/components/phone/PhoneShell.vue'
import ChapterList from '@/editor/components/ChapterList.vue'
import RequiresBuilder from '@/editor/components/RequiresBuilder.vue'
import TimelineEditor from '@/editor/components/TimelineEditor.vue'

const AUTOSAVE_KEY = 'storie-engine-autosave'
const SPLIT_OUTER_KEY = 'storie-engine-split-outer'
const SPLIT_INNER_KEY = 'storie-engine-split-inner'
const AUTOSAVE_DEBOUNCE_MS = 1200

const router = useRouter()
const story = useStoryStore()

const selectedIndex = ref(0)
const selectedChapter = computed(() => story.project?.chapters?.[selectedIndex.value] || null)

const dirty = ref(false)
const autosave = ref(localStorage.getItem(AUTOSAVE_KEY) === 'true')
watch(autosave, (val) => localStorage.setItem(AUTOSAVE_KEY, String(val)))

// Panes are resizable (drag the splitter handles) and their ratio persists
// across sessions — "Aperçu seul" hides the chapters/timeline panes
// entirely so the phone can be judged full-size without the forms.
const focusPreview = ref(false)
const splitOuter = ref(Number(localStorage.getItem(SPLIT_OUTER_KEY)) || 20)
const splitInner = ref(Number(localStorage.getItem(SPLIT_INNER_KEY)) || 55)
watch(splitOuter, (val) => localStorage.setItem(SPLIT_OUTER_KEY, String(val)))
watch(splitInner, (val) => localStorage.setItem(SPLIT_INNER_KEY, String(val)))

let debounceTimer = null
let stopWatch = null

function watchSelectedChapter() {
  stopWatch?.()
  if (!selectedChapter.value) return
  stopWatch = watch(
    selectedChapter,
    () => {
      dirty.value = true
      if (autosave.value) {
        clearTimeout(debounceTimer)
        debounceTimer = setTimeout(save, AUTOSAVE_DEBOUNCE_MS)
      }
    },
    { deep: true },
  )
}
watch(selectedIndex, () => {
  dirty.value = false
  clearTimeout(debounceTimer)
  watchSelectedChapter()
})
watchSelectedChapter()

async function save() {
  const chapter = selectedChapter.value
  if (!chapter) return
  try {
    await window.storieAPI.saveChapter({
      rootPath: story.project.rootPath,
      sourceFile: chapter.__sourceFile,
      source: serializeChapter(chapter),
    })
    dirty.value = false
    Notify.create({ type: 'positive', message: 'Chapitre enregistré.' })
  } catch (err) {
    Notify.create({ type: 'negative', message: err.message || String(err) })
  }
}

function restartPreview() {
  story.loadProject(story.project)
}

function previewFrom(chapterId) {
  story.startChapter(chapterId)
}

function onKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    save()
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

function closeProject() {
  story.loadProject(null)
  router.push({ name: 'open-project' })
}
</script>

<style scoped>
.editor-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #16161f;
  color: #e8e8f0;
}

.topbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.project-name {
  font-weight: 600;
  font-size: 14px;
}

.dirty-dot {
  color: #ffc107;
}

.spacer {
  flex: 1;
}

.panes {
  flex: 1;
  min-height: 0;
  display: flex;
}

.full-splitter {
  height: 100%;
  width: 100%;
}

.pane {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

.chapters-pane {
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.timeline-pane {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chapter-header {
  display: flex;
  gap: 8px;
}

.sub-title {
  font-size: 11px;
  text-transform: uppercase;
  opacity: 0.6;
}

.preview-pane {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.preview-pane.focus-mode {
  width: 100%;
  padding: 32px;
}
</style>
