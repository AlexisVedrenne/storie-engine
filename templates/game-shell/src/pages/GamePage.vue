<template>
  <q-page class="game-stage flex flex-center">
    <div class="stage-glow-wrap">
      <div class="stage-glow theme-home" :class="{ active: theme === 'home' }" />
      <div class="stage-glow theme-messages" :class="{ active: theme === 'messages' }" />
      <div class="stage-glow theme-social" :class="{ active: theme === 'social' }" />
      <div class="stage-glow theme-gallery" :class="{ active: theme === 'gallery' }" />
      <div class="stage-glow theme-calls" :class="{ active: theme === 'calls' }" />
      <div class="stage-glow theme-settings" :class="{ active: theme === 'settings' }" />
      <div class="stage-glow theme-journal" :class="{ active: theme === 'journal' }" />
    </div>
    <PhoneShell large fill-mobile-viewport />
  </q-page>
</template>

<script setup>
import { computed } from 'vue'
import { useStoryStore } from '../engine/stores/story'
import { usePhoneStore } from '../engine/stores/phone'
import PhoneShell from '../components/phone/PhoneShell.vue'

// Static equivalent of the editor's OpenProjectPage.vue — instead of an IPC
// round-trip to the main process, the project data is assembled entirely
// from files copied into ./project-data/ and public/story-assets/ at build
// time (see storie-engine/docs/phase3-plan.md). Same ordering constraint as
// the editor: story.loadProject() must run synchronously, before <PhoneShell/>
// mounts, so it already knows whether to show the first-boot setup wizard.
import manifest from '../project-data/project.json'
import contacts from '../project-data/contacts.js'
import threads from '../project-data/threads.js'
import gameConfig from '../project-data/game.js'
import seedMessages from '../project-data/seed/messages.js'
import seedDms from '../project-data/seed/dms.js'
import seedPosts from '../project-data/seed/posts.js'
import seedReels from '../project-data/seed/reels.js'
import seedPhotos from '../project-data/seed/photos.js'

// Ported from NTR's own PhonePage.vue — a soft blurred-blob glow behind the
// phone that crossfades to a different palette per currently-open app,
// rather than one flat static background for the whole game.
const phone = usePhoneStore()
const theme = computed(() => phone.currentApp || 'home')

// Chapter reading order is no longer array-position-based — each chapter's
// own `next` (authored graph edges the editor draws as arrows) and
// `manifest.entryChapterId` drive everything the engine actually needs.
// Glob order itself is irrelevant, so no sorting/filtering step is needed
// here at all — every chapter file found just goes in.
const chapterModules = import.meta.glob('../project-data/chapters/**/*.js', { eager: true })
const chapters = Object.values(chapterModules).map((m) => m.default)

// Author-built custom apps (see src-electron/ipc/customApps.js / the
// editor's "Apps" tab) — pure JSON, not JS modules, so this glob just reads
// each file's parsed content directly (import.meta.glob handles .json the
// same way as .js: `{ eager: true }` gives each entry's default export,
// which for a .json file IS the parsed object itself).
const customAppModules = import.meta.glob('../project-data/apps/*.json', { eager: true })
const customApps = Object.values(customAppModules).map((m) => m.default)

const i18nModules = import.meta.glob('../project-data/i18n/*/*.js', { eager: true })
const i18n = {}
for (const [path, mod] of Object.entries(i18nModules)) {
  const match = path.match(/i18n\/([^/]+)\/([^/]+)\.js$/)
  if (!match) continue
  const [, locale, bucket] = match
  i18n[locale] ??= {}
  i18n[locale][bucket] = mod.default
}

const story = useStoryStore()
story.loadProject({
  rootPath: null,
  manifest,
  chapters,
  contacts,
  threads,
  gameConfig,
  seed: {
    messages: seedMessages,
    dms: seedDms,
    posts: seedPosts,
    reels: seedReels,
    photos: seedPhotos
  },
  i18n,
  assetsRoot: 'assets',
  customApps
})

// Resumes a local save if one exists (see story.js's save()/load(),
// window.storieGameSave in electron-preload.js) — must run synchronously,
// right here, before <PhoneShell/> mounts below: PhoneShell decides whether
// to show the first-boot Setup Wizard from story.playerName at its own
// setup() time, so that has to already be resolved by the time it mounts.
story.init()
</script>

<style scoped>
.game-stage {
  /* `fixed` + `inset:0` pins this to the real viewport regardless of the
     default browser body margin, Quasar's own q-layout/q-page-container
     chain, or 100vh's classic mobile quirk (sized against the LARGEST
     possible viewport, taller than what's actually visible once a
     collapsing address bar is accounted for) — any of which could leave
     a few px of this taller than the visible area, which the surrounding
     page would then happily grow to accommodate (page-level scroll on a
     page that's supposed to be a single static screen). `height`/`width`
     kept as a fallback for the (very old) browsers that ignore `inset`. */
  position: fixed;
  inset: 0;
  height: 100dvh;
  width: 100%;
  background: #101018;
  overflow: hidden;
}

.stage-glow-wrap {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.stage-glow {
  position: absolute;
  inset: 0;
  filter: blur(90px);
  opacity: 0;
  transition: opacity 1s ease;
  animation: stage-drift 30s ease-in-out infinite;
}

.stage-glow.active {
  opacity: 0.5;
}

.theme-home {
  background:
    radial-gradient(circle at 20% 20%, #7b5cff 0%, transparent 45%),
    radial-gradient(circle at 80% 15%, #f5576c 0%, transparent 40%),
    radial-gradient(circle at 25% 85%, #1e88e5 0%, transparent 45%),
    radial-gradient(circle at 80% 85%, #ffb300 0%, transparent 40%);
}

.theme-messages {
  background:
    radial-gradient(circle at 25% 20%, #4caf50 0%, transparent 45%),
    radial-gradient(circle at 80% 80%, #1b5e20 0%, transparent 45%);
}

.theme-social {
  background:
    radial-gradient(circle at 20% 15%, #f093fb 0%, transparent 45%),
    radial-gradient(circle at 85% 80%, #f5576c 0%, transparent 45%),
    radial-gradient(circle at 75% 15%, #6228d7 0%, transparent 40%);
}

.theme-gallery {
  background:
    radial-gradient(circle at 20% 20%, #ffb300 0%, transparent 40%),
    radial-gradient(circle at 75% 15%, #f4511e 0%, transparent 40%),
    radial-gradient(circle at 25% 85%, #8e24aa 0%, transparent 40%),
    radial-gradient(circle at 80% 85%, #1e88e5 0%, transparent 40%);
}

.theme-calls {
  background:
    radial-gradient(circle at 25% 20%, #8bc34a 0%, transparent 45%),
    radial-gradient(circle at 80% 80%, #33691e 0%, transparent 45%);
}

.theme-settings {
  background:
    radial-gradient(circle at 25% 20%, #8e8e93 0%, transparent 45%),
    radial-gradient(circle at 80% 80%, #3a3a3f 0%, transparent 45%);
}

.theme-journal {
  background:
    radial-gradient(circle at 25% 20%, #7c4dff 0%, transparent 45%),
    radial-gradient(circle at 80% 80%, #4527a0 0%, transparent 45%);
}

@keyframes stage-drift {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(-3%, 3%) scale(1.06);
  }
}

@media (prefers-reduced-motion: reduce) {
  .stage-glow {
    animation: none;
  }
}
</style>
