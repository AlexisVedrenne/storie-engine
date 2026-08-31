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
      <p>{{ t('editorPage.noProject') }}</p>
    </div>

    <template v-else>
      <div class="topbar">
        <span class="project-name">{{
          story.project?.manifest?.name || t('editorPage.untitledProject')
        }}</span>
        <span v-if="dirty" class="dirty-dot" :title="t('editorPage.unsavedTooltip')">●</span>

        <q-tabs
          v-if="!topbarCompact"
          dense
          no-caps
          v-model="viewMode"
          class="view-tabs q-pa-sm"
          active-color="primary"
          indicator-color="primary"
          align="left"
        >
          <q-tab name="chapters" icon="auto_stories">
            <q-tooltip>{{ t('editorPage.tabChapters') }}</q-tooltip>
          </q-tab>
          <q-tab name="reactions" icon="sensors">
            <q-tooltip>{{ t('editorPage.tabReactions') }}</q-tooltip>
          </q-tab>
          <q-tab name="interactions" icon="touch_app">
            <q-tooltip>{{ t('editorPage.tabInteractions') }}</q-tooltip>
          </q-tab>
          <q-tab name="apps" icon="widgets">
            <q-tooltip>{{ t('editorPage.tabApps') }}</q-tooltip>
          </q-tab>
          <q-tab name="data" icon="storage">
            <q-tooltip>{{ t('editorPage.tabData') }}</q-tooltip>
          </q-tab>
          <q-tab name="game" icon="sports_esports">
            <q-tooltip>{{ t('editorPage.tabGame') }}</q-tooltip>
          </q-tab>
          <q-tab name="assets" icon="folder">
            <q-tooltip>{{ t('editorPage.tabAssets') }}</q-tooltip>
          </q-tab>
          <q-tab name="i18n" icon="translate">
            <q-tooltip>{{ t('editorPage.tabI18n') }}</q-tooltip>
          </q-tab>
          <q-tab name="seed" icon="inventory_2">
            <q-tooltip>{{ t('editorPage.tabSeed') }}</q-tooltip>
          </q-tab>
        </q-tabs>

        <!-- En dessous de TOPBAR_COLLAPSE_WIDTH : icônes serrées + flèches
             de scroll intégrées de q-tabs illisibles à 10 onglets (retour
             utilisateur) — remplacées par un bouton hamburger ouvrant un
             drawer de navigation en icône+libellé complet. -->
        <q-btn v-else dense flat round icon="menu" class="btn-ghost" @click="navDrawerOpen = true">
          <q-tooltip>{{ t('editorPage.navMenuTooltip') }}</q-tooltip>
        </q-btn>

        <q-dialog v-model="navDrawerOpen" position="left">
          <q-card class="topbar-drawer">
            <div class="topbar-drawer-header">
              <span class="text-subtitle1">{{ t('editorPage.navMenuTooltip') }}</span>
              <div class="spacer" />
              <q-btn dense flat round icon="close" v-close-popup />
            </div>
            <q-separator />
            <q-list class="topbar-drawer-list">
              <q-item
                v-for="tab in NAV_TABS"
                :key="tab.name"
                clickable
                v-close-popup
                :active="viewMode === tab.name"
                active-class="nav-item-active"
                @click="viewMode = tab.name"
              >
                <q-item-section avatar><q-icon :name="tab.icon" /></q-item-section>
                <q-item-section>{{ t(tab.labelKey) }}</q-item-section>
              </q-item>
            </q-list>
          </q-card>
        </q-dialog>

        <div class="spacer" />

        <!-- En dessous de TOPBAR_COLLAPSE_WIDTH, les actions secondaires se
             replient dans un seul bouton "more_vert" (voir plus bas) — le
             markup ci-dessous reste identique à avant, juste conditionné. -->
        <template v-if="!topbarCompact">
          <q-btn
            dense
            flat
            round
            icon="search"
            class="btn-ghost"
            @click="globalSearchDialogRef?.open()"
          >
            <q-tooltip>{{ t('editorPage.globalSearchTooltip') }}</q-tooltip>
          </q-btn>
          <q-btn
            dense
            flat
            round
            icon="help_outline"
            class="btn-ghost"
            @click="conceptsDialogRef?.open()"
          >
            <q-tooltip>{{ t('editorPage.conceptsTooltip') }}</q-tooltip>
          </q-btn>
          <q-btn
            dense
            flat
            round
            :icon="focusPreview ? 'visibility_off' : 'smartphone'"
            class="btn-ghost"
            @click="focusPreview = !focusPreview"
          >
            <q-tooltip>{{
              focusPreview ? t('editorPage.showEditing') : t('editorPage.previewOnly')
            }}</q-tooltip>
          </q-btn>
          <q-btn dense flat no-caps round icon="refresh" class="btn-ghost" @click="restartPreview">
            <q-tooltip>{{ t('editorPage.restartPreviewTooltip') }}</q-tooltip>
          </q-btn>
          <CloudSyncButton />

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
            <q-tooltip>{{ t('editorPage.validateTooltip') }}</q-tooltip>
          </q-btn>
          <q-btn
            dense
            flat
            round
            icon="rocket_launch"
            color="primary"
            :loading="openingBuildStepper"
            :disable="openingBuildStepper"
            @click="openBuildStepper"
          >
            <q-tooltip>{{ t('editorPage.buildTooltip') }}</q-tooltip>
          </q-btn>
          <q-btn
            dense
            flat
            round
            icon="smartphone"
            color="primary"
            @click="webPreviewDialogRef?.open()"
          >
            <q-tooltip>{{ t('editorPage.webPreviewTooltip') }}</q-tooltip>
          </q-btn>
        </template>

        <q-btn
          v-else
          dense
          flat
          round
          icon="more_vert"
          class="btn-ghost"
          @click="topbarDrawerOpen = true"
        >
          <q-tooltip>{{ t('editorPage.moreActionsTooltip') }}</q-tooltip>
        </q-btn>

        <!-- q-dialog position="right", pas un vrai q-drawer — celui-ci
             exigerait de vivre dans MainLayout.vue (frère de
             q-page-container à l'intérieur du q-layout partagé par TOUTES
             les pages), alors que tout l'état affiché ici est propre à
             cette page. position="right" donne le même glissement latéral
             plein écran sans toucher au layout partagé. -->
        <q-dialog v-model="topbarDrawerOpen" position="right">
          <q-card class="topbar-drawer">
            <div class="topbar-drawer-header">
              <span class="text-subtitle1">{{ t('editorPage.moreActionsTooltip') }}</span>
              <div class="spacer" />
              <q-btn dense flat round icon="close" v-close-popup />
            </div>
            <q-separator />
            <q-list dense class="topbar-drawer-list">
              <q-item clickable v-close-popup @click="globalSearchDialogRef?.open()">
                <q-item-section avatar><q-icon name="search" /></q-item-section>
                <q-item-section>{{ t('editorPage.globalSearchTooltip') }}</q-item-section>
              </q-item>

              <q-item clickable v-close-popup @click="conceptsDialogRef?.open()">
                <q-item-section avatar><q-icon name="help_outline" /></q-item-section>
                <q-item-section>{{ t('editorPage.conceptsTooltip') }}</q-item-section>
              </q-item>

              <q-item clickable @click="focusPreview = !focusPreview">
                <q-item-section avatar>
                  <q-icon :name="focusPreview ? 'visibility_off' : 'smartphone'" />
                </q-item-section>
                <q-item-section>{{
                  focusPreview ? t('editorPage.showEditing') : t('editorPage.previewOnly')
                }}</q-item-section>
              </q-item>

              <q-item clickable v-close-popup @click="restartPreview">
                <q-item-section avatar><q-icon name="refresh" /></q-item-section>
                <q-item-section>{{ t('editorPage.restartPreviewTooltip') }}</q-item-section>
              </q-item>

              <q-item>
                <q-item-section>
                  <CloudSyncButton />
                </q-item-section>
              </q-item>

              <q-separator />

              <q-item clickable @click="runValidation">
                <q-item-section avatar>
                  <q-spinner v-if="validating" size="20px" />
                  <q-icon v-else name="fact_check" />
                </q-item-section>
                <q-item-section>{{ t('editorPage.validateLabel') }}</q-item-section>
              </q-item>

              <q-item clickable :disable="openingBuildStepper" @click="openBuildStepper">
                <q-item-section avatar>
                  <q-spinner v-if="openingBuildStepper" size="20px" color="primary" />
                  <q-icon v-else name="rocket_launch" color="primary" />
                </q-item-section>
                <q-item-section>{{ t('editorPage.buildLabel') }}</q-item-section>
              </q-item>

              <q-item clickable v-close-popup @click="webPreviewDialogRef?.open()">
                <q-item-section avatar><q-icon name="smartphone" color="primary" /></q-item-section>
                <q-item-section>{{ t('editorPage.webPreviewLabel') }}</q-item-section>
              </q-item>
            </q-list>
          </q-card>
        </q-dialog>

        <!-- Undo/redo — même règle que Enregistrer juste en dessous :
             toujours visible, jamais repliée dans le menu compact. -->
        <q-btn dense flat round icon="undo" :disable="!canUndo" @click="undo">
          <q-tooltip>{{ t('editorPage.undoTooltip') }}</q-tooltip>
        </q-btn>
        <q-btn dense flat round icon="redo" :disable="!canRedo" @click="redo">
          <q-tooltip>{{ t('editorPage.redoTooltip') }}</q-tooltip>
        </q-btn>

        <!-- Toujours visible, dans les deux modes, même emplacement à
             l'extrémité droite — action principale, ne doit jamais se
             retrouver repliée dans le menu. -->
        <q-btn
          dense
          unelevated
          no-caps
          icon="save"
          :label="t('editorPage.saveBtn')"
          color="primary"
          :disable="!dirty"
          @click="save"
        />

        <!-- Réglages (langue éditeur/sauvegarde locale+cloud/changer de
             projet) — regroupés dans un seul dialogue plutôt que dupliqués
             entre la barre large et le tiroir compact (voir
             EditorSettingsDialog.vue). Tout à droite, après Enregistrer —
             dernier item de la barre, un seul bouton, pas de variante
             compacte nécessaire. -->
        <q-btn
          dense
          flat
          round
          icon="settings"
          class="btn-ghost"
          @click="editorSettingsDialogRef?.open()"
        >
          <q-tooltip>{{ t('editorSettings.title') }}</q-tooltip>
        </q-btn>
        <EditorSettingsDialog
          ref="editorSettingsDialogRef"
          :autosave="autosave"
          :building="openingBuildStepper"
          @update:autosave="autosave = $event"
          @switch-project="closeProject"
        />
        <GlobalSearchDialog
          ref="globalSearchDialogRef"
          @navigate="(descriptor, hint) => navigateToResource(descriptor, hint)"
          @open-flags="flagsDialogOpen = true"
        />
        <ConceptsDialog ref="conceptsDialogRef" />
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
                        <q-tooltip>{{ t('editorPage.backToGraphTooltip') }}</q-tooltip>
                      </q-btn>
                      <q-input
                        dense
                        outlined
                        ref="chapterTitleInputRef"
                        :label="t('editorPage.chapterTitleLabel')"
                        v-model="selectedChapter.title"
                        @blur="renameChapterIfNeeded"
                      >
                        <template #append>
                          <EmojiPickerBtn
                            @pick="
                              (e) =>
                                (selectedChapter.title = insertEmojiAtCaret(
                                  chapterTitleInputRef,
                                  selectedChapter.title,
                                  e,
                                ))
                            "
                          />
                        </template>
                      </q-input>
                      <q-btn
                        dense
                        flat
                        round
                        icon="play_arrow"
                        color="primary"
                        class="btn-ghost"
                        @click="previewFrom(selectedChapter.id)"
                      >
                        <q-tooltip>{{ t('editorPage.previewFromChapterTooltip') }}</q-tooltip>
                      </q-btn>
                      <q-btn
                        dense
                        flat
                        round
                        icon="flag"
                        class="btn-ghost"
                        @click="flagsDialogOpen = true"
                      >
                        <q-tooltip>{{ t('editorPage.flagsTooltip') }}</q-tooltip>
                      </q-btn>
                    </div>

                    <ChapterEndScreenForm v-if="isEndingChapter" :chapter="selectedChapter" />

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
            {{ t('editorPage.previewExitHint') }}
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
              <q-tab-panel name="reactions" class="data-panel">
                <q-tabs
                  dense
                  no-caps
                  v-model="reactionsSubTab"
                  class="data-subtabs"
                  active-color="primary"
                  indicator-color="primary"
                  align="left"
                >
                  <q-tab name="events" :label="t('editorPage.reactionsSubEvents')" />
                  <q-tab name="automations" :label="t('editorPage.reactionsSubAutomations')" />
                </q-tabs>
                <q-separator />
                <div class="data-subpanel">
                  <EventList v-if="reactionsSubTab === 'events'" v-model="selectedEventIndex" />
                  <AutomationList
                    v-else-if="reactionsSubTab === 'automations'"
                    v-model="selectedAutomationIndex"
                  />
                </div>
              </q-tab-panel>
              <q-tab-panel name="interactions">
                <InteractionDefList v-model="selectedInteractionIndex" />
              </q-tab-panel>
              <q-tab-panel name="apps">
                <CustomAppList v-model="selectedCustomAppIndex" />
              </q-tab-panel>
              <q-tab-panel name="data" class="data-panel">
                <q-tabs
                  dense
                  no-caps
                  v-model="dataSubTab"
                  class="data-subtabs"
                  active-color="primary"
                  indicator-color="primary"
                  align="left"
                >
                  <q-tab name="flags" :label="t('editorPage.dataSubFlags')" />
                  <q-tab name="schemas" :label="t('editorPage.dataSubSchemas')" />
                  <q-tab name="contacts" :label="t('editorPage.dataSubContacts')" />
                  <q-tab name="threads" :label="t('editorPage.dataSubThreads')" />
                </q-tabs>
                <q-separator />
                <div class="data-subpanel">
                  <EntitySchemaList v-if="dataSubTab === 'schemas'" v-model="selectedSchemaIndex" />
                  <ContactList
                    v-else-if="dataSubTab === 'contacts'"
                    v-model="selectedContactIndex"
                  />
                  <ThreadList v-else-if="dataSubTab === 'threads'" v-model="selectedThreadIndex" />
                  <div v-else class="empty-state">
                    <q-icon name="flag" size="40px" />
                    {{ t('editorPage.flagsSubtabHint') }}
                  </div>
                </div>
              </q-tab-panel>
              <q-tab-panel name="game">
                <div class="empty-state">
                  <q-icon name="sports_esports" size="40px" />
                  {{ t('editorPage.gameEmptyState') }}
                </div>
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
                  <q-tab-panel name="reactions">
                    <template v-if="reactionsSubTab === 'events'">
                      <EventForm v-if="selectedEvent" :event="selectedEvent" />
                      <div v-else class="empty-state">
                        <q-icon name="sensors" size="40px" />
                        {{ t('editorPage.eventsEmptyState') }}
                      </div>
                    </template>
                    <template v-else-if="reactionsSubTab === 'automations'">
                      <AutomationForm v-if="selectedAutomationDef" :def="selectedAutomationDef" />
                      <div v-else class="empty-state">
                        <q-icon name="bolt" size="40px" />
                        {{ t('editorPage.automationsEmptyState') }}
                      </div>
                    </template>
                  </q-tab-panel>

                  <q-tab-panel name="interactions">
                    <InteractionDefForm
                      v-if="selectedInteractionDef"
                      :def="selectedInteractionDef"
                    />
                    <div v-else class="empty-state">
                      <q-icon name="touch_app" size="40px" />
                      {{ t('editorPage.interactionsEmptyState') }}
                    </div>
                  </q-tab-panel>

                  <q-tab-panel name="apps">
                    <CustomAppEditor
                      v-if="selectedCustomApp"
                      :def="selectedCustomApp"
                      :test-mode-on="testModeOn"
                      @toggle-test-mode="toggleTestMode"
                    />
                    <div v-else class="empty-state">
                      <q-icon name="widgets" size="40px" />
                      {{ t('editorPage.appsEmptyState') }}
                    </div>
                  </q-tab-panel>

                  <q-tab-panel name="data">
                    <FlagsPanel v-if="dataSubTab === 'flags'" :game="story.project.gameConfig" />
                    <template v-else-if="dataSubTab === 'schemas'">
                      <EntitySchemaForm v-if="selectedSchemaDef" :def="selectedSchemaDef" />
                      <div v-else class="empty-state">
                        <q-icon name="dataset" size="40px" />
                        {{ t('editorPage.schemasEmptyState') }}
                      </div>
                    </template>
                    <template v-else-if="dataSubTab === 'contacts'">
                      <ContactForm v-if="selectedContact" :contact="selectedContact" />
                      <div v-else class="empty-state">
                        <q-icon name="contacts" size="40px" />
                        {{ t('editorPage.contactsEmptyState') }}
                      </div>
                    </template>
                    <template v-else-if="dataSubTab === 'threads'">
                      <ThreadForm v-if="selectedThread" :thread="selectedThread" />
                      <div v-else class="empty-state">
                        <q-icon name="groups" size="40px" />
                        {{ t('editorPage.threadsEmptyState') }}
                      </div>
                    </template>
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
                    <div v-else class="empty-state">
                      <q-icon name="translate" size="40px" />
                      {{ t('editorPage.i18nEmptyState') }}
                    </div>
                  </q-tab-panel>

                  <q-tab-panel name="seed">
                    <SeedBucketEditor :bucket="selectedSeedBucket" />
                  </q-tab-panel>
                </q-tab-panels>
              </template>

              <template #after>
                <div class="pane preview-pane">
                  <div id="phone-slot-docked"></div>
                  <VariableInspectorPanel v-if="viewMode === 'apps'" />
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

      <!-- Opened from the chapter-header "flag" button (not a tab — flags
           are project-wide, but the author wants them a click away while
           actually writing a chapter's conditions/effects, not a context
           switch to a whole separate view). Saves gameConfig straight to
           disk on close: this dialog can be open while viewMode is still
           'chapters', so the normal dirty/save watch (armed on
           selectedChapter, see activeResource) never sees gameConfig
           change on its own. -->
      <q-dialog v-model="flagsDialogOpen" @hide="onFlagsDialogHide">
        <q-card class="flags-dialog-card">
          <q-card-section>
            <div class="text-subtitle1">{{ t('editorPage.flagsDialogTitle') }}</div>
          </q-card-section>
          <q-card-section class="flags-dialog-body scroll">
            <FlagsPanel :game="story.project.gameConfig" />
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat :label="t('common.close')" color="primary" v-close-popup />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </template>

    <WebPreviewDialog ref="webPreviewDialogRef" :root-path="story.project.rootPath" />
    <BuildStepper ref="buildStepperRef" />
    <!-- position: fixed, mounted once at the page root — stays reachable
         above the phone regardless of which of its 3 Teleport slots is
         currently active (docked/chapter-page/focus-preview), without
         needing a topbar button or touching any of those Teleport targets
         (see the "Invalid Teleport target" warnings elsewhere in this
         file). Self-contained: owns its own toggle button. -->
    <DebugPanel v-if="story.started" />
  </q-page>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Dialog, Notify, useQuasar } from 'quasar'
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
import { generateChapterId } from '@/editor/utils/chapterId'
import { DEFAULT_LOCALE } from '@/engine/i18n/locales'
import PhoneShell from '@/components/phone/PhoneShell.vue'
import ChapterGraph from '@/editor/components/ChapterGraph.vue'
import TimelineEditor from '@/editor/components/TimelineEditor.vue'
import ChapterEndScreenForm from '@/editor/components/ChapterEndScreenForm.vue'
import ContactList from '@/editor/components/ContactList.vue'
import ContactForm from '@/editor/components/ContactForm.vue'
import ThreadList from '@/editor/components/ThreadList.vue'
import ThreadForm from '@/editor/components/ThreadForm.vue'
import GameForm from '@/editor/components/GameForm.vue'
import FlagsPanel from '@/editor/components/FlagsPanel.vue'
import EventList from '@/editor/components/EventList.vue'
import EventForm from '@/editor/components/EventForm.vue'
import InteractionDefList from '@/editor/components/InteractionDefList.vue'
import InteractionDefForm from '@/editor/components/InteractionDefForm.vue'
import CustomAppList from '@/editor/components/CustomAppList.vue'
import CustomAppEditor from '@/editor/components/CustomAppEditor.vue'
import VariableInspectorPanel from '@/editor/components/VariableInspectorPanel.vue'
import { generateTestData } from '@/editor/utils/generateTestData'
import EntitySchemaList from '@/editor/components/EntitySchemaList.vue'
import EntitySchemaForm from '@/editor/components/EntitySchemaForm.vue'
import AutomationList from '@/editor/components/AutomationList.vue'
import AutomationForm from '@/editor/components/AutomationForm.vue'
import AssetsPanel from '@/editor/components/AssetsPanel.vue'
import AssetTree from '@/editor/components/AssetTree.vue'
import LocaleList from '@/editor/components/LocaleList.vue'
import I18nBucketEditor from '@/editor/components/I18nBucketEditor.vue'
import SeedBucketList from '@/editor/components/SeedBucketList.vue'
import SeedBucketEditor from '@/editor/components/SeedBucketEditor.vue'
import EmojiPickerBtn from '@/components/shared/EmojiPickerBtn.vue'
import { insertEmojiAtCaret } from '@/components/shared/emojiInsert'
import EditorSettingsDialog from '@/editor/components/EditorSettingsDialog.vue'
import GlobalSearchDialog from '@/editor/components/GlobalSearchDialog.vue'
import ConceptsDialog from '@/editor/components/ConceptsDialog.vue'
import DebugPanel from '@/editor/components/DebugPanel.vue'
import WebPreviewDialog from '@/editor/components/WebPreviewDialog.vue'
import BuildStepper from '@/editor/components/BuildStepper.vue'
import CloudSyncButton from '@/editor/components/CloudSyncButton.vue'
import { useUndoHistory, descriptorsEqual } from '@/editor/composables/useUndoHistory'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()

