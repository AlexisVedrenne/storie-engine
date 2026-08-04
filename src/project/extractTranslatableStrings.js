// Collects every French string a project's content actually runs through
// fill()/translateStory() at runtime (engine/stores/story.js) — used to
// drive the i18n editor's "Traduit / Manquant" status per string, instead
// of a blind raw key-value dictionary editor. Deliberately matches the
// REAL fill()/seedFill() call sites, not "what should logically be
// translated" — e.g. live (non-seed) post/reel comments are NOT run
// through fill() in story.js (lines ~807-819), so they're excluded here
// too, even though seed comments (seedFill) ARE included. Pure, no store
// dependency — same leaf-module convention as findReferences.js.

import { CUSTOM_ENTRY_TYPE_BY_TYPE } from '@/engine/apps/entryTypeRegistry'

function addChapterStrings(timeline, set) {
  for (const entry of timeline || []) {
    switch (entry.type) {
      case 'message':
        if (entry.text) set.add(entry.text)
        break
      case 'story':
        if (entry.caption) set.add(entry.caption)
        break
      case 'dm':
        if (entry.text) set.add(entry.text)
        break
      case 'appDm':
        if (entry.text) set.add(entry.text)
        break
      case 'choice':
        if (entry.prompt) set.add(entry.prompt)
        for (const option of entry.options || []) {
          if (option.text) set.add(option.text)
          addChapterStrings(option.then, set)
        }
        break
      case 'post':
        if (entry.content) set.add(entry.content)
        break
      case 'reel':
        if (entry.caption) set.add(entry.caption)
        break
      case 'photo':
        if (entry.caption) set.add(entry.caption)
        break
      case 'call':
        for (const line of entry.script || []) {
          if (line.text) set.add(line.text)
        }
        break
      case 'timeskip':
        if (entry.label) set.add(entry.label)
        break
      default: {
        // Additive fallback for plug-in entry types (see
        // src/engine/apps/entryTypeRegistry.js) — only reached for a type
        // none of the cases above matches.
        const customType = CUSTOM_ENTRY_TYPE_BY_TYPE[entry.type]
        if (customType?.extractText) {
          for (const text of customType.extractText(entry) || []) {
            if (text) set.add(text)
          }
        }
        break
      }
    }
  }
}

function addCommonStrings(project, set) {
  for (const contact of project.contacts || []) {
    // Matches story.js's contactName getter, which resolves a contact's
    // display name (Messages/Appels — not Pixly, which uses `pseudo`
    // instead) through the 'common' bucket too, same as `bio` — a
    // translated name (e.g. "Maman" -> "Mom") was previously never
    // extracted, so it always showed up as a false "unused" orphan.
    if (contact.name) set.add(contact.name)
    if (contact.bio) set.add(contact.bio)
  }
  // Also covers a `conversations` custom-app block's group threads — those
  // are the SAME project.threads entries, reused via story.getThread(), not
  // a separate per-app bucket (see blockKinds.js/ConversationsBlock.vue).
  for (const thread of project.threads || []) {
    if (thread.group && thread.name) set.add(thread.name)
  }

  const seed = project.seed || {}
  for (const entries of Object.values(seed.messages || {})) {
    for (const m of entries || []) if (m.text) set.add(m.text)
  }
  for (const entries of Object.values(seed.dms || {})) {
    for (const m of entries || []) if (m.text) set.add(m.text)
  }
  for (const bucketName of ['posts', 'reels']) {
    for (const item of seed[bucketName] || []) {
      const field = bucketName === 'posts' ? item.content : item.caption
      if (field) set.add(field)
      for (const c of item.comments || []) {
        if (c.text) set.add(c.text)
      }
    }
  }
  for (const photo of seed.photos || []) {
    if (photo.caption) set.add(photo.caption)
  }

  // Chapter titles and flag labels aren't tied to any one chapter's own
  // bucket (a title names the chapter itself, a flag label is project-wide)
  // — both go through translateStory's 'common' bucket at runtime (see the
  // journal app, src/components/apps/journal/App.vue), same as contact
  // names/bios above.
  for (const chapter of project.chapters || []) {
    if (chapter.title) set.add(chapter.title)
  }
  for (const flag of Object.values(project.gameConfig?.flags || {})) {
    if (flag?.label) set.add(flag.label)
  }
}

// Same French strings as extractTranslatableStrings(project).common, just
// organized by where each one comes from instead of one flat alphabetical
// list — the "commun" bucket mixes contact names/bios, group thread names,
// and every seed sub-type, which becomes unreadable past a few dozen
// entries with no origin marker at all.
// @param project - story.project: {contacts, threads, seed}
// @returns {{label: string, items: string[]}[]} only non-empty groups, in a
// fixed reading order (contacts first, then seed content types)
export function extractCommonCategories(project) {
  const groups = []
  function push(label, items) {
    const list = [...new Set(items.filter(Boolean))].sort()
    if (list.length) groups.push({ label, items: list })
  }

  push(
    'Noms des contacts',
    (project.contacts || []).map((c) => c.name),
  )
  push(
    'Bios des contacts',
    (project.contacts || []).map((c) => c.bio),
  )
  push(
    'Noms de groupes',
    (project.threads || []).filter((t) => t.group).map((t) => t.name),
  )

  const seed = project.seed || {}
  const seedTexts = (bucketName) =>
    Object.values(seed[bucketName] || {}).flatMap((entries) => (entries || []).map((m) => m.text))
  push('Messages (contenu initial)', seedTexts('messages'))
  push('DM (contenu initial)', seedTexts('dms'))

  const postTexts = []
  for (const post of seed.posts || []) {
    if (post.content) postTexts.push(post.content)
    for (const c of post.comments || []) if (c.text) postTexts.push(c.text)
  }
  push('Posts (contenu initial)', postTexts)

  const reelTexts = []
  for (const reel of seed.reels || []) {
    if (reel.caption) reelTexts.push(reel.caption)
    for (const c of reel.comments || []) if (c.text) reelTexts.push(c.text)
  }
  push('Reels (contenu initial)', reelTexts)

  push(
    'Photos (contenu initial)',
    (seed.photos || []).map((p) => p.caption),
  )

  push(
    'Titres de chapitres',
    (project.chapters || []).map((c) => c.title),
  )
  push(
    'Libellés de flags',
    Object.values(project.gameConfig?.flags || {}).map((f) => f?.label),
  )

  return groups
}

// @param project - story.project: {chapters, contacts, threads, seed}
// @returns {{ common: string[], [chapterId]: string[] }} deduped per bucket
export function extractTranslatableStrings(project) {
  const result = {}

  const commonSet = new Set()
  addCommonStrings(project, commonSet)
  result.common = [...commonSet].sort()

  for (const chapter of project.chapters || []) {
    const set = new Set()
    addChapterStrings(chapter.timeline, set)
    result[chapter.id] = [...set].sort()
  }

  return result
}
