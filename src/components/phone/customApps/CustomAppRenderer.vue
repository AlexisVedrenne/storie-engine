<template>
  <div class="app-screen">
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
import BlockList from './BlockList.vue'

const phone = usePhoneStore()
const story = useStoryStore()

const appDef = computed(() => (story.project?.customApps || []).find((a) => a.id === phone.currentApp))

// PhoneShell keys `<component :is="...">` by phone.currentApp, so this
// component instance is destroyed/recreated on every app switch — this
// local state naturally starts fresh each time the app is opened. The watch
// below only matters for the (currently impossible, defensive) case of the
// resolved app itself changing without a remount.
const activeScreenId = ref(appDef.value?.screens?.[0]?.id || null)
watch(appDef, (def) => {
  activeScreenId.value = def?.screens?.[0]?.id || null
})

const currentScreen = computed(
  () => appDef.value?.screens?.find((s) => s.id === activeScreenId.value) || appDef.value?.screens?.[0] || null,
)

provide('customAppNavigate', (screenId) => {
  activeScreenId.value = screenId
})
provide('customAppActiveScreenId', activeScreenId)
</script>

<style scoped>
.app-screen {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 16px 24px;
}
</style>
