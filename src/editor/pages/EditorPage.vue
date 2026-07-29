<template>
  <q-page class="editor-page">
    <!-- Guards every child below (ChapterList/ContactList/.../GameForm) from
         ever mounting with story.project === null — several of them read
         story.project.<field> directly at setup() top level (not behind
         optional chaining), so without this the page hard-crashes instead
         of just showing nothing. Reachable with no project loaded via
         dev-server HMR resetting the Pinia store while still routed to
         /editor, or landing here directly (browser back/forward, a stale
         URL) without going through OpenProjectPage's load flow first. -->
    <div v-if="!story.project" class="editor-empty">
      <q-spinner color="primary" size="32px" />
      <p>Aucun projet chargé — redirection…</p>
    </div>

    <template v-else>
      <div class="topbar">
        <span class="project-name">{{ story.project?.manifest?.name || '(projet)' }}</span>
        <span v-if="dirty" class="dirty-dot" title="Modifications non enregistrées">●</span>

        <q-tabs
          dense
          no-caps
          v-model="viewMode"
          class="view-tabs q-pa-sm"
          active-color="primary"
          indicator-color="primary"
          align="left"
        >
          <q-tab name="chapters" icon="auto_stories">
            <q-tooltip>Chapitres</q-tooltip>
          </q-tab>
          <q-tab name="contacts" icon="contacts">
            <q-tooltip>Contacts</q-tooltip>
          </q-tab>
          <q-tab name="threads" icon="groups">
            <q-tooltip>Groupes</q-tooltip>
          </q-tab>
          <q-tab name="game" icon="sports_esports">
            <q-tooltip>Jeu</q-tooltip>
          </q-tab>
          <q-tab name="assets" icon="folder">
            <q-tooltip>Ressources</q-tooltip>
          </q-tab>
          <q-tab name="i18n" icon="translate">
            <q-tooltip>Traductions</q-tooltip>
          </q-tab>
          <q-tab name="seed" icon="inventory_2">
            <q-tooltip>Contenu initial</q-tooltip>
          </q-tab>
        </q-tabs>

        <div class="spacer" />

        <q-btn
          dense
          flat
          round
          :icon="focusPreview ? 'visibility_off' : 'smartphone'"
          class="btn-ghost"
          @click="focusPreview = !focusPreview"
        >
          <q-tooltip>{{ focusPreview ? `Afficher l'édition` : 'Aperçu seul' }}</q-tooltip>
        </q-btn>
        <q-toggle dense v-model="autosave" label="Sauvegarde auto" color="primary" />
        <q-btn dense flat no-caps round icon="refresh" class="btn-ghost" @click="restartPreview">
          <q-tooltip>Relancer l'aperçu</q-tooltip>
        </q-btn>

        <div class="topbar-divider" />

        <q-btn
          dense
          flat
          round
          icon="fact_check"
          class="btn-ghost"
          :loading="validating"
          @click="runValidation"
        >
          <q-tooltip
            >Valider le projet — cherche les références cassées (contact/thread/image introuvable)
            et les problèmes de chapitres</q-tooltip
          >
        </q-btn>

        <q-btn
          dense
          unelevated
          no-caps
          icon="save"
          label="Enregistrer"
          color="primary"
          :disable="!dirty"
          @click="save"
        />
        <q-btn
          dense
          flat
          round
          icon="rocket_launch"
          color="primary"
          :loading="building"
          :disable="building"
          @click="buildGame"
        >
          <q-tooltip>Build — exporter ce projet en jeu jouable (app Electron packagée)</q-tooltip>
        </q-btn>
        <q-btn
          dense
          flat
          round
          icon="folder_open"
          class="btn-ghost"
          :disable="building"
          @click="closeProject"
        >
          <q-tooltip>Changer de projet</q-tooltip>
        </q-btn>
      </div>

      <div class="panes">
        <!-- Default state for the Chapitres tab: nothing selected yet =
             full-bleed graph, no form/preview clutter (user feedback: the
             3-pane split made the graph itself unreadably cramped and the
             UI noisy before a chapter is even picked). A separate absolute
             overlay ON TOP of the untouched splitter below, rather than
             conditionally removing that splitter/its Teleport target.
             v-show (not v-if) — same permanently-mounted rule as the
             focus/docked panes below applies here too: #phone-slot-
             chapterpage (in the sibling overlay) is one of 3 Teleport
             targets now, and a target that disappears out from under an
             active Teleport is exactly the "Invalid Teleport target" crash
             class already hit once in this codebase (that's also why THIS
             overlay stays mounted even though it holds no Teleport target
             itself — toggling between v-if and v-show for the two sibling
             overlays independently would still fight the same Teleport,
             simplest to keep both always-mounted). Clicking a node sets
             `selectedIndex`, which hides this overlay and reveals the
             chapter-page overlay below (which has a "← Retour au graphe"
             button to come back). -->
        <!-- `<transition>` works fine wrapping a v-show'd element — it only
             toggles CSS classes around the show/hide, the element itself
             never unmounts, so this doesn't reopen the Teleport-target risk
             the comments below are so careful about. -->
        <transition name="pane-fade">
          <div v-show="graphActive" class="graph-fullscreen">
            <ChapterGraph
              v-model="selectedIndex"
              :active="graphActive"
              @preview-from="previewFrom"
            />
          </div>
        </transition>

        <!-- Once a chapter IS selected: a full-page 2-pane layout (form |
             phone), no graph column at all. v-show on the wrapper (see
             above) + v-if on the inner content (guards `selectedChapter.*`
             field access for when this is hidden and selectedChapter is
             null) — #phone-slot-chapterpage itself must stay permanently
             in the DOM regardless of which of the two states is active. -->
        <transition name="pane-fade">
          <div
            v-show="!focusPreview && viewMode === 'chapters' && selectedChapter"
            class="chapter-page-fullscreen"
          >
            <q-splitter v-model="splitInner" :limits="[30, 85]" class="full-splitter">
              <template #before>
                <div class="pane timeline-pane">
                  <template v-if="selectedChapter">
                    <div class="panel chapter-header">
                      <q-btn
                        dense
                        flat
                        round
                        icon="arrow_back"
                        class="btn-ghost"
                        @click="selectedIndex = null"
                      >
                        <q-tooltip>Retour au graphe</q-tooltip>
                      </q-btn>
                      <q-input dense outlined label="Titre" v-model="selectedChapter.title" />
                    </div>

                    <TimelineEditor :entries="selectedChapter.timeline" />
                  </template>
                </div>
              </template>
              <template #after>
                <div class="pane preview-pane">
                  <div id="phone-slot-chapterpage"></div>
                </div>
              </template>
            </q-splitter>
          </div>
        </transition>

        <!-- Both layouts stay permanently mounted (v-show, not v-if/v-else) —
           only their CSS display toggles with focusPreview. A single
           <PhoneShell/> lives outside both, Teleported into whichever
           layout's slot is currently visible: v-if/v-else here would
           unmount/remount PhoneShell on every "Aperçu seul" toggle (the
           same bug already fixed once for viewMode tab switches — see the
           note below — this is the other place it still existed). -->
        <div v-show="focusPreview" class="pane preview-pane focus-mode">
          <!-- The topbar's "Aperçu seul" toggle does the exact same thing,
               but it's easy to miss once you're staring at a full-screen
               phone — a small "click to exit" hint right where the eye
               already is doesn't require reading the toolbar first. -->
          <button class="preview-exit-hint" @click="focusPreview = false">
            <q-icon name="visibility_off" size="14px" />
            Aperçu — cliquer pour revenir à l'édition
          </button>
          <div id="phone-slot-focus"></div>
        </div>

        <!-- Single splitter tree shared by all view modes — only the
           list/form content inside switches with viewMode. PhoneShell stays
           mounted at the same template position across tab switches so it
           never gets destroyed/recreated (it used to live in separate
           branches, one per viewMode, which made Vue tear down and reboot
           the whole preview on every tab click). -->
        <q-splitter
          v-show="!focusPreview"
          v-model="splitOuter"
          :limits="viewMode === 'chapters' ? [20, 70] : [12, 45]"
          class="full-splitter"
        >
          <template #before>
            <q-tab-panels class="pane chapters-pane" v-model="viewMode" animated>
              <q-tab-panel name="contacts">
                <ContactList v-model="selectedContactIndex"
              /></q-tab-panel>
              <q-tab-panel name="threads">
                <ThreadList v-model="selectedThreadIndex"
              /></q-tab-panel>
              <q-tab-panel name="game">
                <div class="empty-state">Le titre du jeu est un champ unique — pas de liste.</div>
              </q-tab-panel>
              <q-tab-panel name="assets">
                <AssetTree v-model="selectedAssetFolder" />
              </q-tab-panel>
              <q-tab-panel name="i18n"><LocaleList v-model="selectedLocale" /> </q-tab-panel>
              <q-tab-panel name="seed"
                ><SeedBucketList v-model="selectedSeedBucket" />
              </q-tab-panel>
            </q-tab-panels>
          </template>

          <template #after>
            <q-splitter v-model="splitInner" :limits="[30, 85]" class="full-splitter">
              <template #before>
                <q-tab-panels
                  v-model="viewMode"
                  animated
                  transition-prev="fade"
                  transition-next="fade"
                  class="pane timeline-pane"
                >
                  <q-tab-panel name="contacts">
                    <ContactForm v-if="selectedContact" :contact="selectedContact" />
                    <div v-else class="empty-state">Sélectionne un contact à gauche.</div>
                  </q-tab-panel>

                  <q-tab-panel name="threads">
                    <ThreadForm v-if="selectedThread" :thread="selectedThread" />
                    <div v-else class="empty-state">Sélectionne un thread à gauche.</div>
                  </q-tab-panel>

                  <q-tab-panel name="game">
                    <GameForm :game="story.project.gameConfig" />
                  </q-tab-panel>

                  <q-tab-panel name="assets">
                    <AssetsPanel v-model:folder="selectedAssetFolder" />
                  </q-tab-panel>

                  <q-tab-panel name="i18n">
                    <I18nBucketEditor
                      v-if="selectedLocale"
                      :locale="selectedLocale"
                      v-model:bucket="selectedBucket"
                    />
                    <div v-else class="empty-state">Sélectionne une langue à gauche.</div>
                  </q-tab-panel>

                  <q-tab-panel name="seed">
                    <SeedBucketEditor :bucket="selectedSeedBucket" />
                  </q-tab-panel>
                </q-tab-panels>
              </template>

              <template #after>
                <div class="pane preview-pane">
                  <div id="phone-slot-docked"></div>
                </div>
              </template>
            </q-splitter>
          </template>
        </q-splitter>

        <!-- defer (Vue 3.5+) — the target divs live inside the same render
           tree as this Teleport (nested in q-splitter slots above), not
           some pre-existing DOM node outside the component tree, so they
           don't exist yet on the very first synchronous mount pass without
           it. Without `defer`, this intermittently threw "Failed to locate
           Teleport target"/"Invalid Teleport target: null" on first
           navigation into the editor, which then corrupted later renders
           (unrelated-looking "Cannot read properties of null
           (reading 'emitsOptions')" crashes on subsequent clicks were a
           downstream symptom of the same failed mount, not a separate bug).
           Third target (#phone-slot-chapterpage) added for the chapter
           full-page overlay above — its condition and its target div are
           driven by the same reactive state (viewMode/selectedChapter), so
           the target always exists whenever this computed points at it,
           same safety property the original two targets already relied on. -->
        <Teleport
          defer
          :to="
            focusPreview
              ? '#phone-slot-focus'
              : viewMode === 'chapters' && selectedChapter
                ? '#phone-slot-chapterpage'
                : '#phone-slot-docked'
          "
        >
          <!-- Always the raised size cap (600x1200 vs. 480x960 default, see
               PhoneShell.vue's own `large` comment) — not just in focus
               mode. The docked/chapter-page panes are user-resizable
               splitters with plenty of room on anything but a small window,
               and PhoneShell's own min(94vw, cap, 94vh*9/18) sizing already
               shrinks it back down on a narrower one — so there was never a
               real reason to cap it lower there specifically. -->
          <PhoneShell large />
        </Teleport>
      </div>
    </template>
  </q-page>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Dialog, Notify } from 'quasar'
import { useStoryStore } from '@/engine/stores/story'
import { usePhoneStore } from '@/engine/stores/phone'
import {
  serializeChapter,
  serializeContacts,
  serializeThreads,
  serializeGame,
  serializeI18nBucket,
  serializeSeedBucket,
} from '@/project/serializeChapter'
import { validateProject, collectAssetPaths } from '@/project/validateProject'
import { DEFAULT_LOCALE } from '@/engine/i18n/locales'
import PhoneShell from '@/components/phone/PhoneShell.vue'
import ChapterGraph from '@/editor/components/ChapterGraph.vue'
import TimelineEditor from '@/editor/components/TimelineEditor.vue'
import ContactList from '@/editor/components/ContactList.vue'
import ContactForm from '@/editor/components/ContactForm.vue'
import ThreadList from '@/editor/components/ThreadList.vue'
import ThreadForm from '@/editor/components/ThreadForm.vue'
import GameForm from '@/editor/components/GameForm.vue'
import AssetsPanel from '@/editor/components/AssetsPanel.vue'
import AssetTree from '@/editor/components/AssetTree.vue'
import LocaleList from '@/editor/components/LocaleList.vue'
import I18nBucketEditor from '@/editor/components/I18nBucketEditor.vue'
import SeedBucketList from '@/editor/components/SeedBucketList.vue'
import SeedBucketEditor from '@/editor/components/SeedBucketEditor.vue'

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
const phone = usePhoneStore()

// See the template comment above the v-if="!story.project" guard — this
// sends the user back to pick/reload a project instead of leaving them on
// a permanently empty page.
if (!story.project) {
  router.replace({ name: 'open-project' })
}

// Which project-wide resource is being edited — chapters keep their existing
// 3-pane layout, contacts/threads/game reuse the same list+form+preview
// shape (see docs/phase3-plan.md Phase 4 roadmap). Reuses the app's existing
// q-btn-toggle mode-switch convention (see ChoiceEntryForm.vue's SMS/DM
// toggle) rather than introducing routing/tabs, which have no precedent here.
const viewMode = ref('chapters')

// `null` = nothing selected — the Chapitres tab's default state (full-bleed
// graph, see the `graph-fullscreen` overlay above) unlike every other tab's
// index ref, which always defaults to row 0.
const selectedIndex = ref(null)
const selectedChapter = computed(() =>
  selectedIndex.value == null ? null : story.project?.chapters?.[selectedIndex.value] || null,
)
// Whether the chapter graph (not a chapter's own 2-pane form) is the thing
// actually on screen — passed to ChapterGraph.vue as `active` too, so it
// can re-fit the view on every transition into this state, not just once
// on first mount (see its own comment).
const graphActive = computed(
  () => !focusPreview.value && viewMode.value === 'chapters' && !selectedChapter.value,
)
const selectedContactIndex = ref(0)
const selectedContact = computed(
  () => story.project?.contacts?.[selectedContactIndex.value] || null,
)
const selectedThreadIndex = ref(0)
const selectedThread = computed(() => story.project?.threads?.[selectedThreadIndex.value] || null)
// Selected folder path within assets/ ('' = root) — same lift-state-up
// pattern as the selection refs above, shared between AssetTree (left pane)
// and AssetsPanel (middle pane, filters its grid to this folder).
const selectedAssetFolder = ref('')
const selectedLocale = ref('')
const selectedBucket = ref('common')
const selectedSeedBucket = ref('messages')

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
    case 'assets':
      // Assets tab has no dirty/save flow — imports/deletes are immediate
      // IPC side effects (see AssetsPanel.vue), not a buffered edit.
      return null
    case 'i18n':
      return story.project?.i18n?.[selectedLocale.value]?.[selectedBucket.value] ?? null
    case 'seed':
      // Whole bucket watched (dict or array), same as contacts/threads —
      // NOT narrowed to whichever conversation is open within
      // messages/dms, matching the established "which sub-item is
      // selected doesn't rearm" rule (that state is local to
      // SeedBucketEditor.vue, not lifted here).
      return story.project?.seed?.[selectedSeedBucket.value] ?? null
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
// Re-arm on viewMode/selectedIndex/selectedLocale/selectedBucket change, NOT
// on selectedContactIndex/selectedThreadIndex — those pick which item the
// form *displays* within the same already-watched array, so re-arming on
// them would wrongly reset `dirty` just from selecting a different row.
// selectedLocale/selectedBucket are different: like selectedIndex, they
// change WHICH object is watched (a different dict entirely per
// locale+bucket), not just which row is shown within the same object.
// selectedSeedBucket is the same case (messages vs. posts vs. ... are
// different objects) — but which conversation is open WITHIN
// messages/dms is local state inside SeedBucketEditor.vue, never lifted
// here, so there's no equivalent of selectedContactIndex to exclude.
watch([viewMode, selectedIndex, selectedLocale, selectedBucket, selectedSeedBucket], () => {
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
    } else if (viewMode.value === 'i18n') {
      if (!selectedLocale.value) return
      await window.storieAPI.saveI18nBucket({
        rootPath: story.project.rootPath,
        locale: selectedLocale.value,
        bucket: selectedBucket.value,
        source: serializeI18nBucket(
          story.project.i18n[selectedLocale.value][selectedBucket.value] || {},
        ),
      })
    } else if (viewMode.value === 'seed') {
      await window.storieAPI.saveSeedBucket({
        rootPath: story.project.rootPath,
        bucket: selectedSeedBucket.value,
        source: serializeSeedBucket(story.project.seed[selectedSeedBucket.value]),
      })
    }
    dirty.value = false
    Notify.create({ type: 'positive', message: 'Enregistré.' })
  } catch (err) {
    Notify.create({ type: 'negative', message: err.message || String(err) })
  }
}

