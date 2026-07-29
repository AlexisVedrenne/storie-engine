// Every Pixly post an author could pick as an event's "which publication"
// filter (EventForm.vue's post.liked match field) — walks every chapter's
// timeline (including nested choice `then` lists) for `post` entries.
//
// A post with no explicit `id` (PostEntryForm.vue's own "Id (optionnel)"
// field) still gets one here, computed the SAME way story.js's
// processEntry does at runtime (`entry.id || `${chapter.id}-post-
// ${timelineIndex}``) — so it's listed and actually matches what
// `post.liked` payloads carry, without requiring every author to remember
// to set an id by hand. `timelineIndex` for a TOP-LEVEL entry is just its
// position in chapter.timeline; for anything nested inside a choice's
// `then` it's whatever the OUTER choice entry's own index was (runThen()
// never advances timelineIndex — see story.js), so several id-less posts
// nested under the very same choice option resolve to the SAME fallback
// id at runtime. That's a pre-existing engine quirk, not introduced here —
// this scan just stays faithful to it rather than inventing a different,
// incorrect id.
//
// Pure, no store dependency — same leaf-module convention as
// validateProject.js's collectAssetPaths.
export function collectPostOptions(project) {
  const seen = new Map() // id -> content (first one found wins)
  function add(id, content) {
    if (!id || seen.has(id)) return
    seen.set(id, content || '')
  }

  function walkTimeline(timeline, chapterId, outerIndex) {
    ;(timeline || []).forEach((entry, i) => {
      // Nested (inside a choice's `then`) entries inherit the outer
      // choice's own index instead of counting their own position —
      // matches runThen() never touching this.timelineIndex.
      const index = outerIndex ?? i
      if (entry.type === 'post') add(entry.id || `${chapterId}-post-${index}`, entry.content)
      if (entry.type === 'choice') {
        for (const option of entry.options || []) walkTimeline(option.then, chapterId, index)
      }
    })
  }
  for (const chapter of project?.chapters || []) walkTimeline(chapter.timeline, chapter.id)

  return [...seen.entries()].map(([id, content]) => ({ id, content }))
}
