import { defineStore } from 'pinia'
import { emit } from '@/engine/events/eventManager'

// Pure UI/navigation state for the phone shell — separate from story.js
// (the narrative engine) so "which screen am I on" never gets persisted
// into the save file.
export const usePhoneStore = defineStore('phone', {
  state: () => ({
    locked: true,
    currentApp: null, // null = home screen, else 'messages' | 'social' | 'gallery' | 'calls' | 'settings'
    activeConversation: null, // contactId when inside an SMS chat thread
    activeDmThread: null, // threadId when inside an Insta DM thread
    rebootCount: 0 // bumped by requestReboot() — PhoneShell watches this to replay the boot sequence
  }),

  actions: {
    unlock() {
      this.locked = false
    },
    lock() {
      this.locked = true
      this.currentApp = null
      this.activeConversation = null
      this.activeDmThread = null
    },
    openApp(appId) {
      this.currentApp = appId
      this.activeConversation = null
      this.activeDmThread = null
      // Fires unconditionally, whether or not any project.events reaction
      // actually listens for it (emit() is a no-op with zero subscribers) —
      // see src/engine/events/eventManager.js.
      emit('app.opened', { app: appId })
    },
    goHome() {
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

    // used by the Settings app after a "reset phone" — puts the shell back
    // in front of the boot animation, same as an actual power cycle, so a
    // fresh save correctly goes through setup again instead of leaving the
    // phone sitting unlocked with a wiped story underneath it.
    requestReboot() {
      this.locked = true
      this.currentApp = null
      this.activeConversation = null
      this.activeDmThread = null
      this.rebootCount++
    }
  }
})
