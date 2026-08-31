<template>
  <div class="app-screen" :style="themeVars">
    <div class="app-screen-scroll">
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

    <!-- A direct child of `.app-screen`, a SIBLING of `.app-screen-scroll`
         rather than nested inside it — so the backdrop always covers the
         full screen regardless of the content's current scroll position
         (see the comment on `.app-screen-scroll` below for why the split
         exists at all). -->
    <Transition :name="`sheet-${sheetPosition}`">
      <div
        v-if="openSheet"
        class="sheet-backdrop"
        :class="`sheet-backdrop--${sheetPosition}`"
        :style="{ background: `rgba(0, 0, 0, ${sheetBackdropOpacity})` }"
        @click.self="openSheetId = null"
      >
        <div
          class="sheet-panel"
          :class="[`sheet-panel--${sheetPosition}`, `sheet-panel--size-${sheetSize}`]"
        >
          <div v-if="sheetPosition !== 'center'" class="sheet-handle" />
          <BlockList :blocks="displaySheet?.blocks || []" />
        </div>
      </div>
    </Transition>

    <!-- `requestInput` action (pilier 04) — a quick modal prompt, NOT an
         authored `sheet` block: reuses the exact same backdrop/panel CSS at
         the 'center' position, with a synthesized `form` block as its only
         content instead of BlockList. See `syntheticFormBlock` below. -->
    <Transition name="sheet-center">
      <div
        v-if="syntheticFormBlock"
        class="sheet-backdrop sheet-backdrop--center"
        @click.self="requestInputConfig = null"
      >
        <div class="sheet-panel sheet-panel--center">
          <FormBlock :block="syntheticFormBlock" @submit="requestInputConfig = null" />
        </div>
      </div>
    </Transition>
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
import { collectBlocksOfType } from '@/engine/customApps/appHasModule'
import BlockList from './BlockList.vue'
import FormBlock from './FormBlock.vue'

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

// `sheet` blocks (pilier 03) — a modal that opens from a button's
// `openSheet` action instead of a spot in the normal block flow (BlockList
// skips rendering them inline, see its own comment). Only ONE can be open at
// a time, closing whichever else was open — same "one active thing" spirit
// as `activeScreenId` itself. Scoped to the CURRENT screen's own blocks
// (not the whole app) since a sheet only makes sense to open from the
// screen it's authored on; switching screens always closes it, same reason
// `activeScreenId`'s own reset exists above.
const openSheetId = ref(null)
watch(activeScreenId, () => {
  openSheetId.value = null
})
const screenSheets = computed(() => collectBlocksOfType(currentScreen.value?.blocks, 'sheet'))
const openSheet = computed(
  () => screenSheets.value.find((s) => s.sheetId === openSheetId.value) || null,
)
// `<Transition>` keeps the backdrop's DOM node mounted for the whole leave
// animation, but `openSheet` itself goes null the INSTANT `openSheetId`
// clears — a direct `openSheet.blocks`/`openSheet.position` binding would
// blank out the panel's content and reset its position class mid-animation,
// before the leave transition even finishes. `displaySheet` only updates
// when a sheet actually OPENS, so it keeps pointing at the closing sheet
// throughout its own leave animation instead of flickering to empty.
const displaySheet = ref(null)
watch(openSheet, (s) => {
  if (s) displaySheet.value = s
})
// 'bottom' (default, the original iOS-action-sheet look) / 'center' (a
// plain centered dialog, no drag handle — it isn't a drawer) / 'top' (same
// panel treatment as bottom, mirrored).
const sheetPosition = computed(() => displaySheet.value?.position || 'bottom')
// Backdrop darkness (user request) — 0-100%, default 50 matching the
// original hardcoded `rgba(0, 0, 0, 0.5)`, so an existing saved sheet
// renders unchanged.
const sheetBackdropOpacity = computed(() => {
  const v = displaySheet.value?.opacity
  return (v == null ? 50 : v) / 100
})
// Panel size (user request — "full width, full height, ou full screen"):
// 'auto' (default) keeps the original per-position sizing (edge-to-edge
// width but content-driven height for bottom/top, a small centered card for
// center); the other 3 override width/height/both regardless of position —
// see `.sheet-panel--size-*` below.
const sheetSize = computed(() => displaySheet.value?.size || 'auto')
provide('customAppOpenSheet', (sheetId) => {
  openSheetId.value = sheetId
})
provide('customAppCloseSheet', () => {
  openSheetId.value = null
})

