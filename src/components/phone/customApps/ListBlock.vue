<template>
  <div class="list-block">
    <ListItemScope
      v-for="c in items"
      :key="c.id ?? c.key"
      :item="c"
      :blocks="block.template || []"
    />
  </div>
</template>

<script setup>
// Two data sources (see blockKinds.js): `'contacts'` (project.contacts,
// optionally filtered to only followed via story.isFollowing(), the same
// follow state the social Fil already gates on) or `'flagCollection'` (a
// collection flag's key->value map, story.collectionItems(flagKey) — a
// growing history/log/inventory the author builds via `effects.collections`,
// see EffectsBuilder.vue). Each item is rendered through ListItemScope so
// the block's own `template` (a block subtree, authored once) can read
// `{item:...}` for the current item — see resolveDynamicText.js for which
// token set applies to which source.
import { computed } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import ListItemScope from './ListItemScope.vue'

const props = defineProps({ block: { type: Object, required: true } })
const story = useStoryStore()

const items = computed(() => {
  if (props.block.source === 'flagCollection') return story.collectionItems(props.block.flagKey)
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
