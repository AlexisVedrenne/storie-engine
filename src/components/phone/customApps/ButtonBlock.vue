<template>
  <button
    type="button"
    class="button-block"
    :style="{
      background: block.color || 'var(--app-accent)',
      color: block.textColor || undefined,
      borderRadius: block.radius != null ? `${block.radius}px` : 'var(--app-radius)',
    }"
    @click="onClick"
  >
    {{ label }}
  </button>
</template>

<script setup>
// First action-wired block — a small FIXED catalog of action kinds
// (block.action.type), same "bounded vocabulary" precedent as blocks/steps
// themselves, not a generic scripting hook. 'effect' reuses
// story.applyEffects() (the exact mechanic a choice option/interaction
// onWin already uses); 'navigateScreen' reuses the SAME
// 'customAppNavigate' injection TabsBlock.vue already consumes — one nav
// mechanism, not two; 'toast' just shows `action.toastText` via
// story.triggerActionToast(), no other effect. 'openSheet'/'closeSheet'
// (pilier 03) inject the SAME 'customAppOpenSheet'/'customAppCloseSheet'
// functions CustomAppRenderer.vue provides — one modal mechanism, consumed
// here exactly like 'navigateScreen' consumes 'customAppNavigate'. No
// action / an unrecognized type is a no-op (still renders, just inert),
// matching every other "silently absent" fallback in this engine.
//
// `action.requires` gates ALL of the above — same checkConditions() a
// block's own display condition already uses, just checked at CLICK time
// instead of render time. Unlike a failed display condition (the block is
// simply absent), a failed action guard can't hide anything after the fact
// — the button was already visible and tapped — so it shows
// `action.onFailToast` instead of silently no-op'ing, if the author set one.
import { computed, inject } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import { usePhoneStore } from '@/engine/stores/phone'
import { resolveDynamicText } from '@/engine/customApps/resolveDynamicText'
import { emit as emitEngineEvent } from '@/engine/events/eventManager'

const props = defineProps({ block: { type: Object, required: true } })
const story = useStoryStore()
const phone = usePhoneStore()
const listItem = inject('customAppListItem', null)
const navigate = inject('customAppNavigate', () => {})
const openSheet = inject('customAppOpenSheet', () => {})
const closeSheet = inject('customAppCloseSheet', () => {})
const label = computed(() => resolveDynamicText(props.block.label, story, listItem) || '')

function onClick() {
  const action = props.block.action
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
  // Fires the fixed `button.pressed` engine trigger (see triggers.js) —
  // reacted to from the Events tab exactly like app.opened/photo.viewed,
  // NOT a free-form event name. `phone.currentApp` is reliably this
  // block's own app id: CustomAppRenderer (and everything inside it,
  // including this block) only ever mounts while its app is the open one.
  else if (action.type === 'event') {
    emitEngineEvent('button.pressed', { app: phone.currentApp, buttonId: action.buttonId || '' })
  }
}
</script>

<style scoped>
.button-block {
  border: none;
  border-radius: 12px;
  padding: 11px 16px;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}
</style>
