<template>
  <q-page class="editor-page">
    <div class="topbar">
      <span class="project-name">{{ story.project?.manifest?.name || '(projet)' }}</span>
      <span v-if="dirty" class="dirty-dot" title="Modifications non enregistrées">●</span>

      <q-btn-toggle
        dense
        no-caps
        unelevated
        v-model="viewMode"
        class="view-toggle"
        :options="[
          { label: 'Chapitres', value: 'chapters' },
          { label: 'Contacts', value: 'contacts' },
          { label: 'Threads', value: 'threads' },
          { label: 'Jeu', value: 'game' },
        ]"
      />

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

      <q-btn
        dense
        outline
        no-caps
        icon="fact_check"
        label="Valider le projet"
        class="btn-ghost"
        :loading="validating"
        @click="runValidation"
      >
        <q-tooltip>Cherche les références cassées (contact/thread/image introuvable) et les problèmes de chapitres</q-tooltip>
      </q-btn>

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
      <div v-if="focusPreview" class="pane preview-pane focus-mode">
        <PhoneShell />
      </div>

      <!-- Single splitter tree shared by all four view modes — only the
           list/form content inside switches with viewMode. PhoneShell stays
           mounted at the same template position across tab switches so it
           never gets destroyed/recreated (it used to live in 4 separate
           branches, one per viewMode, which made Vue tear down and reboot
           the whole preview on every tab click). -->
      <q-splitter v-else v-model="splitOuter" :limits="[12, 45]" class="full-splitter">
        <template #before>
          <div class="pane chapters-pane">
            <ChapterList v-if="viewMode === 'chapters'" v-model="selectedIndex" @preview-from="previewFrom" />
            <ContactList v-else-if="viewMode === 'contacts'" v-model="selectedContactIndex" />
            <ThreadList v-else-if="viewMode === 'threads'" v-model="selectedThreadIndex" />
            <div v-else class="empty-state">Le titre du jeu est un champ unique — pas de liste.</div>
          </div>
        </template>

        <template #after>
          <q-splitter v-model="splitInner" :limits="[30, 85]" class="full-splitter">
            <template #before>
              <div class="pane timeline-pane">
                <template v-if="viewMode === 'chapters'">
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
                </template>

                <template v-else-if="viewMode === 'contacts'">
                  <ContactForm v-if="selectedContact" :contact="selectedContact" />
                  <div v-else class="empty-state">Sélectionne un contact à gauche.</div>
                </template>

                <template v-else-if="viewMode === 'threads'">
                  <ThreadForm v-if="selectedThread" :thread="selectedThread" />
                  <div v-else class="empty-state">Sélectionne un thread à gauche.</div>
                </template>

                <GameForm v-else-if="viewMode === 'game'" :game="story.project.gameConfig" />
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
    </div>
  </q-page>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Dialog, Notify } from 'quasar'
import { useStoryStore } from '@/engine/stores/story'
import { serializeChapter, serializeContacts, serializeThreads, serializeGame } from '@/project/serializeChapter'
import { validateProject, collectAssetPaths } from '@/project/validateProject'
import PhoneShell from '@/components/phone/PhoneShell.vue'
import ChapterList from '@/editor/components/ChapterList.vue'
import RequiresBuilder from '@/editor/components/RequiresBuilder.vue'
import TimelineEditor from '@/editor/components/TimelineEditor.vue'
import FieldHelp from '@/editor/components/FieldHelp.vue'
import ContactList from '@/editor/components/ContactList.vue'
import ContactForm from '@/editor/components/ContactForm.vue'
import ThreadList from '@/editor/components/ThreadList.vue'
import ThreadForm from '@/editor/components/ThreadForm.vue'
import GameForm from '@/editor/components/GameForm.vue'

const AUTOSAVE_KEY = 'storie-engine-autosave'
const SPLIT_OUTER_KEY = 'storie-engine-split-outer'
const SPLIT_INNER_KEY = 'storie-engine-split-inner'
const AUTOSAVE_DEBOUNCE_MS = 1200
// Shared with OpenProjectPage.vue (set on open/create) — "Changer de projet"
// clears it so leaving a project is a deliberate exit, not something the
// next launch silently undoes by reopening the same project.
const LAST_PROJECT_KEY = 'storie-engine-last-project'

const router = useRouter()
const story = useStoryStore()

// Which project-wide resource is being edited — chapters keep their existing
// 3-pane layout, contacts/threads/game reuse the same list+form+preview
// shape (see docs/phase3-plan.md Phase 4 roadmap). Reuses the app's existing
// q-btn-toggle mode-switch convention (see ChoiceEntryForm.vue's SMS/DM
// toggle) rather than introducing routing/tabs, which have no precedent here.
const viewMode = ref('chapters')