const AUTOSAVE_KEY = 'stories-engine-autosave'
const SPLIT_OUTER_KEY = 'stories-engine-split-outer'
const SPLIT_INNER_KEY = 'stories-engine-split-inner'
const AUTOSAVE_DEBOUNCE_MS = 1200
// Coalescing window for undo history commits — see useUndoHistory.js's own
// comment for why this is deliberately separate from AUTOSAVE_DEBOUNCE_MS.
const UNDO_COMMIT_DEBOUNCE_MS = 600
// Shared with OpenProjectPage.vue (set on open/create) — "Changer de projet"
// clears it so leaving a project is a deliberate exit, not something the
// next launch silently undoes by reopening the same project.
const LAST_PROJECT_KEY = 'stories-engine-last-project'

const router = useRouter()
const story = useStoryStore()
const phone = usePhoneStore()
const chapterTitleInputRef = ref(null)

// Repli des actions secondaires de la toolbar en dessous de cette largeur
// (voir docs/ topbar plan) — calé sur le contenu réel de la toolbar (~15
// éléments : nom de projet + 10 onglets + ~10 boutons/toggles), pas sur
// les breakpoints génériques Quasar (sm=1024 ne colle pas, la fenêtre par
// défaut de l'app fait déjà 1000×600). Constante à réajuster après un
// premier essai visuel si besoin.
const $q = useQuasar()
const TOPBAR_COLLAPSE_WIDTH = 1300
const topbarCompact = computed(() => $q.screen.width < TOPBAR_COLLAPSE_WIDTH)
const topbarDrawerOpen = ref(false)
const navDrawerOpen = ref(false)

