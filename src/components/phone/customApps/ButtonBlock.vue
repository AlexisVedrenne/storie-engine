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
// themselves, not a generic scripting hook. The actual dispatch lives in
// useBlockAction.js (shared with a `lookup` result's own action, authored
// via the same BlockActionEditor.vue) — see that file for what each kind
// does.
import { computed, inject } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import { resolveDynamicText } from '@/engine/customApps/resolveDynamicText'
import { useBlockAction } from '@/engine/customApps/useBlockAction'

const props = defineProps({ block: { type: Object, required: true } })
const story = useStoryStore()
const listItem = inject('customAppListItem', null)
const { runAction } = useBlockAction()
const label = computed(() => resolveDynamicText(props.block.label, story, listItem) || '')

function onClick() {
  runAction(props.block.action, listItem)
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
