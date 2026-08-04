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
    rebootCount: 0, // bumped by requestReboot() — PhoneShell watches this to replay the boot sequence

    // Set by BlockList.vue (src/components/phone/customApps/) when its
    // rendered output is clicked — a direct reference to the clicked
    // block's own object (the SAME reactive object BlockBuilder.vue is
    // editing, not a copy/path), so the editor's block builder can
    // auto-expand + scroll to whichever block the author just clicked in
    // the live phone preview. Written unconditionally (cheap, no visual
    // effect on its own) even inside a shipped/exported game, where
    // nothing ever reads it — see docs/interactions-et-apps-custom.md.
    editorSelectedBlock: null,
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
    },
    openApp(appId) {
      this.closeCurrentApp()
      this.currentApp = appId
      this.appOpenedAt = Date.now()
      this.activeConversation = null
      this.activeDmThread = null
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

    selectCustomAppBlock(block) {
      this.editorSelectedBlock = block
    },

    // used by the Settings app after a "reset phone" — puts the shell back
    // in front of the boot animation, same as an actual power cycle, so a
    // fresh save correctly goes through setup again instead of leaving the
    // phone sitting unlocked with a wiped story underneath it.
    requestReboot() {
      this.closeCurrentApp()
      this.locked = true
      this.currentApp = null
      this.activeConversation = null
      this.activeDmThread = null
      this.rebootCount++
    },
  },
})