// Alimente le drawer de navigation compact — mêmes 9 destinations que la
// q-tabs pleine largeur, mais avec un libellé COURT (tabReactions/
// tabInteractions/tabApps sont des phrases-tooltip complètes, trop longues
// pour une ligne de liste — voir editorPage.navLabel* ci-dessous), pas la
// description longue utilisée comme tooltip sur les onglets en icône.
const NAV_TABS = [
  { name: 'chapters', icon: 'auto_stories', labelKey: 'editorPage.tabChapters' },
  { name: 'reactions', icon: 'sensors', labelKey: 'editorPage.navLabelReactions' },
  { name: 'interactions', icon: 'touch_app', labelKey: 'editorPage.navLabelInteractions' },
  { name: 'apps', icon: 'widgets', labelKey: 'editorPage.navLabelApps' },
  { name: 'data', icon: 'storage', labelKey: 'editorPage.navLabelData' },
  { name: 'game', icon: 'sports_esports', labelKey: 'editorPage.tabGame' },
  { name: 'assets', icon: 'folder', labelKey: 'editorPage.tabAssets' },
  { name: 'i18n', icon: 'translate', labelKey: 'editorPage.tabI18n' },
  { name: 'seed', icon: 'inventory_2', labelKey: 'editorPage.tabSeed' },
]