function restartPreview() {
  // loadProject() alone only refreshes the story data (picks up in-memory
  // edits) — it never touches phone.rebootCount, which is the ONLY thing
  // PhoneShell watches to actually replay the boot animation (see
  // phone.js's requestReboot(), otherwise only called from the Settings
  // app's "reset phone"). Without this, the button silently did nothing
  // visible: same screen, same lock state, just fresher data underneath.
  story.loadProject(story.project)
  phone.requestReboot()
}

function previewFrom(chapterId) {
  // Always fired from a graph node (see ChapterGraph.vue/ChapterGraphNode.vue
  // — no chapter selected at that moment), so the Teleport target below
  // would otherwise resolve to '#phone-slot-docked', which sits in the
  // splitter that the full-bleed graph overlay covers (see graphActive) —
  // the phone would run (sounds, flags...) completely out of sight.
  // Focus mode is always visible and takes the overlay down with it
  // (graphActive depends on !focusPreview), so this is the one Teleport
  // target guaranteed to actually show something right after this call.
  focusPreview.value = true

  // A brand-new save has no playerName yet, so PhoneShell would show the
  // first-boot Setup Wizard instead of the phone — story.startChapter()
  // below doesn't wait for that, it starts advancing (and playing sounds)
  // immediately regardless of what's on screen, which is exactly the "I
  // hear it but see nothing, stuck at the wizard" bug. Auto-fill it with
  // throwaway preview defaults instead of forcing a manual click-through
  // every time: OS locale if it's one of the project's, else the engine
  // default; a fixed placeholder name; the wizard's own first color swatch
  // (SetupWizard.vue's `colorChoices[0]`). phone.requestReboot() replays
  // the boot animation, which is what actually re-evaluates playerName and
  // routes to 'ready' instead of 'setup' (see PhoneShell.vue's onBootDone).
  if (!story.playerName) {
    const osLocale = story.availableLocales.some((l) => l.code === navigator.language)
      ? navigator.language
      : DEFAULT_LOCALE
    story.setLocale(osLocale)
    story.setPlayerName('DemoName')
    story.setPlayerColor('#9c27b0')
    phone.requestReboot()
  }

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
    errors.push(
      `Fichier introuvable dans assets/ : "${missingPath}" (référencé par ${ref.labels.join(', ')})`,
    )
  }
  return { errors, warnings }
}