// `requestInput` action (pilier 04) — a quick modal prompt for a single
// value, WITHOUT the author having to build a `sheet` + `form` block combo
// by hand for the common case. `requestInputConfig` is the action's own
// config object ({ label, target, flagKey/inputType or schemaId/entityId/
// fieldKey } — same shape `form` block authoring already uses), turned into
// a real (if synthetic — never part of the authored block tree, never
// saved) `form` block here. Always `commitMode: 'button'` regardless of
// what the config carries: a modal prompt needs an explicit "submit" the
// same way a real dialog does, not a live-writing field that closes on its
// own. Closes on its own FormBlock's `submit` event, or on backdrop tap
// (which just abandons the input, same as closing a `sheet` without
// pressing anything inside it).
const requestInputConfig = ref(null)
watch(activeScreenId, () => {
  requestInputConfig.value = null
})
provide('customAppRequestInput', (config) => {
  requestInputConfig.value = config
})
const syntheticFormBlock = computed(() =>
  requestInputConfig.value
    ? { ...requestInputConfig.value, type: 'form', commitMode: 'button', readonly: false }
    : null,
)

// App theme (`def.theme`, authored in CustomAppEditor.vue's "Thème" panel)
// — a small fixed set of design tokens (7-role palette, a font stack, a
// radius scale, a spacing scale), resolved here into CSS custom properties
// on the screen's own root so every block underneath picks them up through
// normal CSS cascade/inheritance, with ZERO wiring needed in each block
// component beyond swapping a hardcoded literal for `var(--app-*)` — no
// provide()/inject() needed the way `customAppNavigate` needs one, since
// this is purely a styling concern. `theme` is entirely optional — an app
// that never opens its Thème panel gets exactly the literal defaults this
// engine always shipped (primary #4c8bf5, text white, transparent
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
  // `accent` (user request) is renamed `primary` — it was already the
  // de-facto "brand color" every interactive block falls back to (button,
  // badge, header icon, map pin...), `primary` just names that honestly.
  // Reading the legacy `palette.accent` key as a fallback means a project
  // saved before the rename keeps rendering its old color with zero
  // migration; nothing ever writes `.accent` again (see CustomAppEditor.vue's
  // own `primaryColor` computed, which does the same read-old/write-new).
  const primary = palette.primary ?? palette.accent ?? '#4c8bf5'
  // `secondary` (user request) is a second brand-ish role, wired to the one
  // color this engine had left genuinely untheme-able: an avatar with no
  // author-picked color of its own (see AvatarBlock.vue) — previously a
  // literal gray no theme could touch. Default matches that exact former
  // literal, so an app that never sets `secondary` looks byte-for-byte the
  // same as before this role existed.
  const secondary = palette.secondary || '#607d8b'
  return {
    '--app-bg': palette.background || 'transparent',
    '--app-surface': palette.surface || 'rgba(255, 255, 255, 0.06)',
    '--app-text': palette.text || '#ffffff',
    '--app-primary': primary,
    '--app-primary-rgb': hexToRgbTriplet(primary),
    '--app-secondary': secondary,
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
  overflow: hidden;
  background: var(--app-bg);
  color: var(--app-text);
  font-family: var(--app-font);
}

/* The actual scrolling happens here, one level below `.app-screen` itself
   (pilier 03, added for the `sheet` block's backdrop below) — `.app-screen`
   needs to stay a stable, non-scrolling `position: relative` root so the
   backdrop's `inset: 0` always covers the full screen regardless of the
   content's current scroll offset; if the backdrop were a descendant of the
   scrolling element instead, `inset: 0` would resolve against the padding
   box of the SCROLLED content (whatever's currently scrolled out of view
   included), not the visible viewport. Same padding/overflow this single
   element used to carry alone. As a side effect, `screen-background` and a
   root-level `overlay` block now resolve their own absolute positioning
   against THIS non-scrolling element too, so they stay put while the
   content scrolls underneath instead of scrolling away with it — arguably
   the more expected behavior for a background/floating badge anyway.
   `header.sticky`/`footer.sticky` still stick within this same scrolling
   element, which is what `position: sticky` needs — but `position: sticky`
   alone only pins an element once there's enough OTHER content to actually
   scroll past it; on a screen shorter than the phone, a sticky footer used
   to just sit at its natural in-flow position (bug fix, user-reported: "en
   dessous du reste" instead of pinned to the bottom). Making this element a
   flex column and letting its one child (BlockList's own root, see the rule
   below) grow to fill it fixes that: BlockList.vue gives a sticky footer's
   own wrap `margin-top: auto`, which now has a full-height column to push
   against even when the rest of the content is short — and still degrades
   to the exact same scroll+stick behavior once content actually overflows,
   since `flex-grow` has no effect once there's no leftover space to fill. */