const flagsDialogOpen = ref(false)
const webPreviewDialogRef = ref(null)
const buildStepperRef = ref(null)
const editorSettingsDialogRef = ref(null)
const globalSearchDialogRef = ref(null)
const conceptsDialogRef = ref(null)
// Explicit persist — this dialog opens on top of the 'chapters' tab, whose
// dirty/save watch is armed on `selectedChapter`, not on `gameConfig` (see
// activeResource below), so editing a flag's label here needs its own
// write, same IPC call as the 'game'/'reactions' tabs' own save() branch.
async function onFlagsDialogHide() {
  await window.storieAPI.saveGame({
    rootPath: story.project.rootPath,
    source: serializeGame(story.project.gameConfig),
  })
}

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
// Same "no outgoing edges" condition ChapterGraph.vue already uses for the
// "FIN" badge — gates ChapterEndScreenForm.vue's visibility so it only ever
// shows up on a chapter that's actually an ending, never dead UI on an
// ordinary one.
const isEndingChapter = computed(() => !selectedChapter.value?.next?.length)
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
const selectedEventIndex = ref(0)
const selectedEvent = computed(
  () => story.project?.gameConfig?.events?.[selectedEventIndex.value] || null,
)
const selectedInteractionIndex = ref(0)
const selectedInteractionDef = computed(
  () => story.project?.gameConfig?.interactions?.[selectedInteractionIndex.value] || null,
)
const selectedCustomAppIndex = ref(0)
const selectedCustomApp = computed(
  () => story.project?.customApps?.[selectedCustomAppIndex.value] || null,
)
const selectedSchemaIndex = ref(0)
const selectedSchemaDef = computed(
  () => story.project?.gameConfig?.entitySchemas?.[selectedSchemaIndex.value] || null,
)
const selectedAutomationIndex = ref(0)
const selectedAutomationDef = computed(
  () => story.project?.gameConfig?.automations?.[selectedAutomationIndex.value] || null,
)
// The 'Données' tab groups 4 catalogs that used to each have their own
// top-level tab (Flags was a dialog, not even a tab) — one topbar slot
// instead of four, with this picking which of the four shows. 'flags' has
// no per-item selection (FlagsPanel lists everything at once), so it's the
// only one with nothing analogous to selectedContactIndex.
const dataSubTab = ref('flags')
// Same merge, one level up: Events and Automations are the same shape
// (trigger/condition -> effects/then) and used to each have their own slot
// (Events was standalone, Automations briefly lived under Données) — one
// 'Réactions' tab instead, picking which of the two shows. Interactions
// stays its OWN top-level tab: it's a gesture-sequence builder referenced by
// id from the timeline, not a condition-driven reaction like these two.
const reactionsSubTab = ref('events')
// Selected folder path within assets/ ('' = root) — same lift-state-up
// pattern as the selection refs above, shared between AssetTree (left pane)
// and AssetsPanel (middle pane, filters its grid to this folder).
const selectedAssetFolder = ref('')
const selectedLocale = ref('')
const selectedBucket = ref('common')
const selectedSeedBucket = ref('messages')