function showValidationDialog(errors, warnings) {
  if (!errors.length && !warnings.length) {
    Dialog.create({
      title: 'Validation du projet',
      message: 'Aucun problème détecté.',
      ok: true,
      color: 'primary',
    })
    return
  }
  const parts = []
  if (errors.length) parts.push(`ERREURS (${errors.length}) :\n${errors.join('\n')}`)
  if (warnings.length) parts.push(`AVERTISSEMENTS (${warnings.length}) :\n${warnings.join('\n')}`)
  Dialog.create({
    title: 'Validation du projet',
    message: parts.join('\n\n'),
    ok: true,
    color: 'primary',
  })
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
      Notify.create({
        type: 'negative',
        message: "Build annulé — corrige les erreurs de validation d'abord.",
      })
      return
    }
    if (warnings.length) {
      const proceed = await new Promise((resolve) => {
        Dialog.create({
          title: 'Avertissements de validation',
          message: `${warnings.length} avertissement(s) détecté(s) :\n\n${warnings.join('\n')}\n\nLancer le build quand même ?`,
          cancel: true,
          persistent: true,
          color: 'primary',
        })
          .onOk(() => resolve(true))
          .onCancel(() => resolve(false))
      })
      if (!proceed) return
    }

    // A build IS the release cut — the version bump happens here, not as a
    // separate manual step, so it can never be forgotten before an export.
    // 'none' is still an explicit choice (a rebuild — packaging fix, no
    // content change) rather than the bump silently being skipped.
    const currentVersion = story.project.manifest?.version || '1.0.0'
    const bumpType = await new Promise((resolve) => {
      Dialog.create({
        title: 'Version du build',
        message: `Version actuelle : ${currentVersion}`,
        options: {
          type: 'radio',
          model: 'patch',
          items: [
            { label: 'Rebuild — pas de montée de version', value: 'none' },
            { label: 'Version normale (patch)', value: 'patch' },
            { label: 'Mineure', value: 'minor' },
            { label: 'Majeure', value: 'major' },
          ],
        },
        cancel: true,
        persistent: true,
        color: 'primary',
        ok: 'Build',
      })
        .onOk((v) => resolve(v))
        .onCancel(() => resolve(null))
    })
    if (!bumpType) return

    const result = await window.storieAPI.buildGame({ rootPath: story.project.rootPath, bumpType })
    if (result) {
      story.project.manifest = result.manifest
      Notify.create({
        type: 'positive',
        message: `Jeu exporté en v${result.manifest.version} dans ${result.outDir}`,
        timeout: 6000,
      })
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

.editor-empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  color: var(--color-text-muted);
  font-size: var(--text-sm);
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

.view-tabs {
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
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
}

.graph-fullscreen,
.chapter-page-fullscreen {
  position: absolute;
  inset: 0;
  z-index: 5;
  background: var(--color-bg);
}

.pane-fade-enter-active,
.pane-fade-leave-active {
  transition: opacity var(--transition-base);
}

.pane-fade-enter-from,
.pane-fade-leave-to {
  opacity: 0;
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
  position: relative;
  width: 100%;
  padding: var(--space-8);
}

.preview-exit-hint {
  position: absolute;
  top: var(--space-3);
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  align-items: center;
  gap: var(--space-1);
  border: none;
  border-radius: var(--radius-md);
  padding: var(--space-1) var(--space-3);
  background: var(--color-surface);
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  cursor: pointer;
  transition: color var(--transition-fast);
}

.preview-exit-hint:hover {
  color: var(--color-text);
}
</style>
