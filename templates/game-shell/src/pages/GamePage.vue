<template>
  <q-page class="game-stage flex flex-center">
    <PhoneShell />
  </q-page>
</template>

<script setup>
import { useStoryStore } from '../engine/stores/story'
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

// Chapters matched by `id`, not by file path — sidesteps any glob-ordering
// ambiguity, consistent with how the editor's main process resolves
// `project.json`'s chapterOrder (see src-electron/ipc/project.js).
const chapterModules = import.meta.glob('../project-data/chapters/**/*.js', { eager: true })
const allChapters = Object.values(chapterModules).map((m) => m.default)
const chapters = (manifest.chapterOrder || [])
  .map((id) => allChapters.find((c) => c.id === id))
  .filter(Boolean)

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
  assetsRoot: 'assets'
})
</script>

<style scoped>
.game-stage {
  height: 100vh;
  width: 100%;
  background: #101018;
  overflow: hidden;
}
</style>