// Identity of whatever's currently being edited — used both to know what
// the dirty flag/autosave watch below is watching (via resolveResource) and
// to give the global undo/redo history (useUndoHistory.js) something
// stable to tag each entry with, independent of what's on screen at the
// moment an entry is undone. 'game'/'reactions'/'interactions' deliberately
// collapse to the SAME descriptor — they all live in game.js, one file,
// one resource, not three (see resolveResource's own comment).
function currentDescriptor() {
  switch (viewMode.value) {
    case 'chapters':
      return selectedChapter.value ? { kind: 'chapter', id: selectedChapter.value.id } : null
    case 'data':
      if (dataSubTab.value === 'contacts') return { kind: 'contacts' }
      if (dataSubTab.value === 'threads') return { kind: 'threads' }
      // 'flags'/'schemas' both live in gameConfig, same file as
      // reactions/interactions below.
      return { kind: 'game' }
    case 'game':
    case 'reactions':
    case 'interactions':
      return { kind: 'game' }
    case 'apps':
      return selectedCustomApp.value ? { kind: 'app', id: selectedCustomApp.value.id } : null
    case 'assets':
      // Assets tab has no dirty/save flow — imports/deletes are immediate
      // IPC side effects (see AssetsPanel.vue), not a buffered edit.
      return null
    case 'i18n':
      return selectedLocale.value
        ? { kind: 'i18n', locale: selectedLocale.value, bucket: selectedBucket.value }
        : null
    case 'seed':
      return { kind: 'seed', bucket: selectedSeedBucket.value }
    default:
      return null
  }
}

// Resolves a descriptor to the live reactive object/array it names — may
// return null if the target was deleted since (a chapter/app removed via a
// structural op, which always writes to disk immediately and is never
// itself undoable, see docs). Single source of truth: activeResource below
// is just this applied to the CURRENT descriptor, and useUndoHistory.js
// calls it directly to resolve whatever descriptor a stack entry names.
function resolveResource(descriptor) {
  if (!descriptor) return null
  switch (descriptor.kind) {
    case 'chapter':
      return story.project?.chapters?.find((c) => c.id === descriptor.id) || null
    case 'contacts':
      return story.project?.contacts || null
    case 'threads':
      return story.project?.threads || null
    case 'game':
      // Events AND interactions both live inside game.js too
      // (gameConfig.events/gameConfig.interactions) — same file on disk,
      // same dirty/save flow as the Jeu tab, not a separate resource.
      return story.project?.gameConfig || null
    case 'app':
      // Unlike events/interactions, each custom app is its OWN file (see
      // src-electron/ipc/customApps.js) — watched per-app, saved via
      // saveCustomApp, not the whole-project saveGame() below.
      return story.project?.customApps?.find((a) => a.id === descriptor.id) || null
    case 'i18n':
      return story.project?.i18n?.[descriptor.locale]?.[descriptor.bucket] ?? null
    case 'seed':
      // Whole bucket watched (dict or array), same as contacts/threads —
      // NOT narrowed to whichever conversation is open within
      // messages/dms, matching the established "which sub-item is
      // selected doesn't rearm" rule (that state is local to
      // SeedBucketEditor.vue, not lifted here).
      return story.project?.seed?.[descriptor.bucket] ?? null
    default:
      return null
  }
}

// Where to land the user so an undo/redo is actually VISIBLE, not just a
// data change off-screen. Returns false if the target no longer exists
// (chapter/app deleted since this history entry was recorded) so the
// caller can drop the entry instead of navigating nowhere.
function navigateToResource(descriptor, hint) {
  if (!descriptor) return false
  // "Aperçu seul" hides the entire editing panel behind the phone preview
  // — same fix previewFrom() applies in the opposite direction, needed here
  // so whatever we navigate to is actually visible, not just correctly
  // mutated off-screen.
  focusPreview.value = false
  switch (descriptor.kind) {
    case 'chapter': {
      const idx = story.project?.chapters?.findIndex((c) => c.id === descriptor.id)
      if (idx == null || idx < 0) return false
      viewMode.value = 'chapters'
      selectedIndex.value = idx
      return true
    }
    case 'contacts':
      viewMode.value = 'data'
      dataSubTab.value = 'contacts'
      return true
    case 'threads':
      viewMode.value = 'data'
      dataSubTab.value = 'threads'
      return true
    case 'game':
      // navHint picks the right sub-tab/row (Jeu/Réactions/Interactions/
      // Données all share one descriptor, see currentDescriptor's comment)
      // — without it, an edit made in Events would land on Jeu, which shows
      // neither the event list nor its form: correctly undone, invisibly so.
      // 'schemas'/'flags' route through the merged Données tab, 'events'/
      // 'automations' through the merged Réactions tab, rather than being
      // top-level viewModes themselves.
      if (hint?.viewMode === 'schemas') {
        viewMode.value = 'data'
        dataSubTab.value = 'schemas'
        if (hint.schemaIndex != null) selectedSchemaIndex.value = hint.schemaIndex
      } else if (hint?.viewMode === 'flags') {
        viewMode.value = 'data'
        dataSubTab.value = 'flags'
      } else if (hint?.viewMode === 'events') {
        viewMode.value = 'reactions'
        reactionsSubTab.value = 'events'
        if (hint.eventIndex != null) selectedEventIndex.value = hint.eventIndex
      } else if (hint?.viewMode === 'automations') {
        viewMode.value = 'reactions'
        reactionsSubTab.value = 'automations'
        if (hint.automationIndex != null) selectedAutomationIndex.value = hint.automationIndex
      } else if (hint?.viewMode === 'interactions') {
        viewMode.value = 'interactions'
        if (hint.interactionIndex != null) selectedInteractionIndex.value = hint.interactionIndex
      } else {
        viewMode.value = 'game'
      }
      return true
    case 'app': {
      const idx = story.project?.customApps?.findIndex((a) => a.id === descriptor.id)
      if (idx == null || idx < 0) return false
      viewMode.value = 'apps'
      selectedCustomAppIndex.value = idx
      return true
    }
    case 'i18n':
      viewMode.value = 'i18n'
      selectedLocale.value = descriptor.locale
      selectedBucket.value = descriptor.bucket
      return true
    case 'seed':
      viewMode.value = 'seed'
      selectedSeedBucket.value = descriptor.bucket
      return true
    default:
      return false
  }
}

