import { defineStore } from 'pinia'
import { emit } from '@/engine/events/eventManager'

// Pure UI/navigation state for the phone shell — separate from story.js
// (the narrative engine) so "which screen am I on" never gets persisted
// into the save file.
export const usePhoneStore = defineStore('phone', {
  state: () => ({
    locked: true,
    currentApp: null, // null = home screen, else 'messages' | 'social' | 'gallery' | 'calls' | 'settings'
    appOpenedAt: null, // Date.now() when currentApp was opened — drives 'app.closed's `seconds` payload
    activeConversation: null, // contactId when inside an SMS chat thread
    activeDmThread: null, // threadId when inside an Pixly DM thread
    // { appId, threadId } | null — mirrors activeConversation/activeDmThread
    // for a custom app's `conversations` block, whose own navigation stays
    // LOCAL to the block instance (see ConversationsBlock.vue's own
    // comment) rather than living here directly. Written by that block on
    // open/close so story.js's pushAppMessage() has a phone-level signal to
    // check (isViewingAppThread(), mirroring isViewingDmThread()) — without
    // this, a message pushed while the player is actively looking at that
    // exact thread still bumped unread/fired a notification, an accepted
    // v1 gap now closed.
    activeAppThread: null,
    rebootCount: 0, // bumped by requestReboot() — PhoneShell watches this to replay the boot sequence
    // Where onBootDone() should land once the replayed boot animation
    // finishes — 'boot' (default, re-derive from story.playerName, same as
    // before multi-slot saves existed) or 'slots' (Settings' "Changer de
    // sauvegarde" — see requestReboot()'s toSlotPicker option). Consumed
    // once by PhoneShell.vue's onBootDone(), reset back to 'boot' right
    // after so it never leaks into the NEXT, unrelated reboot.
    rebootTarget: 'boot',

    // Consumed once by CustomAppRenderer.vue/ConversationsBlock.vue right
    // after openApp() sets them (see that action below) — lets a caller
    // (story.js's continueAfterTimeSkip, for a `timeskip` entry's landApp/
    // landThread) deep-link straight to a specific screen/conversation
    // instead of the app's own default first screen. Both components null
    // these out immediately after reading, so an unrelated later app-switch
    // (tabs, home button) never accidentally reuses a stale target.
    pendingScreenId: null,
    pendingThreadId: null,

    // Set by BlockList.vue (src/components/phone/customApps/) when its
    // rendered output is clicked — a direct reference to the clicked
    // block's own object (the SAME reactive object BlockBuilder.vue is
    // editing, not a copy/path), so the editor's block builder can
    // auto-expand + scroll to whichever block the author just clicked in
    // the live phone preview. Written unconditionally (cheap, no visual
    // effect on its own) even inside a shipped/exported game, where
    // nothing ever reads it — see docs/interactions-et-apps-custom.md.
    editorSelectedBlock: null,

    // The other direction of the link above — set by BlockBuilder.vue
    // (src/editor/) on mouseenter/mouseleave over a block's own row, read
    // by BlockList.vue to outline the matching element in the live phone
    // preview. Same "written unconditionally, inert in a shipped game"
    // spirit as editorSelectedBlock — nothing in the editor's own UI ever
    // sets it from outside a block row, so this never fires for a player.
    hoveredEditorBlock: null,

    // Which screen (the full `{id,label,blocks,...}` def, not just an id)
    // the Apps tab's own builder currently has selected — set by
    // CustomAppEditor.vue whenever its `currentScreen` changes, read by
    // VariableInspectorPanel.vue (pilier 07) to know which block tree to
    // scan for referenced flags/entity fields. Deliberately the BUILDER's
    // own selection, not whichever screen the live phone preview happens to
    // be showing right now (that's local state inside CustomAppRenderer.vue,
    // not reachable from EditorPage.vue, an ANCESTOR of it in the tree) —
    // an approximation, but the one that needs no new cross-component
    // plumbing beyond the same "phone store as the editor<->preview
    // channel" precedent editorSelectedBlock/hoveredEditorBlock already are.
    editorActiveScreen: null,

    // "Click the map instead of typing x/y" (user request — hand-typing
    // percentages was tedious). Set by BlockPropertiesForm.vue to the exact
    // poi object being positioned (same "direct reference into the live
    // reactive project tree" convention as editorSelectedBlock above, not a
    // copy) while its picker is armed; MapBlock.vue's own click handler
    // writes straight into `poi.x`/`poi.y` and clears this back to null.
    // Only one poi can be "armed" at a time — a second click on the panel's
    // own toggle before placing the first just re-targets it.
    mapPoiPicker: null,
  }),

  actions: {
    unlock() {
      this.locked = false
    },

    // Shared by every place below that stops showing `currentApp` (switching
    // apps, going home, locking, rebooting) — emits 'app.closed' with how
    // long the player was actually in it, only when there was one open.
    closeCurrentApp() {
      if (this.currentApp && this.appOpenedAt) {
        const seconds = Math.round((Date.now() - this.appOpenedAt) / 1000)
        emit('app.closed', { app: this.currentApp, seconds })
      }
      this.appOpenedAt = null
    },

    lock() {
      this.closeCurrentApp()
      this.locked = true
      this.currentApp = null
      this.activeConversation = null
      this.activeDmThread = null
      this.activeAppThread = null
    },
    openApp(appId, { screenId = null, threadId = null } = {}) {
      this.closeCurrentApp()
      this.currentApp = appId
      this.appOpenedAt = Date.now()
      this.activeConversation = null
      this.activeDmThread = null
      this.activeAppThread = null
      this.pendingScreenId = screenId
      this.pendingThreadId = threadId
      // Fires unconditionally, whether or not any project.events reaction
      // actually listens for it (emit() is a no-op with zero subscribers) —
      // see src/engine/events/eventManager.js.
      emit('app.opened', { app: appId })
    },
    goHome() {
      this.closeCurrentApp()
      this.currentApp = null
      this.activeConversation = null
      this.activeDmThread = null
      this.activeAppThread = null
    },
    openConversation(contactId) {
      this.activeConversation = contactId
    },
    closeConversation() {
      this.activeConversation = null
    },
    openDmThread(threadId) {
      this.activeDmThread = threadId
    },
    closeDmThread() {
      this.activeDmThread = null
    },
    openAppThread(appId, threadId) {
      this.activeAppThread = { appId, threadId }
    },
    closeAppThread() {
      this.activeAppThread = null
    },

    selectCustomAppBlock(block) {
      this.editorSelectedBlock = block
    },

    // used by the Settings app after a "reset phone" — puts the shell back
    // in front of the boot animation, same as an actual power cycle, so a
    // fresh save correctly goes through setup again instead of leaving the
    // phone sitting unlocked with a wiped story underneath it.
    // toSlotPicker: false (default, unchanged behavior for every existing
    // call site — EditorPage.vue's restartPreview()/previewFrom()/custom-app
    // preview all call this with no argument) replays the boot animation
    // and re-derives the landing phase from story.playerName, same as
    // always. true (Settings' "Changer de sauvegarde" only) routes back to
    // the slot picker instead — see phone.js's rebootTarget/
    // PhoneShell.vue's onBootDone().
    requestReboot({ toSlotPicker = false } = {}) {
      this.closeCurrentApp()
      this.locked = true
      this.currentApp = null
      this.activeConversation = null
      this.activeDmThread = null
      this.activeAppThread = null
      this.rebootTarget = toSlotPicker ? 'slots' : 'boot'
      this.rebootCount++
    },
  },
})
