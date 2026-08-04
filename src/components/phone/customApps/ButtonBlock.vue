<template>
  <button
    type="button"
    class="button-block"
    :style="{
      background: block.color || '#4c8bf5',
      color: block.textColor || undefined,
      borderRadius: `${block.radius ?? 12}px`,
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
// mechanism, not two. No action / an unrecognized type is a no-op (still
// renders, just inert), matching every other "silently absent" fallback in
// this engine.
import { computed, inject } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import { resolveDynamicText } from '@/engine/customApps/resolveDynamicText'

const props = defineProps({ block: { type: Object, required: true } })
const story = useStoryStore()
const listItem = inject('customAppListItem', null)
const navigate = inject('customAppNavigate', () => {})
const label = computed(() => resolveDynamicText(props.block.label, story, listItem) || '')

function onClick() {
  const action = props.block.action
  if (!action) return
  if (action.type === 'effect') story.applyEffects(action.effects)
  else if (action.type === 'navigateScreen') navigate(action.screenId)
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
