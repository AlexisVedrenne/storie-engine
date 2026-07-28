import { defineStore } from "pinia";
import { usePhoneStore } from "./phone";
import { i18n, persistLocale } from "@/engine/i18n/instance";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/engine/i18n/locales";
import { playSound, startLoop, stopSound } from "@/engine/utils/sound";

// Phase 1: this store is project-agnostic — it holds no hardcoded chapters/
// contacts/threads/seed/i18n of its own. All of that lives in `state.project`,
// populated at runtime by `loadProject()` (see below) instead of a static
// import graph. This is the mechanical difference from NTR's original
// stores/story.js, which this file is otherwise a direct port of.

// breathing room between two back-to-back "instant" entries (post, photo,
// story, reel, effect) so a burst of them doesn't all land in the same tick.
// message/dm entries already pace themselves via their typing beat.
const PACE_DELAY = 450;

function typingDelay(text) {
  return Math.min(2600, Math.max(650, 350 + (text || "").length * 32));
}

// looks up `frText` (always the French source, since that's what's written
// in the chapters) as a key in the active locale's translation dictionary
// for the given bucket (a chapter id, or 'common' for narrative text that
// isn't tied to any one chapter) — falls back to the French source itself
// when there's no dictionary, no entry, or the entry is still an empty
// stub (not yet translated). `i18nDict` is `project.i18n` (see loadProject).
function resolveStoryText(i18nDict, locale, frText, bucket) {
  if (!frText || locale === "fr-FR") return frText;
  const dict = i18nDict?.[locale]?.[bucket];
  return (dict && dict[frText]) || frText;
}

// converts a seed entry's `daysAgo` into a real ISO timestamp, `daysAgo`
// days before right now — used for seed messages/DMs (see seedInitialContent
// and project.seed), which need a real parseable date (contact-list
// preview time, thread sort order), unlike posts/reels which just show a
// free-form label.
function daysAgoIso(daysAgo) {
  return new Date(Date.now() - (daysAgo ?? 1) * 86400000).toISOString();
}

// French relative-time label for a seed post/reel's `daysAgo` when it
// doesn't provide its own `ts` — mirrors how a real social app would show
// "Hier" / "Il y a 3 j" instead of an exact date.
function relativeLabel(daysAgo) {
  const d = Math.round(daysAgo ?? 1);
  if (d <= 0) return "à l'instant";
  if (d === 1) return "Hier";
  if (d < 7) return `Il y a ${d} j`;
  if (d < 30) return `Il y a ${Math.round(d / 7)} sem`;
  return `Il y a ${Math.round(d / 30)} mois`;
}

// deterministic-but-fake follower/following count, stable per contact id so
// it doesn't jump around on every render — used as a fallback for any
// contact that doesn't define `followers`/`following` in the project's
// contacts.js.
function fakeSocialStat(seed, min, max) {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) % 100000;
  return min + (hash % (max - min));
}

// project-scoped equivalents of NTR's data/story/contacts.js `getContact`
// and data/story/threads.js `getThread` — same fallback behavior, just
// reading from whatever project is currently loaded instead of a static
// module-level array.
function findContact(project, id) {
  return (
    project?.contacts?.find((c) => c.id === id) || {
      id,
      name: id === "me" ? "Moi" : id,
      color: "#999999",
    }
  );
}

function findThread(project, id) {
  const found = project?.threads?.find((t) => t.id === id);
  if (found) return found;
  // implicit 1:1 thread — id is treated as the other participant's contact id
  return { id, name: null, participants: [id], group: false };
}

// display name to use anywhere in the Social app (Pixly) — the `pseudo`
// handle when the contact has one, the real `name` otherwise.
function pseudoHandle(contact) {
  return contact.pseudo ? `@${contact.pseudo}` : contact.name;
}

// Project-wide flag registry (editor only) — scans every chapter for every
// flag name referenced in a `requires`/`effects`, so the editor's flag
// pickers (RequiresBuilder/EffectsBuilder) can offer a dropdown of flags
// already in use instead of forcing free-text everywhere. Purely derived,
// no schema/metadata stored anywhere — a flag is "known" simply by having
// been typed somewhere already.
function addFlagKeys(container, set) {
  if (container?.flags) for (const key of Object.keys(container.flags)) set.add(key);
}
function collectFlagsFromTimeline(timeline, set) {
  for (const entry of timeline || []) {
    addFlagKeys(entry.requires, set);
    if (entry.type === "effect") addFlagKeys(entry.effects, set);
    if (entry.type === "choice") {
      for (const option of entry.options || []) {
        addFlagKeys(option.requires, set);
        addFlagKeys(option.effects, set);
        collectFlagsFromTimeline(option.then, set);
      }
    }
  }
}
function collectAllFlagNames(chapters) {
  const set = new Set();
  for (const chapter of chapters || []) {
    addFlagKeys(chapter.requires, set);
    collectFlagsFromTimeline(chapter.timeline, set);
  }
  return [...set].sort();
}

