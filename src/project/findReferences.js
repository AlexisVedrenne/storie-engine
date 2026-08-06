// Scans a loaded project (story.project: {chapters, threads, seed}) for every
// place a contact or thread id is referenced, so the editor can refuse to
// delete something still in use — see docs/story-engine.md for the field
// list this mirrors. Deliberately independent of engine/stores/story.js (a
// Pinia store with its own dependency chain): src/project/ stays a
// dependency-free leaf, usable from a plain confirm-delete flow with no
// store instantiated.
//
// findContact()/findThread() (engine/stores/story.js) fail *silently* on a
// dangling id (return a synthetic stub, never throw) — this scanner exists
// so deleting a contact/thread can't quietly orphan a reference instead.

function pushIfContactUsed(refs, label, id, requires, effects) {
  if (requires?.following && id in requires.following) refs.push(`${label} (condition)`)
  if (effects?.social && id in effects.social) refs.push(`${label} (effet social)`)
  const newFollower = effects?.newFollower
  if (newFollower === id || (Array.isArray(newFollower) && newFollower.includes(id))) {
    refs.push(`${label} (effet newFollower)`)
  }
}

function findContactReferences(project, id) {
  const refs = []

  function walkTimeline(timeline, chapterLabel) {
    ;(timeline || []).forEach((entry, i) => {
      const label = `${chapterLabel} → ${entry.type} #${i + 1}`
      switch (entry.type) {
        case 'message':
          if (entry.contact === id) refs.push(label)
          break
        case 'choice':
          if (entry.contact === id) refs.push(label)
          ;(entry.options || []).forEach((option, j) => {
            const optLabel = `${label} → option ${j + 1}`
            pushIfContactUsed(refs, optLabel, id, option.requires, option.effects)
            walkTimeline(option.then, optLabel)
          })
          break
        case 'dm':
          if (entry.from === id) refs.push(label)
          break
        case 'call':
          if (entry.contact === id) refs.push(label)
          if ((entry.script || []).some((line) => line.from === id)) refs.push(`${label} → script`)
          break
        case 'hallucination':
          if ((entry.messages || []).some((m) => m.from === id)) refs.push(`${label} → messages`)
          break
        case 'fakeTyping':
          if (entry.mode === 'dm') {
            if (entry.from === id) refs.push(label)
          } else if (entry.contact === id) {
            refs.push(label)
          }
          break
        case 'post':
          if (entry.author === id) refs.push(label)
          ;(entry.comments || []).forEach((comment, k) => {
            if (comment.author === id) refs.push(`${label} → commentaire ${k + 1}`)
          })
          break
        case 'reel':
          if (entry.author === id) refs.push(label)
          break
        case 'photo':
          if (entry.from === id) refs.push(label)
          break
        case 'story':
          if (entry.contact === id) refs.push(label)
          break
        default:
          break
      }
      pushIfContactUsed(refs, label, id, entry.requires, entry.effects)
    })
  }

  for (const chapter of project.chapters || []) {
    const label = chapter.title || chapter.id
    ;(chapter.next || []).forEach((link, j) => {
      pushIfContactUsed(refs, `${label} → flèche ${j + 1}`, id, link.requires, undefined)
    })
    walkTimeline(chapter.timeline, label)
  }

  for (const thread of project.threads || []) {
    if ((thread.participants || []).includes(id)) {
      refs.push(`threads.js → ${thread.name || thread.id} (participant)`)
    }
  }

  const seed = project.seed || {}
  for (const [contactId, entries] of Object.entries(seed.messages || {})) {
    if (contactId === id) refs.push(`seed/messages → ${contactId}`)
    ;(entries || []).forEach((entry, k) => {
      if (entry.from === id) refs.push(`seed/messages → ${contactId} (message ${k + 1})`)
    })
  }
  for (const [threadId, entries] of Object.entries(seed.dms || {})) {
    ;(entries || []).forEach((entry, k) => {
      if (entry.from === id) refs.push(`seed/dms → ${threadId} (message ${k + 1})`)
    })
  }
  for (const bucketName of ['posts', 'reels']) {
    ;(seed[bucketName] || []).forEach((post, k) => {
      if (post.author === id) refs.push(`seed/${bucketName} → #${k + 1}`)
      ;(post.comments || []).forEach((comment, ck) => {
        if (comment.author === id)
          refs.push(`seed/${bucketName} → #${k + 1} (commentaire ${ck + 1})`)
      })
    })
  }
  ;(seed.photos || []).forEach((photo, k) => {
    if (photo.from === id) refs.push(`seed/photos → #${k + 1}`)
  })

  return refs
}

function findThreadReferences(project, id) {
  const refs = []

  function walkTimeline(timeline, chapterLabel) {
    ;(timeline || []).forEach((entry, i) => {
      const label = `${chapterLabel} → ${entry.type} #${i + 1}`
      if ((entry.type === 'choice' || entry.type === 'dm') && entry.thread === id) refs.push(label)
      if (entry.type === 'fakeTyping' && entry.mode === 'dm' && entry.thread === id) {
        refs.push(label)
      }
      if (entry.type === 'choice') {
        ;(entry.options || []).forEach((option, j) =>
          walkTimeline(option.then, `${label} → option ${j + 1}`),
        )
      }
    })
  }

  for (const chapter of project.chapters || []) {
    walkTimeline(chapter.timeline, chapter.title || chapter.id)
  }

  for (const threadId of Object.keys((project.seed || {}).dms || {})) {
    if (threadId === id) refs.push(`seed/dms → ${threadId}`)
  }

  return refs
}

// @param project - story.project: {chapters, threads, seed}
// @param target - {type: 'contact'|'thread', id: string}
// @returns string[] human-readable reference locations; [] = safe to delete
export function findReferences(project, target) {
  if (!project) return []
  if (target.type === 'contact') return findContactReferences(project, target.id)
  return findThreadReferences(project, target.id)
}