.app-screen-scroll {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 16px 24px;
  display: flex;
  flex-direction: column;
}

.app-screen-scroll > .block-list {
  flex: 1 0 auto;
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

.sheet-backdrop {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
}

.sheet-backdrop--bottom {
  align-items: flex-end;
}
.sheet-backdrop--top {
  align-items: flex-start;
}
.sheet-backdrop--center {
  align-items: center;
  padding: 24px;
}

.sheet-panel {
  max-height: 80%;
  overflow-y: auto;
  padding: 8px 16px 24px;
  background: var(--app-bg);
}

.sheet-panel--bottom,
.sheet-panel--top {
  width: 100%;
}
.sheet-panel--bottom {
  border-radius: 20px 20px 0 0;
}
.sheet-panel--top {
  border-radius: 0 0 20px 20px;
}
.sheet-panel--center {
  width: 100%;
  max-width: 320px;
  border-radius: var(--app-radius);
  padding: 16px;
}

/* `size` (user request) — additive overrides on top of the position's own
   base sizing above, `auto` (default) sets none of these and changes
   nothing. `full-width` only visibly affects `center` (bottom/top are
   already edge-to-edge); `full-height` drops the 80% content-driven cap;
   `full-screen` is both together, plus flush corners/no outer gutter since
   a panel covering the whole screen reading as a rounded/inset card would
   look like a bug, not a takeover. */
.sheet-panel--size-full-width {
  max-width: none;
}

.sheet-panel--size-full-height {
  max-height: none;
  height: 100%;
}

.sheet-panel--size-full-screen {
  max-width: none;
  max-height: none;
  width: 100%;
  height: 100%;
  border-radius: 0;
}

.sheet-backdrop:has(.sheet-panel--size-full-screen) {
  padding: 0;
}

.sheet-handle {
  width: 36px;
  height: 4px;
  margin: 0 auto 12px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.25);
}

/* `bottom`/`top` slide the panel off their own edge; `center` fades + scales
   instead, since a plain dialog has no edge to slide toward. All three fade
   the backdrop itself the same way. */
.sheet-bottom-enter-active,
.sheet-bottom-leave-active,
.sheet-top-enter-active,
.sheet-top-leave-active,
.sheet-center-enter-active,
.sheet-center-leave-active {
  transition: opacity 0.18s ease;
}
.sheet-bottom-enter-active .sheet-panel,
.sheet-bottom-leave-active .sheet-panel,
.sheet-top-enter-active .sheet-panel,
.sheet-top-leave-active .sheet-panel {
  transition: transform 0.18s ease;
}
.sheet-center-enter-active .sheet-panel,
.sheet-center-leave-active .sheet-panel {
  transition:
    transform 0.18s ease,
    opacity 0.18s ease;
}

.sheet-bottom-enter-from,
.sheet-bottom-leave-to,
.sheet-top-enter-from,
.sheet-top-leave-to,
.sheet-center-enter-from,
.sheet-center-leave-to {
  opacity: 0;
}
.sheet-bottom-enter-from .sheet-panel,
.sheet-bottom-leave-to .sheet-panel {
  transform: translateY(100%);
}
.sheet-top-enter-from .sheet-panel,
.sheet-top-leave-to .sheet-panel {
  transform: translateY(-100%);
}
.sheet-center-enter-from .sheet-panel,
.sheet-center-leave-to .sheet-panel {
  opacity: 0;
  transform: scale(0.92);
}
</style>
