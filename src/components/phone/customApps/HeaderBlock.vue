<template>
  <div class="header-block" :class="{ sticky: block.sticky }">
    <AppTitleBar
      :title="title"
      :icon="block.icon || 'apps'"
      :color="block.color || 'var(--app-primary)'"
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

/* pilier 03 — pins the header to the top of the screen's own scroll
   container (CustomAppRenderer.vue's `.app-screen`, overflow-y: auto — the
   nearest scrolling ancestor `position: sticky` resolves against). Needs an
   opaque background (falls back to the app's own `--app-bg`) so content
   scrolled underneath doesn't show through, and the horizontal margin above
   has to be cancelled back out or the background wouldn't reach the edges. */
.header-block.sticky {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 0 16px;
  background: var(--app-bg);
}
</style>
