import { inject } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import { usePhoneStore } from '@/engine/stores/phone'
import { resolveDynamicText } from '@/engine/customApps/resolveDynamicText'
import { emit as emitEngineEvent } from '@/engine/events/eventManager'

// Shared action-dispatch logic for anything with a `block.action`-shaped
// field — originally ButtonBlock.vue's own inline `onClick`, extracted so a
// `lookup` result's own action (same fixed catalog, authored via the same
// BlockActionEditor.vue) doesn't need a second implementation. Must be
// called synchronously from a component's own `<script setup>` (or another
// composable called that way) — it calls `inject()` internally, which only
// resolves against the currently-rendering component instance.
export function useBlockAction() {
  const story = useStoryStore()
  const phone = usePhoneStore()
  const navigate = inject('customAppNavigate', () => {})
  const openSheet = inject('customAppOpenSheet', () => {})
  const closeSheet = inject('customAppCloseSheet', () => {})
  const requestInput = inject('customAppRequestInput', () => {})

  // `action.requires` gates ALL kinds — same checkConditions() a block's own
  // display condition already uses, just checked at CLICK time instead of
  // render time. Unlike a failed display condition (the thing is simply
  // absent), a failed action guard can't hide anything after the fact — it
  // was already visible and tapped — so it shows `action.onFailToast`
  // instead of silently no-op'ing, if the author set one.
  //
  // async (pilier 04) so `sequence` can await each of its own steps in
  // order — 'wait' is the only kind that actually takes real time, but
  // 'triggerEntry' also has to wait for its own `then` array to finish
  // (blocking entries like a choice/call resolve on player input, not
  // immediately) before a sequence's NEXT step runs. Callers that don't
  // care when it finishes (a plain button click) just don't await it.
  async function runAction(action, listItem = null) {
    if (!action) return
    if (action.requires && !story.checkConditions(action.requires)) {
      if (action.onFailToast) {
        story.triggerActionToast(resolveDynamicText(action.onFailToast, story, listItem))
      }
      return
    }
    if (action.type === 'effect') story.applyEffects(action.effects)
    else if (action.type === 'navigateScreen') navigate(action.screenId)
    else if (action.type === 'toast') {
      story.triggerActionToast(resolveDynamicText(action.toastText, story, listItem))
    } else if (action.type === 'openSheet') openSheet(action.sheetId)
    else if (action.type === 'closeSheet') closeSheet()
    else if (action.type === 'openApp') {
      phone.openApp(action.appId, { screenId: action.screenId || null })
    } else if (action.type === 'requestInput') requestInput(action)
    // One click, several consequences — steps are action-shaped themselves
    // (each can have its own `requires`/`onFailToast`, for free, since they
    // go through this exact same function recursively), run strictly in
    // order via await, not Promise.all — a 'wait' step or a blocking
    // 'triggerEntry' step is supposed to hold up whatever comes after it.
    else if (action.type === 'sequence') {
      for (const step of action.steps || []) await runAction(step, listItem)
    } else if (action.type === 'wait') {
      await new Promise((resolve) => setTimeout(resolve, action.ms || 0))
    }
    // Runs an author-written mini-timeline (message/choice/effect/call/...)
    // via story.runThen() — the SAME mechanism game.events[] reactions
    // already use (see handleEngineEvent in story.js), just triggered by a
    // tap instead of an engine trigger. Same known limitation documented
    // there: a BLOCKING entry here (choice/call) sets story.timelineResume
    // the same way the main timeline does, so triggering one while the main
    // timeline is ALSO mid-choice/call at that exact moment would clobber
    // it — acceptable for a first cut, not solved generically here either.
    else if (action.type === 'triggerEntry') {
      await new Promise((resolve) => {
        story.runThen(action.then || [], 0, story.currentChapter, resolve)
      })
    }
    // Fires the fixed `button.pressed` engine trigger (see triggers.js) —
    // reacted to from the Events tab exactly like app.opened/photo.viewed,
    // NOT a free-form event name, whether this action lives on a button or
    // a lookup result. `phone.currentApp` is reliably the caller's own app
    // id: CustomAppRenderer (and everything inside it) only ever mounts
    // while its app is the open one.
    else if (action.type === 'event') {
      emitEngineEvent('button.pressed', { app: phone.currentApp, buttonId: action.buttonId || '' })
    }
  }

  return { runAction }
}
