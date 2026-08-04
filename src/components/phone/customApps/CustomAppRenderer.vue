<template>
  <div class="app-screen">
    <img
      v-if="currentScreen?.background"
      :src="resolveAssetUrl(currentScreen.background)"
      class="screen-background"
      alt=""
    />
    <BlockList v-if="currentScreen" :blocks="currentScreen.blocks || []" />
  </div>
</template>

<script setup>
// Single generic interpreter for every author-built custom app — same
// precedent as InteractionPlayer.vue for interactions: one component type,
// shared by every custom app entry in story.mergedAppRegistry, driven
// entirely by the JSON block tree rather than app-specific code. Looks up
// its own data via phone.currentApp instead of receiving it as a prop,
// since PhoneShell.vue's `<component :is="currentAppComponent">` line takes
// no per-app props today — see story.js's toRegistryShape.
import { computed, provide, ref, watch } from 'vue'
import { usePhoneStore } from '@/engine/stores/phone'
import { useStoryStore } from '@/engine/stores/story'
import { resolveAssetUrl } from '@/engine/assets'
import BlockList from './BlockList.vue'

const phone = usePhoneStore()
const story = useStoryStore()

const appDef = computed(() =>
  (story.project?.customApps || []).find((a) => a.id === phone.currentApp),
)

// PhoneShell keys `<component :is="...">` by phone.currentApp, so this
// component instance is destroyed/recreated on every app switch — this
// local state naturally starts fresh each time the app is opened. The watch
// below only matters for the (currently impossible, defensive) case of the
// resolved app itself changing without a remount.
//
// phone.pendingScreenId (set by openApp(), see phone.js) deep-links straight
// to a specific screen instead of the app's own default first one — read
// and immediately cleared here (consumed once) so a later organic app-switch
// never reuses a stale target.
const initialScreenId = phone.pendingScreenId
phone.pendingScreenId = null
const activeScreenId = ref(initialScreenId || appDef.value?.screens?.[0]?.id || null)
watch(appDef, (def) => {
  activeScreenId.value = def?.screens?.[0]?.id || null
})

const currentScreen = computed(
  () =>
    appDef.value?.screens?.find((s) => s.id === activeScreenId.value) ||
    appDef.value?.screens?.[0] ||
    null,
)

provide('customAppNavigate', (screenId) => {
  activeScreenId.value = screenId
})
provide('customAppActiveScreenId', activeScreenId)
</script>

<style scoped>
.app-screen {
  position: relative;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 16px 24px;
}

/* No z-index needed — placed first in the template, default stacking order
   already paints it behind BlockList's own (unpositioned) content. */
.screen-background {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
