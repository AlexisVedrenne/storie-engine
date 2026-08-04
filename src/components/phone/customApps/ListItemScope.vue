<template>
  <BlockList :blocks="blocks" />
</template>

<script setup>
// One instance per repeated item (see ListBlock.vue's v-for) — `provide()`
// is scoped to the calling component instance, so this wrapper exists
// purely to give each iteration its own `customAppListItem` value for
// descendant leaf blocks (TextBlock.vue etc) to `inject()`. A single
// provide() call inside ListBlock itself would only ever see the LAST
// item, since ListBlock's own setup() runs once, not once per v-for row.
import { provide } from 'vue'
import BlockList from './BlockList.vue'

const props = defineProps({
  item: { type: Object, required: true },
  blocks: { type: Array, default: () => [] },
})

provide('customAppListItem', props.item)
</script>
