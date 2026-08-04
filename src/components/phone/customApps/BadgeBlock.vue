<template>
  <span class="badge-block" :style="{ background: block.color || '#4c8bf5' }">{{ label }}</span>
</template>

<script setup>
import { computed } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import { resolveDynamicText } from '@/engine/customApps/resolveDynamicText'

const props = defineProps({ block: { type: Object, required: true } })
const story = useStoryStore()
const label = computed(() => resolveDynamicText(props.block.label, story) || '')
</script>

<style scoped>
.badge-block {
  display: inline-flex;
  align-self: flex-start;
  padding: 3px 10px;
  border-radius: 999px;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
}
</style>