function defaultState() {
  return {
    project: null, // ProjectData set by loadProject() — see src-electron/ipc/project.js

    started: false,
    playerName: "", // set once via the first-boot setup wizard, empty = not onboarded yet
    playerColor: "", // picked in the same wizard, empty = fall back to project contact 'me' color
    locale: "", // picked in the same wizard (or later in Settings), empty = fall back to DEFAULT_LOCALE
    soundEnabled: true, // Réglages > Sons et vibrations toggle
    soundVolume: 70, // 0-100, same row's volume slider
    flags: {},
    currentChapterId: null,
    timelineIndex: 0,

    messages: {}, // contactId -> [{ id, from, text, ts }]
    unreadCounts: {}, // contactId -> number
    socialDeltas: {}, // contactId -> { followers, following } accumulated via `effects.social`
    followingContacts: {}, // contactId -> true/false, explicit override set by toggleFollow() —
    // absent means "use that contact's `followedByDefault` from the project" (see isFollowing getter)

    feedPosts: [],
    reels: [], // [{ id, author, media, caption, music, likes, comments, ts }]
    photos: [],
    calls: [], // call log (answered/missed)
    pendingCall: null, // call currently ringing, awaiting answer

    likedPosts: {}, // postId -> true, player-driven, persisted (double-tap / heart button)

    stories: [], // [{ id, contact, media?, emoji, bg?, caption, ts }]
    storiesSeen: {}, // storyId -> true

    igThreads: {}, // threadId -> [{ id, from, text?, image?, ts }]  (Instagram-style DMs)
    igUnread: {}, // threadId -> number

    activeChoice: null, // { id, contact, prompt, options } blocking the timeline
    timelineResume: null, // fn to call once the current blocking choice/call is fully resolved —
    // set right before activeChoice/pendingCall; not persisted, same as those (see makeChoice/declineCall/endCall)
    notifications: [], // transient home-screen banners
    typingContact: null, // contactId currently shown as "typing..." in SMS — transient, not saved
    typingDm: null, // { thread, contact } currently shown as "typing..." in Insta DM — transient, not saved
    timeSkipFading: false, // true while the black veil is covering a `timeskip` cut — transient, not saved

    // "phone state" widgets — purely decorative on their own, but the story
    // can drive them via `effects` (see applyEffects) for extra immersion:
    // a storm rolling in, a battery dying at a tense moment, etc.
    weather: {
      city: "Paris",
      temp: 14,
      condition: "Nuageux",
      icon: "🌥️",
      caption: "Nuageux, avec un risque de rester sur ton téléphone.",
    },
    steps: 3482,
    stepsGoal: 6000,
    battery: 43,
    network: { signal: 4, wifi: true }, // signal: 0-4 bars, wifi: on/off
    clockTime: null, // 'HH:MM' override, null = real device time
    clockDate: null, // 'DD/MM/YYYY' override, null = real device date
    clockOffsetMinutes: 0, // minutes added on top of the base time, ticks up as messages/dms land
    messagesSinceTick: 0, // counts up to 5 incoming message/dm entries, then adds a minute and resets
    messagesSinceBatteryTick: 0, // counts up to 5 incoming message/dm entries, then drains 2% and resets
    pendingTimeSkipLabel: null, // set by a `timeskip` entry, shown once on the next lock screen
  };
}

