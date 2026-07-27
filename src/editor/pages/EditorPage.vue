<template>
  <q-page class="editor-page">
    <div class="topbar">
      <span class="project-name">{{ story.project?.manifest?.name || '(projet)' }}</span>
      <span v-if="dirty" class="dirty-dot" title="Modifications non enregistrées">●</span>
      <div class="spacer" />

      <q-btn
        dense
        flat
        no-caps
        :icon="focusPreview ? 'visibility_off' : 'smartphone'"
        :label="focusPreview ? `Afficher l'édition` : 'Aperçu seul'"
        class="btn-ghost"
        @click="focusPreview = !focusPreview"
      />
      <q-toggle dense v-model="autosave" label="Sauvegarde auto" color="primary" />
      <q-btn dense flat no-caps round icon="refresh" class="btn-ghost" @click="restartPreview">
        <q-tooltip>Relancer l'aperçu</q-tooltip>
      </q-btn>

      <div class="topbar-divider" />

      <q-btn dense unelevated no-caps icon="save" label="Enregistrer" color="primary" :disable="!dirty" @click="save" />
      <q-btn
        dense
        outline
        no-caps
        icon="rocket_launch"
        label="Build"
        color="primary"
        :loading="building"
        :disable="building"
        @click="buildGame"
      >
        <q-tooltip>Exporter ce projet en jeu jouable (app Electron packagée)</q-tooltip>
      </q-btn>
      <q-btn dense flat no-caps icon="folder_open" label="Changer de projet" class="btn-ghost" :disable="building" @click="closeProject" />
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
                <template v-if="selectedChapter">
                  <div class="panel chapter-header">
                    <q-input dense outlined label="Titre" v-model="selectedChapter.title" />
                    <q-input dense outlined label="Id" v-model="selectedChapter.id" class="id-input" />
                  </div>

                  <div class="panel">
                    <div class="section-label">
                      Condition de démarrage du chapitre (optionnel)
                      <FieldHelp
                        text="Ce chapitre ne démarre que si toutes ces conditions sont vraies. Rien d'ajouté = toujours autorisé."
                      />
                    </div>
                    <RequiresBuilder
                      :model-value="selectedChapter.requires"
                      @update:model-value="(v) => (selectedChapter.requires = v)"
                    />
                  </div>

                  <TimelineEditor :entries="selectedChapter.timeline" />
                </template>
                <div v-else class="empty-state">Sélectionne un chapitre à gauche.</div>
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
import FieldHelp from '@/editor/components/FieldHelp.vue'

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

const building = ref(false)
async function buildGame() {
  building.value = true
  try {
    const outDir = await window.storieAPI.buildGame({ rootPath: story.project.rootPath })
    if (outDir) {
      Notify.create({ type: 'positive', message: `Jeu exporté dans ${outDir}`, timeout: 6000 })
    }
  } catch (err) {
    Notify.create({ type: 'negative', message: err.message || String(err), timeout: 8000 })
  } finally {
    building.value = false
  }
}
</script>

<style scoped>
.editor-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-ui);
}

.topbar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  height: var(--header-height);
  flex-shrink: 0;
  padding: 0 var(--space-4);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.project-name {
  font-weight: 600;
  font-size: var(--text-base);
}

.dirty-dot {
  color: var(--color-warning);
  font-size: var(--text-sm);
}

.spacer {
  flex: 1;
}

.topbar-divider {
  width: 1px;
  align-self: stretch;
  margin: var(--space-2) 0;
  background: var(--color-border);
}

.btn-ghost {
  color: var(--color-text-muted);
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
  border-right: 1px solid var(--color-border);
  background: var(--color-bg);
}

.timeline-pane {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
}

.chapter-header {
  display: flex;
  gap: var(--space-3);
}

.id-input {
  width: 220px;
  flex-shrink: 0;
  font-family: var(--font-mono);
}

.section-label {
  display: flex;
  align-items: center;
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  margin-bottom: var(--space-2);
}

.empty-state {
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  padding: var(--space-6);
  text-align: center;
}

.preview-pane {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: var(--color-bg);
}

.preview-pane.focus-mode {
  width: 100%;
  padding: var(--space-8);
}
</style>
