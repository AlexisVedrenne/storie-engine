// Every photo an author could pick as an event's "which photo" filter
// (EventForm.vue's photo.viewed match field) — walks every chapter's
// timeline (including nested choice `then` lists) for `photo` entries,
// plus project.seed.photos, collecting each one's asset path (`url`) and
// caption. Keyed by `url`, not a runtime id: `url` is always authored,
// stable, and already recognizable to whoever picked that file — a
// photo's id is auto-generated when not set explicitly (see story.js
// processEntry's 'photo' case) and, for anything nested inside a choice's
// `then`, collides with sibling entries under the same choice anyway
// (runThen() never advances timelineIndex), so it's not a usable list key
// regardless. Pure, no store dependency — same leaf-module convention as
// validateProject.js's collectAssetPaths.
export function collectPhotoOptions(project) {
  const seen = new Map() // url -> caption (first one found wins)
  function add(url, caption) {
    if (!url || seen.has(url)) return
    seen.set(url, caption || '')
  }

  function walkTimeline(timeline) {
    for (const entry of timeline || []) {
      if (entry.type === 'photo') add(entry.url, entry.caption)
      if (entry.type === 'choice') {
        for (const option of entry.options || []) walkTimeline(option.then)
      }
    }
  }
  for (const chapter of project?.chapters || []) walkTimeline(chapter.timeline)
  for (const photo of project?.seed?.photos || []) add(photo.url, photo.caption)

  return [...seen.entries()].map(([url, caption]) => ({ url, caption }))
}
