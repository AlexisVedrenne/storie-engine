// Collects every French string a project's content actually runs through
// fill()/translateStory() at runtime (engine/stores/story.js) — used to
// drive the i18n editor's "Traduit / Manquant" status per string, instead
// of a blind raw key-value dictionary editor. Deliberately matches the
// REAL fill()/seedFill() call sites, not "what should logically be
// translated" — e.g. live (non-seed) post/reel comments are NOT run
// through fill() in story.js (lines ~807-819), so they're excluded here
// too, even though seed comments (seedFill) ARE included. Pure, no store
// dependency — same leaf-module convention as findReferences.js.

function addChapterStrings(timeline, set) {
  for (const entry of timeline || []) {
    switch (entry.type) {
      case "message":
        if (entry.text) set.add(entry.text);
        break;
      case "story":
        if (entry.caption) set.add(entry.caption);
        break;
      case "dm":
        if (entry.text) set.add(entry.text);
        break;
      case "choice":
        if (entry.prompt) set.add(entry.prompt);
        for (const option of entry.options || []) {
          if (option.text) set.add(option.text);
          addChapterStrings(option.then, set);
        }
        break;
      case "post":
        if (entry.content) set.add(entry.content);
        break;
      case "reel":
        if (entry.caption) set.add(entry.caption);
        break;
      case "photo":
        if (entry.caption) set.add(entry.caption);
        break;
      case "call":
        for (const line of entry.script || []) {
          if (line.text) set.add(line.text);
        }
        break;
      case "timeskip":
        if (entry.label) set.add(entry.label);
        break;
      default:
        break;
    }
  }
}

function addCommonStrings(project, set) {
  for (const contact of project.contacts || []) {
    if (contact.bio) set.add(contact.bio);
  }
  for (const thread of project.threads || []) {
    if (thread.group && thread.name) set.add(thread.name);
  }

  const seed = project.seed || {};
  for (const entries of Object.values(seed.messages || {})) {
    for (const m of entries || []) if (m.text) set.add(m.text);
  }
  for (const entries of Object.values(seed.dms || {})) {
    for (const m of entries || []) if (m.text) set.add(m.text);
  }
  for (const bucketName of ["posts", "reels"]) {
    for (const item of seed[bucketName] || []) {
      const field = bucketName === "posts" ? item.content : item.caption;
      if (field) set.add(field);
      for (const c of item.comments || []) {
        if (c.text) set.add(c.text);
      }
    }
  }
  for (const photo of seed.photos || []) {
    if (photo.caption) set.add(photo.caption);
  }
}

// @param project - story.project: {chapters, contacts, threads, seed}
// @returns {{ common: string[], [chapterId]: string[] }} deduped per bucket
export function extractTranslatableStrings(project) {
  const result = {};

  const commonSet = new Set();
  addCommonStrings(project, commonSet);
  result.common = [...commonSet].sort();

  for (const chapter of project.chapters || []) {
    const set = new Set();
    addChapterStrings(chapter.timeline, set);
    result[chapter.id] = [...set].sort();
  }

  return result;
}
