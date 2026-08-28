<template>
  <div class="header-block">
    <AppTitleBar
      :title="title"
      :icon="block.icon || 'apps'"
      :color="block.color || 'var(--app-accent)'"
      @back="phone.goHome()"
    />
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import { usePhoneStore } from '@/engine/stores/phone'
import { useStoryStore } from '@/engine/stores/story'
import { resolveDynamicText } from '@/engine/customApps/resolveDynamicText'
import AppTitleBar from '@/components/phone/AppTitleBar.vue'

const props = defineProps({ block: { type: Object, required: true } })
const phone = usePhoneStore()
const story = useStoryStore()
const listItem = inject('customAppListItem', null)
const title = computed(() => resolveDynamicText(props.block.title, story, listItem) || '')
</script>

<style scoped>
/* AppTitleBar already carries its own 16px horizontal padding — cancel the
   parent BlockList's own inset (see CustomAppRenderer.vue) so it isn't
   doubled here specifically. */
.header-block {
  margin: 0 -16px;
}
</style>
