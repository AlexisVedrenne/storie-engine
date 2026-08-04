<template>
  <div class="list-block">
    <ListItemScope v-for="c in items" :key="c.id" :item="c" :blocks="block.template || []" />
  </div>
</template>

<script setup>
// v1 has exactly one data source (project contacts, optionally filtered to
// only followed — see blockKinds.js) — reuses story.isFollowing(), the same
// follow state the social Fil already gates on. Each item is rendered
// through ListItemScope so the block's own `template` (a block subtree,
// authored once) can read `{item:name}`/`{item:avatar}` for the current
// contact — see resolveDynamicText.js.
import { computed } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import ListItemScope from './ListItemScope.vue'

const props = defineProps({ block: { type: Object, required: true } })
const story = useStoryStore()

const items = computed(() => {
  const all = story.project?.contacts || []
  if (!props.block.onlyFollowed) return all
  return all.filter((c) => story.isFollowing(c.id))
})
</script>

<style scoped>
.list-block {
  display: flex;
  flex-direction: column;
}
</style>
