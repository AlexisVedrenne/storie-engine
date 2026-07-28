// Scans a loaded project for broken references and structural chapter
// problems the engine won't catch — findContact()/findThread()
// (engine/stores/story.js) fail *silently* on a bad id (synthetic stub, no
// error), and a chapter dropped from chapterOrder just stops being reachable
// without any warning. Same leaf-module convention as findReferences.js:
// pure, no Pinia store dependency, usable from a plain button handler.

function walkEffectsRequires(refs, requires, effects, label) {
  if (requires?.following) {
    for (const id of Object.keys(requires.following)) refs.push({ kind: "contact", id, label: `${label} (condition)` });
  }
  if (effects?.social) {
    for (const id of Object.keys(effects.social)) refs.push({ kind: "contact", id, label: `${label} (effet social)` });
  }
  const newFollower = effects?.newFollower;
  if (typeof newFollower === "string") {
    refs.push({ kind: "contact", id: newFollower, label: `${label} (effet newFollower)` });
  } else if (Array.isArray(newFollower)) {
    for (const id of newFollower) refs.push({ kind: "contact", id, label: `${label} (effet newFollower)` });
  }
}

// Collects every contact/thread reference found anywhere in the project,
// regardless of whether the target exists — same field list and traversal
// shape as findReferences.js, inverted: that scanner asks "does THIS id
// appear anywhere", this one asks "what does every reference point at".
function collectReferences(project) {
  const refs = [];

  function walkTimeline(timeline, chapterLabel) {
    (timeline || []).forEach((entry, i) => {
      const label = `${chapterLabel} → ${entry.type} #${i + 1}`;
      switch (entry.type) {
        case "message":
          if (entry.contact) refs.push({ kind: "contact", id: entry.contact, label });
          break;
        case "choice":
          if (entry.contact) refs.push({ kind: "contact", id: entry.contact, label });
          if (entry.thread) refs.push({ kind: "thread", id: entry.thread, label });
          (entry.options || []).forEach((option, j) => {
            const optLabel = `${label} → option ${j + 1}`;
            walkEffectsRequires(refs, option.requires, option.effects, optLabel);
            walkTimeline(option.then, optLabel);
          });
          break;
        case "dm":
          if (entry.from) refs.push({ kind: "contact", id: entry.from, label });
          if (entry.thread) refs.push({ kind: "thread", id: entry.thread, label });
          break;
        case "call":
          if (entry.contact) refs.push({ kind: "contact", id: entry.contact, label });
          (entry.script || []).forEach((line, k) => {
            if (line.from) refs.push({ kind: "contact", id: line.from, label: `${label} → script ${k + 1}` });
          });
          break;
        case "post":
          if (entry.author) refs.push({ kind: "contact", id: entry.author, label });
          (entry.comments || []).forEach((c, k) => {
            if (c.author) refs.push({ kind: "contact", id: c.author, label: `${label} → commentaire ${k + 1}` });
          });
          break;
        case "reel":
          if (entry.author) refs.push({ kind: "contact", id: entry.author, label });
          break;
        case "photo":
          if (entry.from) refs.push({ kind: "contact", id: entry.from, label });
          break;
        case "story":
          if (entry.contact) refs.push({ kind: "contact", id: entry.contact, label });
          break;
        default:
          break;
      }
      walkEffectsRequires(refs, entry.requires, entry.effects, label);
    });
  }

  for (const chapter of project.chapters || []) {
    const label = chapter.title || chapter.id;
    if (chapter.requires?.following) {
      for (const id of Object.keys(chapter.requires.following)) {
        refs.push({ kind: "contact", id, label: `${label} → condition de démarrage` });
      }
    }
    walkTimeline(chapter.timeline, label);
  }

  for (const thread of project.threads || []) {
    (thread.participants || []).forEach((id) => {
      refs.push({ kind: "contact", id, label: `threads.js → ${thread.name || thread.id} (participant)` });
    });
  }

  const seed = project.seed || {};
  for (const [contactId, entries] of Object.entries(seed.messages || {})) {
    refs.push({ kind: "contact", id: contactId, label: `seed/messages → ${contactId} (clé)` });
    (entries || []).forEach((e, k) => {
      if (e.from) refs.push({ kind: "contact", id: e.from, label: `seed/messages → ${contactId} (message ${k + 1})` });
    });
  }
  for (const [threadId, entries] of Object.entries(seed.dms || {})) {
    refs.push({ kind: "thread", id: threadId, label: `seed/dms → ${threadId} (clé)` });
    (entries || []).forEach((e, k) => {
      if (e.from) refs.push({ kind: "contact", id: e.from, label: `seed/dms → ${threadId} (message ${k + 1})` });
    });
  }
  for (const bucketName of ["posts", "reels"]) {
    (seed[bucketName] || []).forEach((post, k) => {
      if (post.author) refs.push({ kind: "contact", id: post.author, label: `seed/${bucketName} → #${k + 1}` });
      (post.comments || []).forEach((c, ck) => {
        if (c.author) refs.push({ kind: "contact", id: c.author, label: `seed/${bucketName} → #${k + 1} (commentaire ${ck + 1})` });
      });
    });
  }
  (seed.photos || []).forEach((photo, k) => {
    if (photo.from) refs.push({ kind: "contact", id: photo.from, label: `seed/photos → #${k + 1}` });
  });

  return refs;
}