const selectedIndex = ref(0)
const selectedChapter = computed(() => story.project?.chapters?.[selectedIndex.value] || null)
const selectedContactIndex = ref(0)
const selectedContact = computed(() => story.project?.contacts?.[selectedContactIndex.value] || null)
const selectedThreadIndex = ref(0)
const selectedThread = computed(() => story.project?.threads?.[selectedThreadIndex.value] || null)

// The object currently watched for the dirty flag/autosave — a single
// chapter for 'chapters' mode, or the whole array/object for the other
// three modes (their save() call always writes the whole file anyway).
const activeResource = computed(() => {
  switch (viewMode.value) {
    case 'chapters':
      return selectedChapter.value
    case 'contacts':
      return story.project?.contacts || null
    case 'threads':
      return story.project?.threads || null
    case 'game':
      return story.project?.gameConfig || null
    default:
      return null
  }
})

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

function watchActiveResource() {
  stopWatch?.()
  if (!activeResource.value) return
  stopWatch = watch(
    activeResource,
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
// Only re-arm on viewMode/selectedIndex change, NOT on
// selectedContactIndex/selectedThreadIndex — those pick which item the form
// *displays* within the same already-watched array, so re-arming on them
// would wrongly reset `dirty` just from selecting a different row.
watch([viewMode, selectedIndex], () => {
  dirty.value = false
  clearTimeout(debounceTimer)
  watchActiveResource()
})
watchActiveResource()

async function save() {
  try {
    if (viewMode.value === 'chapters') {
      const chapter = selectedChapter.value
      if (!chapter) return
      await window.storieAPI.saveChapter({
        rootPath: story.project.rootPath,
        sourceFile: chapter.__sourceFile,
        source: serializeChapter(chapter),
      })
    } else if (viewMode.value === 'contacts') {
      await window.storieAPI.saveContacts({
        rootPath: story.project.rootPath,
        source: serializeContacts(story.project.contacts),
      })
    } else if (viewMode.value === 'threads') {
      await window.storieAPI.saveThreads({
        rootPath: story.project.rootPath,
        source: serializeThreads(story.project.threads),
      })
    } else if (viewMode.value === 'game') {
      await window.storieAPI.saveGame({
        rootPath: story.project.rootPath,
        source: serializeGame(story.project.gameConfig),
      })
    }
    dirty.value = false
    Notify.create({ type: 'positive', message: 'Enregistré.' })
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
  localStorage.removeItem(LAST_PROJECT_KEY)
  story.loadProject(null)
  router.push({ name: 'open-project' })
}

// Shared by the "Valider le projet" button and the pre-build check below —
// runs the pure scanner (validateProject.js) plus the asset-existence IPC
// round trip (renderer has no fs access) and folds missing assets into
// `errors`, same shape either caller needs.
async function computeValidation() {
  const { errors, warnings } = validateProject(story.project)
  const assetRefs = collectAssetPaths(story.project)
  const missing = await window.storieAPI.checkAssets({
    rootPath: story.project.rootPath,
    assetsRoot: story.project.assetsRoot,
    paths: assetRefs.map((a) => a.path),
  })
  for (const missingPath of missing) {
    const ref = assetRefs.find((a) => a.path === missingPath)
    errors.push(`Fichier introuvable dans assets/ : "${missingPath}" (référencé par ${ref.labels.join(', ')})`)
  }
  return { errors, warnings }
}

function showValidationDialog(errors, warnings) {
  if (!errors.length && !warnings.length) {
    Dialog.create({ title: 'Validation du projet', message: 'Aucun problème détecté.', ok: true })
    return
  }
  const parts = []
  if (errors.length) parts.push(`ERREURS (${errors.length}) :\n${errors.join('\n')}`)
  if (warnings.length) parts.push(`AVERTISSEMENTS (${warnings.length}) :\n${warnings.join('\n')}`)
  Dialog.create({ title: 'Validation du projet', message: parts.join('\n\n'), ok: true })
}

const validating = ref(false)
async function runValidation() {
  validating.value = true
  try {
    const { errors, warnings } = await computeValidation()
    showValidationDialog(errors, warnings)
  } catch (err) {
    Notify.create({ type: 'negative', message: err.message || String(err) })
  } finally {
    validating.value = false
  }
}

const building = ref(false)
async function buildGame() {
  building.value = true
  try {
    const { errors, warnings } = await computeValidation()
    if (errors.length) {
      showValidationDialog(errors, warnings)
      Notify.create({ type: 'negative', message: 'Build annulé — corrige les erreurs de validation d\'abord.' })
      return
    }
    if (warnings.length) {
      const proceed = await new Promise((resolve) => {
        Dialog.create({
          title: 'Avertissements de validation',
          message: `${warnings.length} avertissement(s) détecté(s) :\n\n${warnings.join('\n')}\n\nLancer le build quand même ?`,
          cancel: true,
          persistent: true,
        })
          .onOk(() => resolve(true))
          .onCancel(() => resolve(false))
      })
      if (!proceed) return
    }

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

.view-toggle {
  margin-left: var(--space-3);
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
