<template>
  <button type="button" class="button-block" :style="{ background: block.color || '#4c8bf5' }">
    {{ label }}
  </button>
</template>

<script setup>
// Visual only in v1 — deliberately not wired to any action (see the plan's
// scope note: action blocks are a later phase). Renders inert on purpose.
import { computed, inject } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import { resolveDynamicText } from '@/engine/customApps/resolveDynamicText'

const props = defineProps({ block: { type: Object, required: true } })
const story = useStoryStore()
const listItem = inject('customAppListItem', null)
const label = computed(() => resolveDynamicText(props.block.label, story, listItem) || '')
</script>

<style scoped>
.button-block {
  border: none;
  border-radius: 12px;
  padding: 11px 0;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: default;
}
</style>