// Non-identity context captured alongside a history entry — see
// navigateToResource's 'game' case for why this exists (Jeu/Réactions/
// Interactions/Données-schémas-et-flags share one descriptor but need
// different sub-tab navigation). Données' 'contacts'/'threads' sub-tabs
// don't need an entry here — they resolve to their OWN descriptor kind
// ('contacts'/'threads', not 'game'), which navigateToResource already
// routes straight back to the Données tab on its own.
function currentNavHint() {
  if (viewMode.value === 'reactions' && reactionsSubTab.value === 'events') {
    return { viewMode: 'events', eventIndex: selectedEventIndex.value }
  }
  if (viewMode.value === 'reactions' && reactionsSubTab.value === 'automations') {
    return { viewMode: 'automations', automationIndex: selectedAutomationIndex.value }
  }
  if (viewMode.value === 'interactions') {
    return { viewMode: 'interactions', interactionIndex: selectedInteractionIndex.value }
  }
  if (viewMode.value === 'data' && dataSubTab.value === 'schemas') {
    return { viewMode: 'schemas', schemaIndex: selectedSchemaIndex.value }
  }
  if (viewMode.value === 'data' && dataSubTab.value === 'flags') {
    return { viewMode: 'flags' }
  }
  return null
}

// The object currently watched for the dirty flag/autosave.
const activeResource = computed(() => resolveResource(currentDescriptor()))

const dirty = ref(false)
const autosave = ref(localStorage.getItem(AUTOSAVE_KEY) === 'true')
watch(autosave, (val) => localStorage.setItem(AUTOSAVE_KEY, String(val)))

// Global undo/redo, shared across every resource in the project — see
// useUndoHistory.js for why this is a per-instance composable (not a
// module-level singleton) and how it uses currentDescriptor/resolveResource/
// navigateToResource to survive switching tabs instead of resetting.
const {
  canUndo,
  canRedo,
  undo,
  redo,
  notifyMutated: notifyUndoableMutation,
  resync: resyncUndoHistory,
} = useUndoHistory(currentDescriptor, resolveResource, navigateToResource, {
  commitDebounceMs: UNDO_COMMIT_DEBOUNCE_MS,
  navHint: currentNavHint,
})

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
      notifyUndoableMutation()
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
// Tracks the descriptor the watcher below is about to leave — separate
// from useUndoHistory's own internal baselineDescriptor (that one only
// updates via resyncUndoHistory(), which we call further down in this same
// handler; reading currentDescriptor() again after that point would just
// return the NEW descriptor, same as `newDescriptor` below).
let previousDescriptor = currentDescriptor()

watch(
  [
    viewMode,
    selectedIndex,
    selectedCustomAppIndex,
    dataSubTab,
    selectedLocale,
    selectedBucket,
    selectedSeedBucket,
  ],
  async () => {
    const newDescriptor = currentDescriptor()
    const changed = !descriptorsEqual(previousDescriptor, newDescriptor)
    // Was: `dirty.value = false` unconditionally on any resource change —
    // that cleared the "unsaved changes" dot (and disabled Save) the moment
    // you left a chapter/app/bucket via the most routine navigation in the
    // editor (e.g. "← Retour au graphe"), even though the edit had only
    // ever been pushed to the in-memory undo stack, never written to disk.
    // With autosave off (the default) that edit was then gone for good the
    // next time the project closed. Fix: flush-save the resource we're
    // LEAVING before the indicator is allowed to go quiet — save() is
    // descriptor-driven (see below) specifically so it can target the old
    // resource even though every viewMode/selection ref has already flipped
    // to the new one by the time this watcher runs. If the save fails,
    // dirty stays true and the failure Notify (already inside save())
    // tells the author why — never a silent clear.
    let flushed = true
    if (changed && dirty.value) {
      flushed = await save(previousDescriptor)
    }
    // resync() flushes whatever undo-history commit was pending on the OLD
    // resource — independent of the disk save above, it only touches the
    // in-memory undo stack, so ordering between the two doesn't matter.
    resyncUndoHistory()
    if (changed && flushed) dirty.value = false
    clearTimeout(debounceTimer)
    watchActiveResource()
    previousDescriptor = newDescriptor
  },
)
watchActiveResource()
resyncUndoHistory()

// Chapter ids are auto-generated from the title at creation time (see
// ChapterGraph.vue's createChapter) but never revisited after — this is
// what keeps them in sync on rename, fired on the title field's blur
// (not every keystroke: mid-typing collision bumps and file churn would be
// noisy and pointless). Cascades to everything the id drives: the on-disk
// chapter file + its per-locale i18n bucket (renamed together by the
// project:renameChapter handler, see project.js), every other chapter's
// `next[].to` pointing at the old id (same cleanup ChapterGraph.vue's
// confirmDelete does for deletion), and the in-memory i18n dict (so the
// bucket editor doesn't show the chapter's existing translations as
// orphaned under the old key).
async function renameChapterIfNeeded() {
  const chapter = selectedChapter.value
  if (!chapter) return
  const title = chapter.title.trim()
  if (!title) return
  const newId = generateChapterId(title, story.project.chapters, chapter.id)
  if (newId === chapter.id) return

  const oldId = chapter.id
  const oldSourceFile = chapter.__sourceFile
  clearTimeout(debounceTimer)
  chapter.id = newId
  try {
    const result = await window.storieAPI.renameChapter({
      rootPath: story.project.rootPath,
      oldId,
      newId,
      oldSourceFile,
      source: serializeChapter(chapter),
    })
    chapter.__sourceFile = result.sourceFile

    const affected = story.project.chapters.filter(
      (c) => c !== chapter && (c.next || []).some((link) => link.to === oldId),
    )
    for (const other of affected) {
      other.next = other.next.map((link) => (link.to === oldId ? { ...link, to: newId } : link))
      await window.storieAPI.saveChapter({
        rootPath: story.project.rootPath,
        sourceFile: other.__sourceFile,
        source: serializeChapter(other),
      })
    }

    for (const locale of Object.keys(story.project.i18n || {})) {
      const bucket = story.project.i18n[locale][oldId]
      if (bucket) {
        story.project.i18n[locale][newId] = bucket
        delete story.project.i18n[locale][oldId]
      }
    }
    if (selectedBucket.value === oldId) selectedBucket.value = newId

    // The game's boot chapter (see GameForm.vue's entry-chapter picker) is
    // stored by id too — silently going stale here would drop the player
    // into the wrong chapter (or, if the id it's still pointing at now
    // collides with nothing, fail validateProject's entryChapterId check).
    if (story.project.manifest?.entryChapterId === oldId) {
      story.project.manifest.entryChapterId = newId
      await window.storieAPI.saveManifest({
        rootPath: story.project.rootPath,
        manifest: JSON.parse(JSON.stringify(story.project.manifest)),
      })
    }

    Notify.create({ type: 'positive', message: t('editorPage.chapterRenamed') })
  } catch (err) {
    chapter.id = oldId
    Notify.create({ type: 'negative', message: err.message || String(err) })
  } finally {
    await nextTick()
    dirty.value = false
  }
}