export const useStoryStore = defineStore("story", {
  state: () => defaultState(),

  getters: {
    contactMessages: (state) => (contactId) => state.messages[contactId] || [],
    totalUnread: (state) =>
      Object.values(state.unreadCounts).reduce((a, b) => a + b, 0),
    currentChapter: (state) =>
      (state.project?.chapters ?? []).find((c) => c.id === state.currentChapterId) || null,
    myName: (state) => state.playerName || "Moi",
    myColor: (state) => state.playerColor || findContact(state.project, "me").color,
    activeLocale: (state) => state.locale || DEFAULT_LOCALE,

    // Language picker options for the Setup wizard + Settings — the engine's
    // built-in UI-chrome languages (SUPPORTED_LOCALES, which have real
    // interface translations) plus any locale the currently open project
    // has story content for (story.project.i18n keys), even one not (yet)
    // in SUPPORTED_LOCALES — its narrative text still translates correctly
    // via resolveStoryText's per-string fallback, only the interface itself
    // (menus/buttons) stays in the fallback language for that case.
    availableLocales: (state) => {
      const extra = Object.keys(state.project?.i18n || {}).filter(
        (code) => !SUPPORTED_LOCALES.some((l) => l.code === code),
      );
      return [...SUPPORTED_LOCALES, ...extra.map((code) => ({ code, label: code }))];
    },

    // reads the currently loaded project's contact/thread lists — the
    // project-agnostic replacement for NTR's static `getContact`/`getThread`/
    // `socialHandle` module exports. Components call `story.getContact(id)`
    // etc. the same way they used to call the bare functions.
    getContact: (state) => (id) => findContact(state.project, id),
    getThread: (state) => (id) => findThread(state.project, id),
    socialHandle: () => (contact) => pseudoHandle(contact),
    contactsList: (state) => state.project?.contacts ?? [],
    gameConfig: (state) => state.project?.gameConfig ?? { title: "" },

    // Editor-only: every flag name already used anywhere in the project,
    // alphabetically sorted — see collectAllFlagNames above.
    allFlagNames: (state) => collectAllFlagNames(state.project?.chapters),

    // narrative content (chapters, contacts bios) is always written in
    // French — `bucket` defaults to the current chapter but can be passed
    // explicitly as 'common' for narrative text that isn't tied to any one
    // chapter (e.g. a contact's bio). See resolveStoryText above.
    translateStory: (state) => (frText, bucket = state.currentChapterId) =>
      resolveStoryText(state.project?.i18n, state.locale || DEFAULT_LOCALE, frText, bucket),

    // a phone contact's displayed name (Messages/Calls — not Pixly, which
    // already uses `pseudo`/socialHandle instead) — resolved through the
    // 'common' bucket like bios, so a label like "Maman"/"Papa" translates
    // while a proper noun (Erwan, Mira...) just falls back to itself
    // untouched (no dictionary entry needed for names that don't change).
    contactName: (state) => (id) =>
      resolveStoryText(
        state.project?.i18n,
        state.locale || DEFAULT_LOCALE,
        findContact(state.project, id).name,
        "common",
      ),

    // lets chapter content reference the player's name without knowing it in
    // advance — write `{name}` in any message/dm/call/post/photo text and
    // it's swapped in wherever that text is displayed. Also resolves the
    // text through the active locale's translation dictionary first (see
    // resolveStoryText above) so both mechanisms compose transparently.
    fill: (state) => (text) =>
      text
        ? resolveStoryText(
            state.project?.i18n,
            state.locale || DEFAULT_LOCALE,
            text,
            state.currentChapterId,
          ).replace(/\{name\}/g, state.playerName || "toi")
        : text,

    // combines the real device date/time with whichever of clockTime/
    // clockDate a chapter has overridden (see applyEffects), plus the
    // message-driven drift (clockOffsetMinutes, see tickClock) — a
    // function, not a plain value, so every call reflects the real current
    // instant instead of being cached at whatever moment this getter first
    // ran.
    resolvedClock: (state) => () => {
      const d = new Date();
      if (state.clockDate) {
        const [day, month, year] = state.clockDate.split("/").map(Number);
        d.setFullYear(year, month - 1, day);
      }
      if (state.clockTime) {
        const [h, m] = state.clockTime.split(":").map(Number);
        d.setHours(h, m, 0, 0);
      }
      if (state.clockOffsetMinutes) {
        // setMinutes overflowing past 59 correctly rolls into the next
        // hour/day/month on its own — no manual carry needed.
        d.setMinutes(d.getMinutes() + state.clockOffsetMinutes);
      }
      return d;
    },

    // grouped by contact so the stories bar can show one circle per person
    storiesByContact: (state) => {
      const map = {};
      for (const s of state.stories) {
        if (!map[s.contact]) map[s.contact] = [];
        map[s.contact].push(s);
      }
      return map;
    },

    dmThreadsList: (state) =>
      Object.keys(state.igThreads)
        .filter((id) => state.igThreads[id].length)
        .map((id) => {
          const meta = findThread(state.project, id);
          const msgs = state.igThreads[id];
          const last = msgs[msgs.length - 1];
          return {
            id,
            name: meta.group
              ? resolveStoryText(state.project?.i18n, state.locale || DEFAULT_LOCALE, meta.name, "common")
              : pseudoHandle(findContact(state.project, meta.participants[0])),
            group: meta.group,
            participants: meta.participants,
            preview: last ? last.text || "📷 Photo" : "",
            unread: state.igUnread[id] || 0,
            ts: last ? last.ts : "",
          };
        })
        .sort((a, b) => (a.ts < b.ts ? 1 : -1)),

    totalDmUnread: (state) =>
      Object.values(state.igUnread).reduce((a, b) => a + b, 0),

    // follower/following count for a contact's Social profile: the base
    // value from the project's contacts (or a stable fake one if that
    // contact doesn't define it) plus whatever a chapter has added via
    // `effects.social`.
    socialStats: (state) => (contactId) => {
      const contact = findContact(state.project, contactId);
      const delta = state.socialDeltas[contactId] || {};
      const baseFollowers =
        contact.followers ?? fakeSocialStat(contactId + "f", 80, 4200);
      const baseFollowing =
        contact.following ?? fakeSocialStat(contactId + "g", 30, 600);
      return {
        followers: baseFollowers + (delta.followers || 0),
        following: baseFollowing + (delta.following || 0),
      };
    },

    // whether the player follows this contact — an explicit toggleFollow()
    // override if there is one, otherwise that contact's `followedByDefault`
    // from the project (true unless set to `false`). Drives which posts show
    // in the Fil (see visibleFeedPosts) — the profile grid itself always
    // shows everything regardless, follow only gates the Fil.
    isFollowing: (state) => (contactId) =>
      contactId in state.followingContacts
        ? state.followingContacts[contactId]
        : findContact(state.project, contactId).followedByDefault !== false,

    // the Fil only shows posts from contacts the player follows (plus their
    // own) — a stranger's post is still reachable by visiting their profile
    // directly (e.g. via Découvrir/Recherche), just not pushed into the Fil.
    visibleFeedPosts() {
      return this.feedPosts.filter(
        (p) => p.author === "me" || this.isFollowing(p.author),
      );
    },
  },

  actions: {
    // --- project loading ---------------------------------------------------
    // Replaces every static import point NTR's original store had — called
    // by the editor's OpenProjectPage once storieAPI.loadProject(path) has
    // resolved. Wipes any previously loaded project's live state (switching
    // projects mid-session is just closing one and opening another).
    // Phase 1 has no real persistence, so this is also the only "reset"
    // mechanism the preview needs.
    loadProject(projectData) {
      Object.assign(this, defaultState());
      this.project = projectData;
    },

    // --- lifecycle -------------------------------------------------------
    setPlayerName(name) {
      this.playerName = (name || "").trim();
      this.save();
    },

    setPlayerColor(color) {
      this.playerColor = color || "";
      this.save();
    },

    // switches both the UI (vue-i18n instance) and the narrative content
    // (translateStory/fill, driven by this.locale) at once — called from
    // the setup wizard's language step and from the Settings language row.
    setLocale(code) {
      this.locale = code || "";
      persistLocale(this.activeLocale);
      this.save();
    },

    setSoundEnabled(enabled) {
      this.soundEnabled = Boolean(enabled);
      if (!this.soundEnabled) stopSound("call-ringtone");
      this.save();
    },

    setSoundVolume(volume) {
      this.soundVolume = Math.max(0, Math.min(100, Number(volume) || 0));
      this.save();
    },

    init() {
      if (this.load()) {
        // the chapter that was "finished" when this save happened might not
        // have had a next chapter yet — re-check now in case one was added.
        this.advance();
      }
      // brand-new save: don't start the timeline yet — `{name}` in the very
      // first entries would bake in before the setup wizard even asks for
      // it. PhoneShell calls startIfNeeded() once onboarding is done.
    },

    startIfNeeded() {
      if (this.started) return;
      this.seedInitialContent();
      const entryId = this.project?.manifest?.entryChapterId || this.project?.chapters?.[0]?.id;
      this.startChapter(entryId);
    },

    // populates the phone with "already there" content (project.seed) before
    // the timeline plays its first entry — old SMS/DM history, already-
    // published posts/reels/photos. Runs once per fresh save, right before
    // startChapter(). Pushed directly into state, not through pushMessage/
    // pushDm/processEntry, so none of it bumps an unread badge, pops a
    // notification, or counts toward the clock/battery message drift — it's
    // backlog, not something happening live.
    seedInitialContent() {
      const seed = this.project?.seed || {};
      const seedMessages = seed.messages || {};
      const seedDms = seed.dms || {};
      const seedPosts = seed.posts || [];
      const seedReels = seed.reels || [];
      const seedPhotos = seed.photos || [];

      // seed content isn't tied to any one chapter, so it resolves against
      // the 'common' dictionary bucket (same one used for contact bios)
      // instead of fill()'s default currentChapterId — see translateStory
      // above and docs/story-engine.md §5 (in the NTR docs this ports from).
      const seedFill = (text) =>
        text
          ? this.translateStory(text, "common").replace(/\{name\}/g, this.playerName || "toi")
          : text;

      for (const [contactId, msgs] of Object.entries(seedMessages)) {
        if (!this.messages[contactId]) this.messages[contactId] = [];
        const thread = this.messages[contactId];
        for (const m of msgs) {
          thread.push({
            id: `seed-${contactId}-${thread.length}`,
            from: m.from,
            text: seedFill(m.text) || null,
            image: m.image || null,
            ts: daysAgoIso(m.daysAgo),
          });
        }
      }

      for (const [threadId, msgs] of Object.entries(seedDms)) {
        this.ensureThread(threadId);
        const thread = this.igThreads[threadId];
        for (const m of msgs) {
          thread.push({
            id: `seed-${threadId}-${thread.length}`,
            from: m.from,
            text: seedFill(m.text) || null,
            image: m.image || null,
            ts: daysAgoIso(m.daysAgo),
          });
        }
      }

      // oldest first in the seed file, same reading order as everywhere
      // else — unshift() one at a time so the most recent seed entry ends
      // up on top, exactly like a live `post`/`reel`/`photo` timeline entry.
      for (const p of seedPosts) {
        this.feedPosts.unshift({
          id: p.id || `seed-post-${p.author}-${p.daysAgo}`,
          author: p.author,
          content: seedFill(p.content),
          image: p.image || null,
          likes: p.likes ?? Math.floor(Math.random() * 40) + 5,
          comments: (p.comments || []).map((c) => ({ ...c, text: seedFill(c.text) })),
          // lets a seed post advertise "N commentaires" without writing out
          // N fake comment objects — falls back to comments.length (0) when
          // absent. See PostCard.vue.
          commentsCount: p.commentsCount ?? (p.comments || []).length,
          ts: p.ts || relativeLabel(p.daysAgo),
        });
      }

      for (const r of seedReels) {
        this.reels.unshift({
          id: r.id || `seed-reel-${r.author}-${r.daysAgo}`,
          author: r.author,
          media: r.media,
          caption: seedFill(r.caption) || "",
          music: r.music || "",
          likes: r.likes ?? Math.floor(Math.random() * 200) + 10,
          comments: (r.comments || []).map((c) => ({ ...c, text: seedFill(c.text) })),
          commentsCount: r.commentsCount ?? (r.comments || []).length,
          ts: r.ts || relativeLabel(r.daysAgo),
        });
      }

      for (const p of seedPhotos) {
        this.photos.unshift({
          id: p.id || `seed-photo-${p.from}-${this.photos.length}`,
          from: p.from,
          url: p.url,
          caption: seedFill(p.caption) || "",
        });
      }
    },

    // called by LockScreen right after every unlock (see PhoneShell/
    // LockScreen) — a no-op unless the timeline is actually parked on a
    // `timeskip` entry, in which case this is what resumes it.
    continueAfterTimeSkip() {
      if (this.pendingTimeSkipLabel) {
        this.pendingTimeSkipLabel = null;
        this.save();
      }
      const chapter = this.currentChapter;
      const entry = chapter?.timeline[this.timelineIndex];
      if (!entry || entry.type !== "timeskip") return;
      this.timelineIndex++;
      this.save();
      this.advance();
    },

    startChapter(chapterId) {
      const chapter = (this.project?.chapters ?? []).find((c) => c.id === chapterId);
      if (!chapter) return;
      this.currentChapterId = chapterId;
      this.timelineIndex = 0;
      this.started = true;
      this.advance();
    },

    // --- conditions --------------------------------------------------------
    checkConditions(requires) {
      if (!requires) return true;

      if (requires.flags) {
        const flagsOk = Object.entries(requires.flags).every(
          ([key, expected]) => {
            const value = this.flags[key] || 0;
            if (typeof expected === "boolean") {
              return Boolean(value) === expected;
            }
            if (expected && typeof expected === "object") {
              if ("min" in expected && value < expected.min) return false;
              if ("max" in expected && value > expected.max) return false;
              return true;
            }
            return value === expected;
          },
        );
        if (!flagsOk) return false;
      }

      // { following: { contactId: true|false } } — whether the player
      // currently follows that contact (see isFollowing/toggleFollow). A
      // live, player-driven signal rather than something a narrative choice
      // sets: it can change between the moment this entry is authored and
      // the moment advance() actually reaches it, unlike a flag.
      if (requires.following) {
        const followingOk = Object.entries(requires.following).every(
          ([contactId, expected]) => this.isFollowing(contactId) === expected,
        );
        if (!followingOk) return false;
      }

      return true;
    },

    // --- timeline processing ------------------------------------------------
    advance() {
      const chapter = this.currentChapter;
      if (!chapter) return;

      while (this.timelineIndex < chapter.timeline.length) {
        const entry = chapter.timeline[this.timelineIndex];

        if (!this.checkConditions(entry.requires)) {
          this.timelineIndex++;
          continue;
        }

        // incoming SMS/DM get a "typing..." beat before they land, timed by
        // length — see scheduleMessage/scheduleDm. Index isn't incremented
        // until the timer fires, so a reload mid-typing just re-triggers it.
        if (entry.type === "message") {
          this.scheduleMessage(entry, chapter, () => {
            this.timelineIndex++;
            this.save();
            this.advance();
          });
          return;
        }
        if (entry.type === "dm") {
          this.scheduleDm(entry, chapter, () => {
            this.timelineIndex++;
            this.save();
            this.advance();
          });
          return;
        }
        // same idea as the typing beat above — a short pause before the
        // clock/date actually change and the phone locks, so it reads as a
        // deliberate beat ("the phone is about to skip ahead") instead of
        // an instant cut with no warning.
        if (entry.type === "timeskip") {
          this.scheduleTimeSkip(entry, chapter);
          return;
        }

        this.processEntry(entry, chapter);

        // a choice or a ringing call blocks progress until the player acts.
        // Keep the index pointing AT this entry (don't increment) so that a
        // page reload — which doesn't persist activeChoice/pendingCall —
        // re-presents the same prompt instead of silently skipping it.
        // Save right here too — without this, closing the tab mid-chapter
        // (very common while testing) lost all progress, since save() used
        // to only run once every available chapter was exhausted.
        if (entry.type === "choice" || entry.type === "call") {
          this.timelineResume = () => {
            this.timelineIndex++;
            this.advance();
          };
          this.save();
          return;
        }

        // everything else (post, photo, story, reel, effect) lands instantly
        // but still gets a light pause before the next entry, so a run of
        // them doesn't all appear in the same frame.
        this.timelineIndex++;
        setTimeout(() => this.advance(), PACE_DELAY);
        return;
      }

      // chapter finished — find the next chapter whose `requires` is met.
      // Scans forward past any branch chapters that don't apply (e.g. a
      // "low trust" branch when the player is high-trust) instead of only
      // checking the immediate next slot, so branches can sit side by side
      // in the array without blocking each other.
      const chaptersList = this.project?.chapters ?? [];
      const idx = chaptersList.findIndex((c) => c.id === chapter.id);
      for (let i = idx + 1; i < chaptersList.length; i++) {
        if (this.checkConditions(chaptersList[i].requires)) {
          this.startChapter(chaptersList[i].id);
          return;
        }
      }

      this.save();
    },

    // simulates the contact "typing" before an incoming SMS lands, timed by
    // text length, then hands off to `onDone` — used by both the main
    // timeline loop and `then` reactions so the beat is consistent everywhere.
    scheduleMessage(entry, chapter, onDone) {
      this.typingContact = entry.contact;
      setTimeout(() => {
        this.typingContact = null;
        this.processEntry(entry, chapter);
        onDone();
      }, typingDelay(entry.text));
    },

    // same beat, for an Insta DM — `typingDm` also carries which contact is
    // typing so a group thread can show a name, not just dots.
    scheduleDm(entry, chapter, onDone) {
      if (entry.from === "me") {
        this.processEntry(entry, chapter);
        onDone();
        return;
      }
      this.typingDm = { thread: entry.thread, contact: entry.from };
      setTimeout(() => {
        this.typingDm = null;
        this.processEntry(entry, chapter);
        onDone();
      }, typingDelay(entry.text));
    },

    // a proper film-style time-skip cut, not a blocking `then`/onDone
    // handoff like scheduleMessage/scheduleDm. By default a timeskip stops
    // the timeline until the player unlocks again (see continueAfterTimeSkip)
    // — long pause (the scene lingers) -> fade to black -> clock/date/lock
    // change while hidden behind the veil -> fade back in on the new lock
    // screen, already showing the right time. With `blocking: false`, the
    // last step instead resumes the timeline itself, right behind the veil
    // — the player can unlock whenever, continueAfterTimeSkip is then a
    // no-op since the timeline has already moved past this entry.
    scheduleTimeSkip(entry, chapter) {
      setTimeout(() => {
        this.timeSkipFading = true;
        setTimeout(() => {
          this.processEntry(entry, chapter);
          this.save();
          setTimeout(() => {
            this.timeSkipFading = false;
          }, 350);
          if (entry.blocking === false) {
            this.timelineIndex++;
            this.save();
            this.advance();
          }
        }, 450);
      }, 1400);
    },

    // plays a `then` list one entry at a time (instead of a synchronous
    // for-loop) so that any message/dm inside it gets the same typing beat
    // and pacing as the main timeline. `resume` is what to call once the
    // whole list is done — either back to the main advance() loop for a
    // top-level choice/call, or the next step of an outer `then` list when
    // this one is itself nested inside another choice's `then` (see
    // makeChoice/declineCall/endCall) — nesting can go arbitrarily deep
    // since each level just threads its own `resume` through.
    runThen(list, i, chapter, resume) {
      if (i >= list.length) {
        resume();
        return;
      }
      const entry = list[i];
      if (!this.checkConditions(entry.requires)) {
        this.runThen(list, i + 1, chapter, resume);
        return;
      }
      if (entry.type === "message") {
        this.scheduleMessage(entry, chapter, () =>
          this.runThen(list, i + 1, chapter, resume),
        );
        return;
      }
      if (entry.type === "dm") {
        this.scheduleDm(entry, chapter, () =>
          this.runThen(list, i + 1, chapter, resume),
        );
        return;
      }
      // a nested choice/call blocks just like a top-level one — set the
      // continuation to "carry on with the rest of this `then` list" and
      // stop here until the player answers/hangs up (see makeChoice /
      // declineCall / endCall).
      if (entry.type === "choice" || entry.type === "call") {
        this.processEntry(entry, chapter);
        this.timelineResume = () => this.runThen(list, i + 1, chapter, resume);
        return;
      }
      this.processEntry(entry, chapter);
      setTimeout(() => this.runThen(list, i + 1, chapter, resume), PACE_DELAY);
    },

    processEntry(entry, chapter) {
      switch (entry.type) {
        case "message":
          this.pushMessage(entry.contact, {
            from: entry.contact,
            text: this.fill(entry.text),
            image: entry.image || null,
          });
          this.tickClock();
          this.tickBattery();
          if (!this.isViewingConversation(entry.contact)) {
            this.pushNotification({
              app: "messages",
              contact: entry.contact,
              title: this.contactName(entry.contact),
              text: this.fill(entry.text) || "📷 Photo",
            });
          }
          break;

        case "story":
          // no notification — a friend posting a story isn't worth a banner,
          // only direct communication (message/dm/call) is.
          this.stories.push({
            id: entry.id || `${chapter.id}-story-${this.timelineIndex}`,
            contact: entry.contact,
            media: entry.media || null,
            emoji: entry.emoji || "✨",
            bg: entry.bg || null,
            caption: this.fill(entry.caption) || "",
            ts: entry.ts || "à l'instant",
          });
          break;

        case "dm":
          this.pushDm(entry.thread, {
            from: entry.from,
            text: this.fill(entry.text),
            image: entry.image,
          });
          this.tickClock();
          this.tickBattery();
          break;

        case "choice":
          this.activeChoice = {
            id: entry.id || `${chapter.id}-${this.timelineIndex}`,
            contact: entry.contact || null,
            thread: entry.thread || null,
            prompt: this.fill(entry.prompt),
            // an option can have its own `requires` to only offer it under
            // certain flags (e.g. only if the player already knows Mira) —
            // filtered out here, before the remaining options' `text` (what's
            // shown on the button) gets translated; `effects`/`then` are
            // consumed later as-is by makeChoice/runThen.
            options: entry.options
              .filter((o) => this.checkConditions(o.requires))
              .map((o) => ({ ...o, text: this.fill(o.text) })),
          };
          break;

        case "post":
          // no notification — same reasoning as `story`.
          this.feedPosts.unshift({
            id: entry.id || `${chapter.id}-post-${this.timelineIndex}`,
            author: entry.author,
            content: this.fill(entry.content),
            image: entry.image || null,
            likes: entry.likes ?? Math.floor(Math.random() * 40) + 5,
            comments: entry.comments || [],
            commentsCount: entry.commentsCount ?? (entry.comments || []).length,
            ts: entry.ts || "à l'instant",
          });
          break;

        case "reel":
          // no notification — same reasoning as `story`/`post`.
          this.reels.unshift({
            id: entry.id || `${chapter.id}-reel-${this.timelineIndex}`,
            author: entry.author,
            media: entry.media,
            caption: this.fill(entry.caption) || "",
            music: entry.music || "",
            likes: entry.likes ?? Math.floor(Math.random() * 200) + 10,
            comments: entry.comments || [],
            commentsCount: entry.commentsCount ?? (entry.comments || []).length,
            ts: entry.ts || "à l'instant",
          });
          break;

        case "photo":
          this.photos.unshift({
            id: entry.id || `${chapter.id}-photo-${this.timelineIndex}`,
            from: entry.from,
            url: entry.url,
            caption: this.fill(entry.caption) || "",
          });
          break;

        case "call":
          this.pendingCall = {
            id: entry.id || `${chapter.id}-call-${this.timelineIndex}`,
            contact: entry.contact,
            script: (entry.script || []).map((line) => ({
              ...line,
              text: this.fill(line.text),
            })),
          };
          this.pushNotification({
            app: "calls",
            contact: entry.contact,
            title: this.contactName(entry.contact),
            text: i18n.global.t("calls.incomingNotification"),
          });
          startLoop("call-ringtone");
          break;

        case "effect":
          this.applyEffects(entry.effects);
          break;

        case "timeskip": {
          // an ellipsis that can happen anywhere in a chapter, not just
          // between two — locks the phone right here. By default this also
          // blocks the timeline (see scheduleTimeSkip) until the player
          // unlocks it again, same as walking back in after time has
          // actually passed. `blocking: false` skips that wait — the
          // timeline keeps playing behind the lock screen instead, so life
          // (new messages, calls...) goes on whether the player checks the
          // phone or not.
          const clockEffects = {};
          if ("clock" in entry) clockEffects.clock = entry.clock;
          if ("date" in entry) clockEffects.date = entry.date;

          // battery drain proportional to how much time the skip actually
          // covers (-1% per 30min) — only computable if a clock/date
          // reference already existed before this entry, otherwise there's
          // no "before" to diff against (e.g. the very first timeskip that
          // ever sets the clock).
          const hadClockRef = Boolean(this.clockTime || this.clockDate);
          const before = hadClockRef ? this.resolvedClock() : null;

          if (Object.keys(clockEffects).length) this.applyEffects(clockEffects);

          if (before && Object.keys(clockEffects).length) {
            const elapsedMinutes = Math.round(
              (this.resolvedClock().getTime() - before.getTime()) / 60000,
            );
            const drain = Math.floor(elapsedMinutes / 30);
            if (drain > 0) {
              const prev = this.battery;
              this.battery = Math.max(0, this.battery - drain);
              this.checkLowBattery(prev);
            }
          }

          this.pendingTimeSkipLabel = this.fill(entry.label) || null;
          usePhoneStore().lock();
          break;
        }

        default:
          console.warn("[story] unknown timeline entry type:", entry.type);
      }
    },

    // --- player actions ---------------------------------------------------
    makeChoice(optionIndex) {
      if (!this.activeChoice) return;
      const option = this.activeChoice.options[optionIndex];
      if (!option) return;

      const chapter = this.currentChapter;

      // option.text is already resolved (translation + {name}) — it was
      // filled once when the choice was set up in processEntry, so the
      // button the player saw and the message they end up sending match.
      if (this.activeChoice.thread) {
        this.pushDm(this.activeChoice.thread, {
          from: "me",
          text: option.text,
        });
      } else {
        this.pushMessage(this.activeChoice.contact, {
          from: "me",
          text: option.text,
        });
      }
      if (option.effects) this.applyEffects(option.effects);

      this.activeChoice = null;
      const resume = this.timelineResume;
      this.timelineResume = null;
      this.runThen(option.then || [], 0, chapter, resume);
    },

    answerCall() {
      if (!this.pendingCall) return;
      const call = this.pendingCall;
      stopSound("call-ringtone");
      playSound("call-accept");
      this.calls.unshift({
        id: call.id,
        contact: call.contact,
        type: "answered",
        ts: "à l'instant",
        script: call.script,
      });
      this.dismissNotificationsFor({ app: "calls", contact: call.contact });
      return call;
    },

    declineCall() {
      if (!this.pendingCall) return;
      stopSound("call-ringtone");
      playSound("call-end");
      this.calls.unshift({
        id: this.pendingCall.id,
        contact: this.pendingCall.contact,
        type: "missed",
        ts: "à l'instant",
        script: [],
      });
      this.dismissNotificationsFor({
        app: "calls",
        contact: this.pendingCall.contact,
      });
      this.pendingCall = null;
      const resume = this.timelineResume;
      this.timelineResume = null;
      resume();
    },

    endCall() {
      playSound("call-end");
      this.pendingCall = null;
      const resume = this.timelineResume;
      this.timelineResume = null;
      resume();
    },

    markRead(contactId) {
      this.unreadCounts[contactId] = 0;
      this.dismissNotificationsFor({ app: "messages", contact: contactId });
    },

    // --- social (Instagram-style) actions ----------------------------------
    // player-authored post from the "Créer" flow — not timeline-driven, so it
    // isn't gated by `requires`/flags, it's a direct action the player took.
    addOwnPost({ image, caption, filter }) {
      this.feedPosts.unshift({
        id: `me-post-${Date.now()}`,
        author: "me",
        content: caption || "",
        image: image || null,
        imageFilter: filter || null,
        likes: 0,
        comments: [],
        ts: "à l'instant",
      });
      this.save();
    },

    toggleLike(postId) {
      this.likedPosts[postId] = !this.likedPosts[postId];
      if (this.likedPosts[postId]) playSound("social-like");
      this.save();
    },

    toggleFollow(contactId) {
      this.followingContacts[contactId] = !this.isFollowing(contactId);
      this.save();
    },

    markStorySeen(storyId) {
      this.storiesSeen[storyId] = true;
    },

    ensureThread(threadId) {
      if (!this.igThreads[threadId]) this.igThreads[threadId] = [];
    },

    markDmRead(threadId) {
      this.igUnread[threadId] = 0;
      this.dismissNotificationsFor({ app: "social", thread: threadId });
    },

    // --- internals ---------------------------------------------------------
    // true while the player already has that exact conversation open on
    // screen — an incoming message there shouldn't bump the unread badge or
    // pop a notification banner for something they're already looking at.
    isViewingConversation(contactId) {
      const phone = usePhoneStore();
      return (
        phone.currentApp === "messages" &&
        phone.activeConversation === contactId
      );
    },

    isViewingDmThread(threadId) {
      const phone = usePhoneStore();
      return phone.currentApp === "social" && phone.activeDmThread === threadId;
    },

    pushMessage(contactId, { from, text, image }) {
      if (!this.messages[contactId]) this.messages[contactId] = [];
      this.messages[contactId].push({
        id: `${contactId}-${this.messages[contactId].length}`,
        from,
        text,
        image: image || null,
        ts: this.resolvedClock().toISOString(),
      });
      // the bubble sound plays unconditionally, unlike the unread badge/
      // notification banner below — a message landing while you're already
      // looking at that exact thread still deserves a sound (that's the
      // whole point of a receive/send tone), it just doesn't need a banner
      // for something already on screen.
      playSound(from === "me" ? "sms-send" : "sms-receive");
      if (from !== "me" && !this.isViewingConversation(contactId)) {
        this.unreadCounts[contactId] = (this.unreadCounts[contactId] || 0) + 1;
      }
    },

    pushDm(threadId, { from, text, image }) {
      this.ensureThread(threadId);
      const thread = this.igThreads[threadId];
      thread.push({
        id: `${threadId}-${thread.length}`,
        from,
        text: text || null,
        image: image || null,
        ts: this.resolvedClock().toISOString(),
      });
      playSound(from === "me" ? "social-send" : "dm-receive");
      if (from === "me") return;

      if (!this.isViewingDmThread(threadId)) {
        this.igUnread[threadId] = (this.igUnread[threadId] || 0) + 1;
        const meta = this.getThread(threadId);
        this.pushNotification({
          app: "social",
          thread: threadId,
          title: meta.group ? this.translateStory(meta.name, "common") : this.socialHandle(this.getContact(from)),
          text: text || "📷 Photo",
        });
      }
    },

    pushNotification(notif) {
      this.notifications.unshift({
        id: `${Date.now()}-${Math.random()}`,
        ...notif,
      });
      if (this.notifications.length > 5) this.notifications.length = 5;

      // messages/DM already play their receive tone unconditionally from
      // pushMessage/pushDm (that fires even with the thread open, this
      // banner doesn't) — only the new-follower ping (app: 'social', no
      // `thread`, not routed through pushMessage/pushDm at all) needs one
      // here. 'calls' plays nothing — the incoming call gets the looping
      // ringtone instead (see processEntry's 'call' case).
      if (notif.app === "social" && !notif.thread) playSound("social-new-follower");
    },

    applyEffects(effects) {
      if (!effects) return;

      if (effects.flags) {
        for (const [key, delta] of Object.entries(effects.flags)) {
          // booleans are SET (true -> 1, false -> 0), not accumulated — this
          // makes one-shot "unlocked or not" flags safe even if the same
          // effect fires more than once. Numbers keep accumulating, for
          // counters/stats like trust that should build up over choices.
          if (typeof delta === "boolean") {
            this.flags[key] = delta ? 1 : 0;
          } else {
            this.flags[key] = (this.flags[key] || 0) + delta;
          }
        }
      }

      // Phone-state widgets — set directly (not accumulated), only the
      // fields you pass are changed, the rest of the object is left alone.
      if (effects.weather) {
        Object.assign(this.weather, effects.weather);
      }
      if (typeof effects.steps === "number") {
        this.steps = effects.steps;
      }
      if (typeof effects.stepsGoal === "number") {
        this.stepsGoal = effects.stepsGoal;
      }
      // a manual battery value is the author asserting the current level (a
      // charge, a check-in) — reset the passive drain counter so it doesn't
      // immediately ding a couple points off a value just set on purpose.
      if (typeof effects.battery === "number") {
        const prev = this.battery;
        this.battery = Math.max(0, Math.min(100, effects.battery));
        this.messagesSinceBatteryTick = 0;
        this.checkLowBattery(prev);
      }
      if (effects.network) {
        Object.assign(this.network, effects.network);
      }
      // "clock"/"date" in effects (not just truthy) lets `{ clock: null }` /
      // `{ date: null }` explicitly clear that override and fall back to
      // the real device value — independently of one another, see
      // resolvedClock() above. Either one resets the message-driven drift
      // too: the author is asserting the current moment, so it shouldn't
      // start the scene already a few minutes off from what they set.
      if ("clock" in effects) {
        this.clockTime = effects.clock; // 'HH:MM' or null
        this.clockOffsetMinutes = 0;
        this.messagesSinceTick = 0;
      }
      if ("date" in effects) {
        this.clockDate = effects.date; // 'DD/MM/YYYY' or null
        this.clockOffsetMinutes = 0;
        this.messagesSinceTick = 0;
      }

      // { social: { <contactId>: { followers?: delta, following?: delta } } }
      // — added on top of that contact's base count (see socialStats getter),
      // same accumulate-don't-replace behavior as numeric flags.
      if (effects.social) {
        for (const [contactId, delta] of Object.entries(effects.social)) {
          if (!this.socialDeltas[contactId]) {
            this.socialDeltas[contactId] = { followers: 0, following: 0 };
          }
          if (typeof delta.followers === "number") {
            this.socialDeltas[contactId].followers += delta.followers;
          }
          if (typeof delta.following === "number") {
            this.socialDeltas[contactId].following += delta.following;
          }
        }
      }

      // { newFollower: 'contactId' } or { newFollower: ['id1', 'id2'] } —
      // the reverse of `social`: a contact starts following the *player's*
      // own account. Bumps the player's own follower count by one per id
      // (same accumulation as `social.me.followers`, just without having to
      // spell that out) and pushes a notification, like a real "X started
      // following you" ping — see isFollowing for the other direction (the
      // player following a contact, which gates the Fil instead).
      if (effects.newFollower) {
        const ids = Array.isArray(effects.newFollower)
          ? effects.newFollower
          : [effects.newFollower];
        for (const id of ids) {
          if (!this.socialDeltas.me) {
            this.socialDeltas.me = { followers: 0, following: 0 };
          }
          this.socialDeltas.me.followers += 1;
          this.pushNotification({
            app: "social",
            contact: id,
            title: this.socialHandle(this.getContact(id)),
            text: i18n.global.t("social.newFollowerNotification"),
          });
        }
      }
    },

    // +1 minute of narrative drift every 5 incoming message/dm entries —
    // small enough to feel like time is actually passing during a
    // conversation without being distracting. Reset whenever a chapter
    // pins the clock/date explicitly (see applyEffects above).
    tickClock() {
      this.messagesSinceTick++;
      if (this.messagesSinceTick >= 3) {
        this.messagesSinceTick = 0;
        this.clockOffsetMinutes++;
      }
    },

    // passive battery drain from actually using the phone — -2% every 5
    // incoming message/dm entries. Reset whenever a chapter pins the battery
    // explicitly (see applyEffects above), same idea as the clock drift.
    tickBattery() {
      this.messagesSinceBatteryTick++;
      if (this.messagesSinceBatteryTick >= 5) {
        this.messagesSinceBatteryTick = 0;
        const prev = this.battery;
        this.battery = Math.max(0, this.battery - 2);
        this.checkLowBattery(prev);
      }
    },

    // one ping the instant the battery actually crosses under 20%, not a
    // repeat every tick while it stays below — `prev` is the value just
    // before the mutation that's already landed by the time this runs.
    checkLowBattery(prev) {
      if (prev >= 20 && this.battery < 20) playSound("system-low-battery");
    },

    dismissNotification(id) {
      this.notifications = this.notifications.filter((n) => n.id !== id);
    },

    // clears any lock-screen notification matching a given app + contact/
    // thread — called wherever the player actually reads/handles that
    // conversation or call, so the lock screen never keeps advertising
    // something that's no longer unread.
    dismissNotificationsFor({ app, contact, thread }) {
      this.notifications = this.notifications.filter(
        (n) =>
          n.app !== app ||
          (contact !== undefined && n.contact !== contact) ||
          (thread !== undefined && n.thread !== thread),
      );
    },

    // --- persistence ---------------------------------------------------------
    // Phase 1: the editor preview is entirely in-memory, reset via
    // loadProject() whenever a project is (re)opened — no localStorage
    // round-trip. Kept as no-ops (rather than removed) so every call site
    // above (save() after each mutation, etc.) doesn't need touching; a real
    // save/load story (per-project slots) is out of scope for phase 1.
    save() {},

    load() {
      return false;
    },

    resetSave() {
      Object.assign(this, defaultState());
    },
  },
});
