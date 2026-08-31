<template>
  <span
    class="badge-block"
    :style="{
      background: block.color || 'var(--app-primary)',
      color: block.textColor || undefined,
      borderRadius: `${block.radius ?? 999}px`,
    }"
    >{{ label }}</span
  >
</template>

<script setup>
import { computed, inject } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import { resolveDynamicText } from '@/engine/customApps/resolveDynamicText'

const props = defineProps({ block: { type: Object, required: true } })
const story = useStoryStore()
const listItem = inject('customAppListItem', null)
const label = computed(() => resolveDynamicText(props.block.label, story, listItem) || '')
</script>

<style scoped>
.badge-block {
  display: inline-flex;
  align-self: flex-start;
  padding: 3px 10px;
  border-radius: 999px;
  /* Pill shape is a deliberate, fixed choice — NOT part of the radius
     scale (unlike button/card), so a "sharp" theme doesn't turn every
     badge into a small rounded rectangle. */
  color: var(--app-text);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
}
</style>
