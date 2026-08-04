<template>
  <p
    class="text-block"
    :class="block.style || 'body'"
    :style="{
      color: block.color || undefined,
      fontSize: block.size ? `${block.size}px` : undefined,
    }"
  >
    {{ content }}
  </p>
</template>

<script setup>
// `color`/`size` are optional overrides on top of the title/body style
// preset — unset (the common case), the preset's own font-size/opacity
// below applies untouched.
import { computed, inject } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import { resolveDynamicText } from '@/engine/customApps/resolveDynamicText'

const props = defineProps({ block: { type: Object, required: true } })
const story = useStoryStore()
const listItem = inject('customAppListItem', null)
const content = computed(() => resolveDynamicText(props.block.content, story, listItem) || '')
</script>

<style scoped>
.text-block {
  margin: 0;
  color: #fff;
}

.text-block.title {
  font-size: 20px;
  font-weight: 800;
}

.text-block.body {
  font-size: 14px;
  line-height: 1.5;
  opacity: 0.85;
}
</style>
