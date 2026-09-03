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
      case 'hallucination':
        for (const msg of entry.messages || []) {
          if (msg.text) set.add(msg.text)
        }
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

// Every text field a custom-app block's BlockPropertiesForm.vue offers a
// VariablePickerBtn on (see resolveDynamicText.js) — recurses through
// block.blocks/block.template, same shape as appHasModule.js's
// blocksContainType/collectAssetRefs in src-electron/ipc/customApps.js.
// `conversations` has no static text field of its own to extract (its
// player-facing chrome — empty state, private notice — lives in the
// separate src/i18n/ runtime tree already, not authored per app).
export function addBlockStrings(blocks, set) {
  for (const block of blocks || []) {
    switch (block.type) {
      case 'header':
        if (block.title) set.add(block.title)
        break
      case 'text':
        if (block.content) set.add(block.content)
        break
      case 'avatar':
        if (block.label) set.add(block.label)
        break
      case 'row':
        if (block.label) set.add(block.label)
        if (block.sublabel) set.add(block.sublabel)
        break
      case 'badge':
        if (block.label) set.add(block.label)
        break
      case 'button':
        if (block.label) set.add(block.label)
        break
      case 'tabs':
        for (const tab of block.tabs || []) {
          if (tab.label) set.add(tab.label)
        }
        break
      case 'tabPanel':
        for (const tab of block.tabs || []) {
          if (tab.label) set.add(tab.label)
          if (Array.isArray(tab.blocks)) addBlockStrings(tab.blocks, set)
        }
        break
      case 'map':
        for (const poi of block.pois || []) {
          if (poi.label) set.add(poi.label)
          if (Array.isArray(poi.content)) addBlockStrings(poi.content, set)
        }
        break
    }
    if (Array.isArray(block.blocks)) addBlockStrings(block.blocks, set)
    if (Array.isArray(block.template)) addBlockStrings(block.template, set)
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

  // Custom-app block text — same 'common' bucket as everything else here,
  // since a block isn't tied to any one chapter either (resolveDynamicText.js
  // resolves it through translateStory('common') before token substitution,
  // so the string extracted here — including any {flag:x}/{item:x}/
  // {playerName} tokens, kept verbatim — is exactly the runtime lookup key).
  for (const app of project.customApps || []) {
    for (const screen of app.screens || []) {
      addBlockStrings(screen.blocks, set)
    }
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
// Pure module (see file header) — returns a `key` per group instead of a
// display label, so I18nBucketEditor.vue can run it through the EDITOR's
// own i18n (useEditorI18n) and the group header follows the software's UI
// language, not always French. `app` groups also carry `params` (the real
// app name) for the label's {name} interpolation.
// @param project - story.project: {contacts, threads, seed}
// @returns {{key: string, params?: object, items: string[]}[]} only
// non-empty groups, in a fixed reading order (contacts first, then seed
// content types)
export function extractCommonCategories(project) {
  const groups = []
  function push(key, items, params) {
    const list = [...new Set(items.filter(Boolean))].sort()
    if (list.length) groups.push({ key, params, items: list })
  }

  push(
    'contactNames',
    (project.contacts || []).map((c) => c.name),
  )
  push(
    'contactBios',
    (project.contacts || []).map((c) => c.bio),
  )
  push(
    'groupNames',
    (project.threads || []).filter((t) => t.group).map((t) => t.name),
  )

  // One category per custom app (real name, not a generic "Apps" bucket) —
  // same "surface real project data in pickers/labels" instinct as the
  // rest of this editor (see appDm's own naming fix, docs on custom apps).
  for (const app of project.customApps || []) {
    const texts = new Set()
    for (const screen of app.screens || []) addBlockStrings(screen.blocks, texts)
    push('app', [...texts], { name: app.label || app.id })
  }

  const seed = project.seed || {}
  const seedTexts = (bucketName) =>
    Object.values(seed[bucketName] || {}).flatMap((entries) => (entries || []).map((m) => m.text))
  push('seedMessages', seedTexts('messages'))
  push('seedDms', seedTexts('dms'))

  const postTexts = []
  for (const post of seed.posts || []) {
    if (post.content) postTexts.push(post.content)
    for (const c of post.comments || []) if (c.text) postTexts.push(c.text)
  }
  push('seedPosts', postTexts)

  const reelTexts = []
  for (const reel of seed.reels || []) {
    if (reel.caption) reelTexts.push(reel.caption)
    for (const c of reel.comments || []) if (c.text) reelTexts.push(c.text)
  }
  push('seedReels', reelTexts)

  push(
    'seedPhotos',
    (seed.photos || []).map((p) => p.caption),
  )

  push(
    'chapterTitles',
    (project.chapters || []).map((c) => c.title),
  )
  push(
    'flagLabels',
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