// Descriptor-driven (defaults to whatever's currently active, e.g. the
// Save button's plain `@click="save"`) rather than reading viewMode/
// selectedX refs directly — so it can also be called with a DIFFERENT,
// already-left-behind descriptor (see the re-arm watch above) at a point
// where those refs have already flipped to the new resource.
// resolveResource() (same lookup useUndoHistory.js uses) gives every branch
// below the live object by descriptor identity instead of "whatever's
// currently selected", which is what makes saving the outgoing resource
// possible. Returns true on success, false on a caught error — callers that
// use the result to decide whether it's safe to clear `dirty` must never
// clear it on a false return, or the failure becomes silent.
async function save(descriptor = currentDescriptor()) {
  if (!descriptor) return true
  try {
    if (descriptor.kind === 'chapter') {
      const chapter = resolveResource(descriptor)
      if (!chapter) return true
      await window.storieAPI.saveChapter({
        rootPath: story.project.rootPath,
        sourceFile: chapter.__sourceFile,
        source: serializeChapter(chapter),
      })
    } else if (descriptor.kind === 'contacts') {
      await window.storieAPI.saveContacts({
        rootPath: story.project.rootPath,
        source: serializeContacts(story.project.contacts),
      })
    } else if (descriptor.kind === 'threads') {
      await window.storieAPI.saveThreads({
        rootPath: story.project.rootPath,
        source: serializeThreads(story.project.threads),
      })
    } else if (descriptor.kind === 'game') {
      await window.storieAPI.saveGame({
        rootPath: story.project.rootPath,
        source: serializeGame(story.project.gameConfig),
      })
    } else if (descriptor.kind === 'app') {
      const app = resolveResource(descriptor)
      if (!app) return true
      const { __sourceFile, ...data } = app
      await window.storieAPI.saveCustomApp({
        rootPath: story.project.rootPath,
        sourceFile: __sourceFile,
        // Unlike chapters/events/etc (sent as a serialized JS source
        // string, see serializeChapter.js), custom apps are sent as plain
        // JSON — but `app` is a live Pinia-reactive object (it's an item of
        // story.project.customApps), and `{ ...app }` only shallow-copies:
        // nested screens/blocks/card-children are still reactive Proxies a
        // few levels down, which Electron's IPC structured-clone rejects
        // ("An object could not be cloned"). Round-tripping through
        // JSON strips every Proxy, same defensive trick project.js's own
        // loadProjectFromDisk uses on the way back.
        data: JSON.parse(JSON.stringify(data)),
      })
    } else if (descriptor.kind === 'i18n') {
      await window.storieAPI.saveI18nBucket({
        rootPath: story.project.rootPath,
        locale: descriptor.locale,
        bucket: descriptor.bucket,
        source: serializeI18nBucket(resolveResource(descriptor) || {}),
      })
    } else if (descriptor.kind === 'seed') {
      await window.storieAPI.saveSeedBucket({
        rootPath: story.project.rootPath,
        bucket: descriptor.bucket,
        source: serializeSeedBucket(resolveResource(descriptor)),
      })
    }
    if (descriptorsEqual(descriptor, currentDescriptor())) dirty.value = false
    Notify.create({ type: 'positive', message: t('editorPage.saved') })
    return true
  } catch (err) {
    Notify.create({ type: 'negative', message: err.message || String(err) })
    return false
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

// Jumps the (already-visible, docked) phone preview straight to the custom
// app currently being built in the Apps tab — same "no playerName yet"
// bootstrap as previewFrom() above, but skips the lock screen too (unlike a
// chapter preview, there's no narrative reason to see the lock screen
// first, the author wants to look at the app itself). Reused live: since
// CustomAppRenderer.vue reads story.project.customApps reactively, every
// block edit shows up on the preview immediately, no extra wiring needed
// beyond having the right app open.
//
// ALWAYS resets via story.loadProject() first (same mechanism the topbar's
// "Relancer l'aperçu" button uses, see restartPreview() above) — not just
// when playerName is empty. story.startIfNeeded()'s own `if (this.started)
// return` guard otherwise makes this a no-op once a session has started
// once, which used to mean entity-schema seed instances (or anything else
// re-derived at start) added mid-session never showed up in the Apps tab
// without a manual full restart first — confirmed by a real user hitting
// exactly this. playerName/locale/color are preserved across the reset
// (defaulted only the first time) so the identity shown doesn't churn on
// every app switch.
// "Test as player" mode (pilier 07) — a per-open-app-session toggle, reset
// whenever `selectedCustomApp` changes (see the watch just below) so it
// never silently carries fake data into a DIFFERENT app. Turning it OFF
// just calls previewCustomApp() again — the exact same clean reset
// "Relancer l'aperçu" already does — rather than tracking/undoing exactly
// what was injected.
const testModeOn = ref(false)
function toggleTestMode() {
  if (!selectedCustomApp.value) return
  testModeOn.value = !testModeOn.value
  previewCustomApp(selectedCustomApp.value.id)
  if (testModeOn.value) {
    const { entities, flagCollections } = generateTestData(
      selectedCustomApp.value,
      story.project?.gameConfig,
      story.project?.contacts,
    )
    Object.assign(story.entities, entities)
    Object.assign(story.flagCollections, flagCollections)
  }
}

function previewCustomApp(appId) {
  const prevName = story.playerName
  const prevLocale = story.locale
  const prevColor = story.playerColor
  story.loadProject(story.project)
  story.setLocale(
    prevLocale ||
      (story.availableLocales.some((l) => l.code === navigator.language)
        ? navigator.language
        : DEFAULT_LOCALE),
  )
  story.setPlayerName(prevName || 'DemoName')
  story.setPlayerColor(prevColor || '#9c27b0')
  phone.requestReboot()
  phone.unlock()
  phone.openApp(appId)
}

// Auto-follows the Apps tab's own selection — switching into "apps" or
// picking a different app in the list re-triggers this (selectedCustomApp
// only changes reference on those two occasions, not on every block edit,
// since edits mutate the same object in place).
watch(
  () => (viewMode.value === 'apps' ? selectedCustomApp.value : null),
  (app) => {
    if (app) {
      testModeOn.value = false
      previewCustomApp(app.id)
    }
  },
)

// `story.entities` (what a `schedule`/`ledger`/`list source:'entity'` block
// actually reads) is a SNAPSHOT taken from each schema's `seed` the moment
// previewCustomApp() last ran — editing a seed instance's fields afterward
// (e.g. adding a schedule slot in the Données > Schémas tab, still with the
// same app open) mutates the schema's `seed` template but not that already-
// materialized snapshot, so the preview silently keeps showing stale data
// until something forces a fresh loadProject() — confirmed by a real user
// whose schedule slot never highlighted until they used "Relancer l'aperçu".
//
// The source is a JSON STRING, not the live `entitySchemas` array with
// `deep: true` — a deep watch on that array recurses into itself here:
// previewCustomApp() calls story.loadProject(story.project), which does
// `Object.assign(this, defaultState())` (defaultState().project is `null`)
// immediately followed by `this.project = projectData` — two writes to
// story.project in the same tick, which a deep watcher rooted at
// `story.project?.gameConfig?.entitySchemas` sees as its own dependency
// changing and re-fires on, calling previewCustomApp() again, forever
// ("Maximum recursive updates exceeded", hit by a real user). A string
// snapshot only changes when the actual seed CONTENT changes — loadProject()
// doesn't touch schema.seed itself, so re-running it can't perturb this
// string, and the watcher can't retrigger itself.
watch(
  () =>
    viewMode.value === 'apps'
      ? JSON.stringify(story.project?.gameConfig?.entitySchemas?.map((s) => s.seed) || null)
      : null,
  (signature) => {
    if (signature && selectedCustomApp.value) previewCustomApp(selectedCustomApp.value.id)
  },
)

function onKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    save()
    return
  }
  // Global takeover, same as Ctrl+S above (unconditional, regardless of
  // focused element) — undo/redo operate on the whole activeResource, not
  // a single field's native text-input undo.
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault()
    if (e.shiftKey) redo()
    else undo()
    return
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
    e.preventDefault()
    redo()
    return
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    globalSearchDialogRef.value?.open()
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

function closeProject() {
  // dirty tracks the currently-active resource only (see the re-arm watch
  // above, which already flushes any resource left BEHIND) — so by the
  // time this runs, dirty=true can only mean the resource on screen right
  // now has edits neither saved nor yet auto-saved. Previously this wiped
  // story.project unconditionally, discarding that in-memory edit with no
  // warning at all.
  if (dirty.value) {
    Dialog.create({
      title: t('editorPage.unsavedCloseTitle'),
      message: t('editorPage.unsavedCloseMessage'),
      cancel: true,
      persistent: true,
      color: 'negative',
    }).onOk(doCloseProject)
    return
  }
  doCloseProject()
}

function doCloseProject() {
  localStorage.removeItem(LAST_PROJECT_KEY)
  story.loadProject(null)
  router.push({ name: 'open-project' })
}

// Last-resort net for closing the window/tab itself (not caught by
// closeProject() above, which only guards the in-app "switch project"
// action) — native browser/Electron confirm, so no i18n string involved.
function onBeforeUnload(e) {
  if (!dirty.value) return
  e.preventDefault()
  e.returnValue = ''
}
onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))

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
      t('editorPage.missingAssetError', { path: missingPath, labels: ref.labels.join(', ') }),
    )
  }
  return { errors, warnings }
}

