<template>
  <div class="app-screen" :style="themeVars">
    <video
      v-if="currentScreen?.background && currentScreen.backgroundType === 'video'"
      :src="resolveAssetUrl(currentScreen.background)"
      class="screen-background"
      :style="{ opacity: backgroundOpacity }"
      autoplay
      muted
      loop
      playsinline
    />
    <img
      v-else-if="currentScreen?.background"
      :src="resolveAssetUrl(currentScreen.background)"
      class="screen-background"
      :style="{ opacity: backgroundOpacity }"
      alt=""
    />
    <BlockList v-if="currentScreen" :blocks="currentScreen.blocks || []" :gap="gapPx" />
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

// App theme (`def.theme`, authored in CustomAppEditor.vue's "Thème" panel)
// — a small fixed set of design tokens (5-role palette, a font stack, a
// radius scale, a spacing scale), resolved here into CSS custom properties
// on the screen's own root so every block underneath picks them up through
// normal CSS cascade/inheritance, with ZERO wiring needed in each block
// component beyond swapping a hardcoded literal for `var(--app-*)` — no
// provide()/inject() needed the way `customAppNavigate` needs one, since
// this is purely a styling concern. `theme` is entirely optional — an app
// that never opens its Thème panel gets exactly the literal defaults this
// engine always shipped (accent #4c8bf5, text white, transparent
// background), byte-for-byte, so no existing project's look changes.
const FONT_STACKS = {
  sans: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: '"Courier New", Consolas, monospace',
  rounded: '"Segoe UI Rounded", ui-rounded, system-ui, sans-serif',
}
// Deliberately NOT live Google Fonts — a packaged, exported game has no
// guaranteed internet access (see docs/architecture.md's Vendoring
// section), so a `<link>`-loaded web font would silently fail to load for
// a player offline. These 4 stacks are made entirely of fonts already
// installed with the OS/browser.
const RADIUS_SCALE = { sharp: 6, normal: 12, round: 20 }
const SPACING_SCALE = { tight: 6, normal: 10, loose: 16 }

function hexToRgbTriplet(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '')
  return m ? `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}` : '76, 139, 245'
}

const themeVars = computed(() => {
  const theme = appDef.value?.theme || {}
  const palette = theme.palette || {}
  const accent = palette.accent || '#4c8bf5'
  return {
    '--app-bg': palette.background || 'transparent',
    '--app-surface': palette.surface || 'rgba(255, 255, 255, 0.06)',
    '--app-text': palette.text || '#ffffff',
    '--app-accent': accent,
    '--app-accent-rgb': hexToRgbTriplet(accent),
    '--app-danger': palette.danger || '#e05252',
    '--app-font': FONT_STACKS[theme.fontStack] || FONT_STACKS.sans,
    '--app-radius': `${RADIUS_SCALE[theme.radius] ?? RADIUS_SCALE.normal}px`,
  }
})
const gapPx = computed(() => {
  const spacing = appDef.value?.theme?.spacing
  return SPACING_SCALE[spacing] ?? SPACING_SCALE.normal
})

// Screen background (pilier 03) — a plain image (original v1) or a short
// muted/looping video, author's choice of `currentScreen.backgroundType`.
// `backgroundOpacity` (0-100, default 100 = fully opaque, matching the
// original always-opaque image) lets an author fade it into the app's own
// `--app-bg` instead of always painting it at full strength.
const backgroundOpacity = computed(() => (currentScreen.value?.backgroundOpacity ?? 100) / 100)
</script>

<style scoped>
.app-screen {
  position: relative;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 16px 24px;
  background: var(--app-bg);
  color: var(--app-text);
  font-family: var(--app-font);
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
