// Shared by ChapterGraph.vue (new/duplicated chapters) and EditorPage.vue
// (id regeneration on rename) — a slug of the title, deduped against every
// other chapter id already in use. The id only ever needs to be
// stable+unique (it drives next[].to, the i18n bucket filename,
// __sourceFile...), never something the author reads or types.
export function slugify(text) {
  return (
    text
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'chapter'
  )
}

// `excludeId` leaves the chapter being renamed out of its own collision
// check — otherwise re-slugging a title back to its current id (or a title
// that still slugifies the same) would falsely look taken and bump to
// `-2`.
export function generateChapterId(title, chapters, excludeId = null) {
  const base = slugify(title)
  const existing = new Set(chapters.filter((c) => c.id !== excludeId).map((c) => c.id))
  if (!existing.has(base)) return base
  let n = 2
  while (existing.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}