function showValidationDialog(errors, warnings) {
  if (!errors.length && !warnings.length) {
    Dialog.create({
      title: t('editorPage.validationTitle'),
      message: t('editorPage.validationNone'),
      ok: true,
      color: 'primary',
    })
    return
  }
  const parts = []
  if (errors.length)
    parts.push(
      `${t('editorPage.validationErrorsHeader', { n: errors.length })}\n${errors.join('\n')}`,
    )
  if (warnings.length)
    parts.push(
      `${t('editorPage.validationWarningsHeader', { n: warnings.length })}\n${warnings.join('\n')}`,
    )
  Dialog.create({
    title: t('editorPage.validationTitle'),
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

// The Build button's only job now is the pre-flight project validation
// (asset refs, chapter graph, etc. — story-store-coupled logic that lives
// here, not in BuildStepper.vue, so that component stays focused on
// version/distribution/toolchain/progress). BuildStepper.vue owns
// everything from the version step onward.
const openingBuildStepper = ref(false)
async function openBuildStepper() {
  openingBuildStepper.value = true
  try {
    const { errors, warnings } = await computeValidation()
    if (errors.length) {
      showValidationDialog(errors, warnings)
      Notify.create({ type: 'negative', message: t('editorPage.buildCancelled') })
      return
    }
    if (warnings.length) {
      const proceed = await new Promise((resolve) => {
        Dialog.create({
          title: t('editorPage.warningsDialogTitle'),
          message: t('editorPage.warningsDialogMessage', {
            n: warnings.length,
            list: warnings.join('\n'),
          }),
          cancel: true,
          persistent: true,
          color: 'primary',
        })
          .onOk(() => resolve(true))
          .onCancel(() => resolve(false))
      })
      if (!proceed) return
    }
    buildStepperRef.value?.open()
  } finally {
    openingBuildStepper.value = false
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
  flex-shrink: 1;
  min-width: 0;
  max-width: 240px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
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

/* Panneau "more_vert" replié (voir topbarCompact) — q-dialog
   position="right", pas un q-menu : plein confort pour des rangées qui
   embarquent des composants entiers (EditorLangSwitch/CloudSyncButton),
   trop à l'étroit dans un dropdown classique. */
.topbar-drawer {
  width: 280px;
  max-width: 85vw;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.topbar-drawer-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-2) var(--space-2) var(--space-4);
}

.topbar-drawer-list {
  flex: 1;
  overflow-y: auto;
}

.nav-item-active {
  color: var(--color-accent);
  background: var(--color-accent-tint);
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

/* Données tab (Flags/Schémas/Contacts/Groupes merged into one topbar slot) —
   the list pane gets its own small nested tab strip instead of a 4th level
   of topbar tabs; the form pane just switches on `dataSubTab` directly (see
   template), no CSS of its own needed there. */
.data-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0;
}

.data-subtabs {
  padding: 0 var(--space-2);
  flex-shrink: 0;
}

.data-subpanel {
  flex: 1;
  overflow-y: auto;
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

/* Fills the whole pane and centers content vertically — before this, an
   empty selection (no locale/contact/thread/app picked yet) left its
   message pinned to the top of a mostly-blank tall panel (confirmed on
   screen, docs/ui-ux-guidelines.md §7 backlog item), which reads as "not
   finished" rather than "nothing selected yet". Shared by all 4 usages
   above (i18n/contacts/threads/apps) — one fix benefits every one of them. */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 60vh;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  padding: var(--space-6);
  text-align: center;
}
.empty-state .q-icon {
  opacity: 0.5;
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

.flags-dialog-card {
  min-width: 480px;
  max-width: 90vw;
  background: var(--color-surface);
  color: var(--color-text);
}

.flags-dialog-body {
  max-height: 70vh;
}
</style>