function contactExists(project, id) {
  return id === "me" || (project.contacts || []).some((c) => c.id === id);
}

// A thread id is also valid if it's a bare contact id — findThread()
// synthesizes an implicit 1:1 thread for any id not found in threads.js.
function threadExists(project, id) {
  return (project.threads || []).some((t) => t.id === id) || contactExists(project, id);
}

// @param project - story.project: {chapters, threads, seed, manifest}
// @returns {{errors: string[], warnings: string[]}}
export function validateProject(project) {
  const errors = [];
  const warnings = [];
  if (!project) return { errors, warnings };

  for (const ref of collectReferences(project)) {
    const ok = ref.kind === "contact" ? contactExists(project, ref.id) : threadExists(project, ref.id);
    if (!ok) {
      const noun = ref.kind === "contact" ? "contact" : "thread";
      errors.push(`${ref.label} → ${noun} introuvable : "${ref.id}"`);
    }
  }

  const chapters = project.chapters || [];
  const chapterIds = new Set(chapters.map((c) => c.id));
  const order = project.manifest?.chapterOrder || [];

  for (const id of order) {
    if (!chapterIds.has(id)) {
      errors.push(`project.json → chapterOrder contient "${id}", aucun fichier chapitre correspondant`);
    }
  }
  for (const chapter of chapters) {
    if (!order.includes(chapter.id)) {
      warnings.push(`Chapitre "${chapter.title || chapter.id}" absent de chapterOrder — ordre de lecture non garanti`);
    }
  }

  const entryId = project.manifest?.entryChapterId;
  if (entryId && !chapterIds.has(entryId)) {
    errors.push(`project.json → entryChapterId "${entryId}" ne correspond à aucun chapitre — le jeu ne démarrera pas`);
  }

  return { errors, warnings };
}

// Collects every asset-relative-path field across the project, deduped by
// path with every referencing location kept as a label — existence isn't
// checked here (no fs access in the renderer); see project:checkAssets IPC.
// @returns {{path: string, labels: string[]}[]}
export function collectAssetPaths(project) {
  const map = new Map();
  function add(assetPath, label) {
    if (!assetPath) return;
    if (!map.has(assetPath)) map.set(assetPath, []);
    map.get(assetPath).push(label);
  }

  for (const contact of project.contacts || []) {
    add(contact.avatar, `${contact.name || contact.id} (avatar)`);
    add(contact.socialAvatar, `${contact.name || contact.id} (avatar Pixly)`);
  }

  function walkTimeline(timeline, chapterLabel) {
    (timeline || []).forEach((entry, i) => {
      const label = `${chapterLabel} → ${entry.type} #${i + 1}`;
      add(entry.image, label);
      add(entry.media, label);
      add(entry.url, label);
      if (entry.type === "choice") {
        (entry.options || []).forEach((option, j) => walkTimeline(option.then, `${label} → option ${j + 1}`));
      }
    });
  }
  for (const chapter of project.chapters || []) walkTimeline(chapter.timeline, chapter.title || chapter.id);

  const seed = project.seed || {};
  for (const [contactId, entries] of Object.entries(seed.messages || {})) {
    (entries || []).forEach((e, k) => add(e.image, `seed/messages → ${contactId} (message ${k + 1})`));
  }
  for (const [threadId, entries] of Object.entries(seed.dms || {})) {
    (entries || []).forEach((e, k) => add(e.image, `seed/dms → ${threadId} (message ${k + 1})`));
  }
  for (const bucketName of ["posts", "reels"]) {
    (seed[bucketName] || []).forEach((post, k) => add(post.image || post.media, `seed/${bucketName} → #${k + 1}`));
  }
  (seed.photos || []).forEach((photo, k) => add(photo.url, `seed/photos → #${k + 1}`));

  return [...map.entries()].map(([path, labels]) => ({ path, labels }));
}
