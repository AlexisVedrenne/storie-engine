import { defineStore } from 'pinia'
import { usePhoneStore } from './phone'
import { i18n, persistLocale } from '@/engine/i18n/instance'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/engine/i18n/locales'
import {
  playSound,
  startLoop,
  stopSound,
  playMusic,
  stopMusic as stopMusicPlayback,
  setMusicMuted,
  updateMusicVolume,
} from '@/engine/utils/sound'
import { ENTRY_TYPE_APP } from '@/engine/apps/appIds'
import { orderedAppList } from '@/engine/apps/appOrder'
import { APP_REGISTRY } from '@/engine/apps/registry'
import { CUSTOM_ENTRY_TYPE_BY_TYPE } from '@/engine/apps/entryTypeRegistry'
import { findScreenWithBlockType } from '@/engine/customApps/appHasModule'
import { resolveDynamicText } from '@/engine/customApps/resolveDynamicText'
import { activeSlotPlace } from '@/engine/customApps/scheduleSlot'
import CustomAppRenderer from '@/components/phone/customApps/CustomAppRenderer.vue'
import {
  on as onEngineEvent,
  clear as clearEngineEvents,
  emit as emitEngineEvent,
  ENGINE_TRIGGERS,
} from '@/engine/events/eventManager'
import { findMatchingEvents } from '@/engine/events/matchEvent'

// Polls evaluateAutomations() every 15s (same cadence as StatusBar.vue's own
// clock display) — restarted on every loadProject() alongside the engine-
// event resubscription just below. Needed because a condition can become
// true purely from TIME passing (a schedule field's active slot changing)
// with no accompanying flag/entity mutation to hang off of; every other
// automation trigger path already goes through applyEffects() and doesn't
// need this. Module-level, not component-scoped: automations are global
// game logic, not tied to whichever phone screen happens to be mounted.
let automationPollTimer = null

// Phase 1: this store is project-agnostic — it holds no hardcoded chapters/
// contacts/threads/seed/i18n of its own. All of that lives in `state.project`,
// populated at runtime by `loadProject()` (see below) instead of a static
// import graph. This is the mechanical difference from NTR's original
// stores/story.js, which this file is otherwise a direct port of.

// breathing room between two back-to-back "instant" entries (post, photo,
// story, reel, effect) so a burst of them doesn't all land in the same tick.
// message/dm entries already pace themselves via their typing beat.
const PACE_DELAY = 450

function typingDelay(text) {
  return Math.min(2600, Math.max(650, 350 + (text || '').length * 32))
}

// looks up `frText` (always the French source, since that's what's written
// in the chapters) as a key in the active locale's translation dictionary
// for the given bucket (a chapter id, or 'common' for narrative text that
// isn't tied to any one chapter) — falls back to the French source itself
// when there's no dictionary, no entry, or the entry is still an empty
// stub (not yet translated). `i18nDict` is `project.i18n` (see loadProject).
function resolveStoryText(i18nDict, locale, frText, bucket) {
  if (!frText || locale === 'fr-FR') return frText
  const dict = i18nDict?.[locale]?.[bucket]
  return (dict && dict[frText]) || frText
}

// converts a seed entry's `daysAgo` into a real ISO timestamp, `daysAgo`
// days before right now — used for seed messages/DMs (see seedInitialContent
// and project.seed), which need a real parseable date (contact-list
// preview time, thread sort order), unlike posts/reels which just show a
// free-form label.
function daysAgoIso(daysAgo) {
  return new Date(Date.now() - (daysAgo ?? 1) * 86400000).toISOString()
}

// French relative-time label for a seed post/reel's `daysAgo` when it
// doesn't provide its own `ts` — mirrors how a real social app would show
// "Hier" / "Il y a 3 j" instead of an exact date.
function relativeLabel(daysAgo) {
  const d = Math.round(daysAgo ?? 1)
  if (d <= 0) return "à l'instant"
  if (d === 1) return 'Hier'
  if (d < 7) return `Il y a ${d} j`
  if (d < 30) return `Il y a ${Math.round(d / 7)} sem`
  return `Il y a ${Math.round(d / 30)} mois`
}

// deterministic-but-fake follower/following count, stable per contact id so
// it doesn't jump around on every render — used as a fallback for any
// contact that doesn't define `followers`/`following` in the project's
// contacts.js.
function fakeSocialStat(seed, min, max) {
  let hash = 0
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) % 100000
  return min + (hash % (max - min))
}

// project-scoped equivalents of NTR's data/story/contacts.js `getContact`
// and data/story/threads.js `getThread` — same fallback behavior, just
// reading from whatever project is currently loaded instead of a static
// module-level array.
function findContact(project, id) {
  return (
    project?.contacts?.find((c) => c.id === id) || {
      id,
      name: id === 'me' ? 'Moi' : id,
      color: '#999999',
    }
  )
}

function findThread(project, id) {
  const found = project?.threads?.find((t) => t.id === id)
  if (found) return found
  // implicit 1:1 thread — id is treated as the other participant's contact id
  return { id, name: null, participants: [id], group: false }
}

// display name to use anywhere in the Social app (Pixly) — the `pseudo`
// handle when the contact has one, the real `name` otherwise.
function pseudoHandle(contact) {
  return contact.pseudo ? `@${contact.pseudo}` : contact.name
}

function defaultState() {
  return {
    project: null, // ProjectData set by loadProject() — see src-electron/ipc/project.js

    started: false,
    playerName: '', // set once via the first-boot setup wizard, empty = not onboarded yet
    playerColor: '', // picked in the same wizard, empty = fall back to project contact 'me' color
    locale: '', // picked in the same wizard (or later in Settings), empty = fall back to DEFAULT_LOCALE
    soundEnabled: true, // Réglages > Sons et vibrations toggle
    soundVolume: 70, // 0-100, same row's volume slider
    musicVolume: 70, // 0-100, dedicated slider under the same screen — layered on top of soundVolume (see sound.js's playMusic), not a replacement for it, so a player who wants SFX loud but music quiet (or off) has that as its own control
    // Chapter ids of every ending (a chapter with no valid outgoing edge,
    // see advance()) reached at least once this playthrough — real
    // progress, persisted like visitedChapterIds. The Journal app's
    // "Fins" tab reads this against every ending chapter in the project to
    // show a "X/Y débloquées" count without spoiling ones not yet reached
    // (see App.vue's own comment on that tab).
    unlockedEndings: [],
    flags: {},
    // A "collection" flag — same authoring concept as a regular flag
    // (created/labeled in the Flags panel, referenced by key), but holding
    // a key->value map instead of a single number, since story.flags[key]
    // is assumed to be numeric EVERYWHERE it's read (requires/effects/
    // {flag:x} tokens/range computation) — mixing shapes into that one
    // bucket would silently break all of those. `story.flagCollections[key]
    // ] = { itemKey: string|number }` — add sets a key (auto-generated if
    // the author leaves it blank, so a growing history/log never collides
    // on itself), remove deletes one. See applyEffects()'s `effects.
    // collections` and checkConditions()'s `requires.collections` below.
    flagCollections: {},
    // Typed instances of an author-defined entity SCHEMA (see
    // `game.entitySchemas`, edited in the Schémas tab — EntitySchemaList.vue/
    // EntitySchemaForm.vue) — `story.entities[schemaId][entityId] = { field:
    // value, ... }`. Sits one level above flagCollections: a collection is a
    // flat key->value map (assumed a single scalar per entry everywhere it's
    // read); an entity has several NAMED, typed fields per instance (a
    // character with a location and a routine, an item with a price and a
    // quantity) — nothing else in the engine models "more than one field per
    // record", so this is deliberately its own bucket rather than overloading
    // flagCollections' value with an object. See applyEffects()'s
    // `effects.entities` below and entityItems getter (used by `list`
    // blocks with `source: 'entity'`, see ListBlock.vue).
    entities: {},
    // Per-automation runtime bookkeeping (see game.automations, edited in
    // the Données tab's Automatisations sub-tab, and evaluateAutomations()
    // below) — `{ [automationId]: { active: bool, firedCount: number } }`.
    // `active` remembers which side of the rule's condition it was on last
    // check, so firing is edge-triggered (false->true only), never repeated
    // every re-check while it stays true. Real save data, not transient —
    // "already fired" (for a 'once' rule) must survive a reload.
    automationState: {},
    currentChapterId: null,
    timelineIndex: 0,
    // Ordered, deduped chapter ids reached this playthrough (first-visit
    // order) — drives the Journal app's story-so-far view (see
    // src/components/apps/journal/App.vue). Nothing else in the engine
    // reads this; purely a player-facing breadcrumb, no gameplay effect.
    visitedChapterIds: [],

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

    // Per-custom-app-scoped twin of igThreads/igUnread above — the
    // `conversations` custom-app block (src/components/phone/customApps/
    // ConversationsBlock.vue) reads/writes these instead, so a custom app's
    // own in-fiction chat never shares threads with native Messages/DM or
    // with another custom app's chat. Same 1:1-or-group shape as the native
    // DM system (a 1:1 thread id is just the contact id, no definition
    // needed; a GROUP thread's id/name/participants are authored on the
    // `conversations` block itself — block.threads — since there's no
    // per-app equivalent of threads.js). See the 'appDm' entry type /
    // pushAppMessage() below.
    appThreads: {}, // appId -> threadId -> [{ id, from, text?, image?, ts }]
    appUnread: {}, // appId -> threadId -> number

    activeChoice: null, // { id, contact, prompt, options } blocking the timeline
    timelineResume: null, // fn to call once the current blocking choice/call is fully resolved —
    // set right before activeChoice/pendingCall; not persisted, same as those (see makeChoice/declineCall/endCall)

    // Choice/call entries queued instead of shown, because the phone was
    // already busy with another one when they tried to present — e.g. an
    // Event's reaction (story.js handleEngineEvent) firing while the main
    // chapter timeline already has its own choice/call on screen. Each item
    // is { entry, chapter, resume }; see presentBlockingEntry()/
    // presentNextQueuedInteraction() below. Not persisted — `resume` is a
    // closure, can't survive a reload anyway (same reason timelineResume
    // isn't saved either).
    pendingInteractions: [],

    // { interactionId, steps, background, blocking, onWin, onLose } while an
    // `interaction` entry's overlay is showing on the phone screen —
    // transient, not persisted (same reasoning as activeChoice/pendingCall:
    // a reload just re-presents it via advance() re-reaching the same
    // timelineIndex, for a blocking one; a non-blocking one simply doesn't
    // resume on reload, same as any other in-flight cosmetic state here).
    // See processEntry's 'interaction' case and finishInteraction().
    activeInteraction: null,
    // See processEntry's 'hallucination' case and finishHallucination() —
    // { messages, exitEffect, blocking }, shown by HallucinationPlayer.vue.
    // Never touches real thread state (see that component's own comment),
    // so unlike activeChoice/pendingCall there's nothing to "resume" on
    // reload — a page reload mid-hallucination just re-triggers this same
    // entry from scratch via processEntry, same as activeInteraction.
    activeHallucination: null,
    notifications: [], // transient home-screen banners
    typingContact: null, // contactId currently shown as "typing..." in SMS — transient, not saved
    typingDm: null, // { thread, contact } currently shown as "typing..." in Pixly DM — transient, not saved
    typingAppDm: null, // { app, thread, contact } currently shown as "typing..." in a custom app's conversation block — transient, not saved
    timeSkipFading: false, // true while the black veil is covering a `timeskip` cut — transient, not saved
    screenEffect: null, // { kind, id } while a `vfx` entry's overlay is showing on the phone screen — transient, not saved; see triggerScreenEffect
    nowPlaying: null, // { title } while a `music` entry's track is actually playing — transient, not saved; see startMusic. HomeWidgets.vue reads this for the home screen's music widget
    // { title, text, image } once advance() runs out of a valid outgoing
    // edge on the current chapter (see advance()'s own comment — no
    // next[], or none whose requires currently holds) — EndScreen.vue reads
    // this. Transient, not saved: re-derived by advance() itself every time
    // (including on resume, which always re-runs it once — see loadSlot()'s
    // own comment on why), from chapter.endScreen (author-set in the editor,
    // see ChapterEndScreenForm.vue) or {} for the generic fallback screen.
    activeEnding: null,

    // "phone state" widgets — purely decorative on their own, but the story
    // can drive them via `effects` (see applyEffects) for extra immersion:
    // a storm rolling in, a battery dying at a tense moment, etc.
    weather: {
      city: 'Paris',
      temp: 14,
      condition: 'Nuageux',
      icon: '🌥️',
      caption: 'Nuageux, avec un risque de rester sur ton téléphone.',
    },
    steps: 3482,
    stepsGoal: 6000,
    battery: 43,
    network: { signal: 4, wifi: true }, // signal: 0-4 bars, wifi: on/off

    // Free-form namespace for plug-in entry types (see
    // src/engine/apps/entryTypeRegistry.js) to read/write their own state —
    // e.g. an "email" entry type keeps `customData.emails`. Persisted like
    // everything else here (not in NON_PERSISTED_KEYS below); a plug-in
    // author is responsible for keeping whatever they put here JSON-safe.
    customData: {},
    clockTime: null, // 'HH:MM' override, null = real device time
    clockDate: null, // 'DD/MM/YYYY' override, null = real device date
    clockOffsetMinutes: 0, // minutes added on top of the base time, ticks up as messages/dms land
    messagesSinceTick: 0, // counts up to 5 incoming message/dm entries, then adds a minute and resets
    messagesSinceBatteryTick: 0, // counts up to 5 incoming message/dm entries, then drains 2% and resets
    pendingTimeSkipLabel: null, // set by a `timeskip` entry, shown once on the next lock screen
    timeSkipToast: null, // set once by continueAfterTimeSkip() when entry.landApp is set — TimeSkipToast.vue shows+clears it, transient like timeSkipFading
    actionToast: null, // set by triggerActionToast() (custom-app button toast/guard) — AppToast.vue shows+clears it, same transient shape as timeSkipToast

    // Which of the 3 fixed save slots this session is writing into — set by
    // loadSlot() once the player picks one on SlotPickerScreen.vue. Session
    // meta, not game content: persisting it INSIDE a slot's own snapshot
    // would be circular (and pointless — a slot's own file position already
    // says which slot it is). See NON_PERSISTED_KEYS below.
    activeSlotId: null,
  }
}

// Fields explicitly marked above as transient/not-persisted, plus `project`
// itself (static per-launch data, reloaded fresh every time — see
// loadProject()'s own comment) — everything else in defaultState() is real
// player progress and goes in the save file (see save()/load() below).
// One-shot local cache of the 3 save slots' raw bundle (see
// loadSlotsSummary()/loadSlot() below) — plain module-scope variable, not
// Pinia state, since it doesn't need to be reactive or ever persisted.
let slotsCache = null

const NON_PERSISTED_KEYS = new Set([
  'project',
  'pendingInteractions',
  'activeChoice',
  'timelineResume',
  'pendingCall',
  'activeInteraction',
  'activeHallucination',
  'notifications',
  'typingContact',
  'typingDm',
  'typingAppDm',
  'timeSkipFading',
  'timeSkipToast',
  'actionToast',
  'screenEffect',
  'nowPlaying',
  'activeEnding',
  'activeSlotId',
])

export const useStoryStore = defineStore('story', {
  state: () => defaultState(),

  getters: {
    contactMessages: (state) => (contactId) => state.messages[contactId] || [],
    // Flattened for a `list` block's `source: 'flagCollection'` (see
    // ListBlock.vue) — plain insertion order (JS objects with string keys
    // always iterate in insertion order), oldest item first.
    collectionItems: (state) => (flagKey) =>
      Object.entries(state.flagCollections[flagKey] || {}).map(([key, value]) => ({ key, value })),
    // Flattened for a `list` block's `source: 'entity'` (see ListBlock.vue) —
    // each item is `{ id, ...fields }` so `{item:<fieldKey>}` tokens
    // (resolveDynamicText.js) read straight off it, same shape a contact or
    // a collection item already has. Insertion order, oldest first, same as
    // collectionItems above.
    entityItems: (state) => (schemaId) =>
      Object.entries(state.entities[schemaId] || {}).map(([id, fields]) => ({ id, ...fields })),
    totalUnread: (state) => Object.values(state.unreadCounts).reduce((a, b) => a + b, 0),
    currentChapter: (state) =>
      (state.project?.chapters ?? []).find((c) => c.id === state.currentChapterId) || null,
    myName: (state) => state.playerName || 'Moi',
    myColor: (state) => state.playerColor || findContact(state.project, 'me').color,
    activeLocale: (state) => state.locale || DEFAULT_LOCALE,

    // Language picker options for the Setup wizard + Settings — restricted
    // to DEFAULT_LOCALE (the source language chapters are actually written
    // in, never itself a project.i18n entry) plus whatever locale the
    // author explicitly added to THIS project (LocaleList.vue's "+ Nouvelle
    // langue" -> project.i18n keys). A locale merely existing in the
    // engine's own SUPPORTED_LOCALES catalog (real interface translation
    // available) is NOT enough on its own — offering it here before the
    // project's actual narrative content has any translation for it would
    // let a player pick a language where the UI chrome is translated but
    // every message/choice/chapter title silently falls back to French,
    // a half-translated experience worse than not offering the choice at
    // all. A project.i18n code outside SUPPORTED_LOCALES (no interface
    // translation yet) is still offered — its narrative text still
    // translates correctly via resolveStoryText's per-string fallback,
    // only the interface itself (menus/buttons) stays in the fallback
    // language for that case.
    availableLocales: (state) => {
      const added = new Set(Object.keys(state.project?.i18n || {}))
      const known = SUPPORTED_LOCALES.filter((l) => l.code === DEFAULT_LOCALE || added.has(l.code))
      const extra = [...added].filter((code) => !SUPPORTED_LOCALES.some((l) => l.code === code))
      return [...known, ...extra.map((code) => ({ code, label: code }))]
    },

    // reads the currently loaded project's contact/thread lists — the
    // project-agnostic replacement for NTR's static `getContact`/`getThread`/
    // `socialHandle` module exports. Components call `story.getContact(id)`
    // etc. the same way they used to call the bare functions.
    getContact: (state) => (id) => findContact(state.project, id),
    getThread: (state) => (id) => findThread(state.project, id),
    socialHandle: () => (contact) => pseudoHandle(contact),
    contactsList: (state) => state.project?.contacts ?? [],
    gameConfig: (state) => state.project?.gameConfig ?? { title: '' },

    // Every built-in app, in the project's custom order if it's saved one
    // (GameForm.vue's draggable Applications panel writes game.appOrder) —
    // includes disabled apps too, since the panel itself needs to show and
    // reorder those as well. See appOrder.js's own comment.
    // Built-in apps (APP_REGISTRY, code-defined) plus this project's own
    // author-built custom apps (story.project.customApps, JSON-defined —
    // see src-electron/ipc/customApps.js / docs on the "Apps" editor tab),
    // normalized to the same shape so every existing consumer (this
    // store's own orderedApps/enabledAppIds, PhoneShell.vue, HomeScreen.vue,
    // SetupWizard.vue, GameForm.vue) treats them identically. `component` is
    // the SAME shared CustomAppRenderer instance for every custom app, one
    // generic interpreter driven by that app's own block data at render
    // time — same precedent as InteractionPlayer.vue for interactions.
    mergedAppRegistry: (state) => [
      ...APP_REGISTRY,
      ...(state.project?.customApps || []).map((app) => ({
        id: app.id,
        label: app.label,
        icon: app.icon,
        color: app.color,
        badge: () => 0,
        component: CustomAppRenderer,
      })),
    ],

    orderedApps() {
      return orderedAppList(this.mergedAppRegistry, this.project?.gameConfig?.appOrder)
    },

    // Which built-in phone apps this project ships with, in display order —
    // `disabledApps` is an explicit opt-out list (same "absent = default"
    // convention as contact.hasSocial/followedByDefault), not an opt-in one,
    // so every project created before this feature existed keeps showing
    // all 5 apps with zero migration needed.
    enabledAppIds(state) {
      const disabled = state.project?.gameConfig?.disabledApps || []
      return this.orderedApps.map((app) => app.id).filter((id) => !disabled.includes(id))
    },

    // narrative content (chapters, contacts bios) is always written in
    // French — `bucket` defaults to the current chapter but can be passed
    // explicitly as 'common' for narrative text that isn't tied to any one
    // chapter (e.g. a contact's bio). See resolveStoryText above.
    translateStory:
      (state) =>
      (frText, bucket = state.currentChapterId) =>
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
        'common',
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
          ).replace(/\{name\}/g, state.playerName || 'toi')
        : text,

    // combines the real device date/time with whichever of clockTime/
    // clockDate a chapter has overridden (see applyEffects), plus the
    // message-driven drift (clockOffsetMinutes, see tickClock) — a
    // function, not a plain value, so every call reflects the real current
    // instant instead of being cached at whatever moment this getter first
    // ran.
    resolvedClock: (state) => () => {
      const d = new Date()
      if (state.clockDate) {
        const [day, month, year] = state.clockDate.split('/').map(Number)
        d.setFullYear(year, month - 1, day)
      }
      if (state.clockTime) {
        const [h, m] = state.clockTime.split(':').map(Number)
        d.setHours(h, m, 0, 0)
      }
      if (state.clockOffsetMinutes) {
        // setMinutes overflowing past 59 correctly rolls into the next
        // hour/day/month on its own — no manual carry needed.
        d.setMinutes(d.getMinutes() + state.clockOffsetMinutes)
      }
      return d
    },

    // grouped by contact so the stories bar can show one circle per person
    storiesByContact: (state) => {
      const map = {}
      for (const s of state.stories) {
        if (!map[s.contact]) map[s.contact] = []
        map[s.contact].push(s)
      }
      return map
    },

    dmThreadsList: (state) =>
      Object.keys(state.igThreads)
        .filter((id) => state.igThreads[id].length)
        .map((id) => {
          const meta = findThread(state.project, id)
          const msgs = state.igThreads[id]
          const last = msgs[msgs.length - 1]
          return {
            id,
            name: meta.group
              ? resolveStoryText(
                  state.project?.i18n,
                  state.locale || DEFAULT_LOCALE,
                  meta.name,
                  'common',
                )
              : pseudoHandle(findContact(state.project, meta.participants[0])),
            group: meta.group,
            participants: meta.participants,
            preview: last ? last.text || '📷 Photo' : '',
            unread: state.igUnread[id] || 0,
            ts: last ? last.ts : '',
          }
        })
        .sort((a, b) => (a.ts < b.ts ? 1 : -1)),

    totalDmUnread: (state) => Object.values(state.igUnread).reduce((a, b) => a + b, 0),

    // Per-app twin of dmThreadsList — deliberately returns only id/preview/
    // unread/ts, NOT name/group/participants: those come from block.threads
    // (authored on the `conversations` block itself, see blockKinds.js),
    // which this store has no access to. ConversationsBlock.vue enriches
    // each row with its own block's thread defs (or the implicit 1:1
    // fallback) after reading this.
    appThreadsList: (state) => (appId) =>
      Object.keys(state.appThreads[appId] || {})
        .filter((id) => state.appThreads[appId][id].length)
        .map((id) => {
          const msgs = state.appThreads[appId][id]
          const last = msgs[msgs.length - 1]
          return {
            id,
            preview: last ? last.text || '📷 Photo' : '',
            unread: state.appUnread[appId]?.[id] || 0,
            ts: last ? last.ts : '',
          }
        })
        .sort((a, b) => (a.ts < b.ts ? 1 : -1)),

    appThreadMessages: (state) => (appId, threadId) => state.appThreads[appId]?.[threadId] || [],

    // follower/following count for a contact's Social profile: the base
    // value from the project's contacts (or a stable fake one if that
    // contact doesn't define it) plus whatever a chapter has added via
    // `effects.social`.
    socialStats: (state) => (contactId) => {
      const contact = findContact(state.project, contactId)
      const delta = state.socialDeltas[contactId] || {}
      const baseFollowers = contact.followers ?? fakeSocialStat(contactId + 'f', 80, 4200)
      const baseFollowing = contact.following ?? fakeSocialStat(contactId + 'g', 30, 600)
      return {
        followers: baseFollowers + (delta.followers || 0),
        following: baseFollowing + (delta.following || 0),
      }
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
      return this.feedPosts.filter((p) => p.author === 'me' || this.isFollowing(p.author))
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
      this.stopMusic() // a previous project's track must never bleed into the next one
      Object.assign(this, defaultState())
      this.project = projectData

      // clear() first — without it, reopening/reloading a project (or the
      // editor's live preview re-running this on every save) would stack a
      // fresh set of subscriptions on top of the previous ones, and an
      // authored reaction would fire once per accumulated reload instead of
      // once per real event.
      clearEngineEvents()
      for (const trigger of ENGINE_TRIGGERS) {
        onEngineEvent(trigger, (payload) => this.handleEngineEvent(trigger, payload))
      }

      clearInterval(automationPollTimer)
      automationPollTimer = setInterval(() => this.evaluateAutomations(), 15000)
    },

    // Reacts to an engine-emitted trigger (eventManager.js) by running
    // whichever authored entries in game.events matched it — reuses
    // checkConditions/applyEffects/runThen exactly as any built-in timeline
    // entry would, per docs/roadmap-modular-apps-events.md §5 ("ne crée pas
    // un deuxième système narratif"). `game.events[]` shape: { trigger,
    // match?, requires?, effects?, then? } — `match` is an optional shallow
    // filter on the trigger's payload (see matchEvent.js).
    //
    // Known limitation: a `then` entry here that blocks (choice/call) sets
    // `this.timelineResume` the same way a top-level blocking entry does —
    // if the MAIN timeline is also currently blocked on its own choice/call
    // when this fires, one would silently clobber the other. Fine for this
    // first cut (keep event reactions to non-blocking entries: message/dm/
    // post/photo/story/reel/effect/custom types); not solved generically yet.
    handleEngineEvent(trigger, payload) {
      const chapter = this.currentChapter
      const events = this.project?.gameConfig?.events
      for (const evt of findMatchingEvents(events, trigger, payload)) {
        if (!this.checkConditions(evt.requires)) continue
        if (evt.effects) this.applyEffects(evt.effects)
        if (evt.then?.length) this.runThen(evt.then, 0, chapter, () => {})
      }
    },

    // --- lifecycle -------------------------------------------------------
    setPlayerName(name) {
      this.playerName = (name || '').trim()
      this.save()
    },

    setPlayerColor(color) {
      this.playerColor = color || ''
      this.save()
    },

    // switches both the UI (vue-i18n instance) and the narrative content
    // (translateStory/fill, driven by this.locale) at once — called from
    // the setup wizard's language step and from the Settings language row.
    setLocale(code) {
      this.locale = code || ''
      persistLocale(this.activeLocale)
      this.save()
    },

    setSoundEnabled(enabled) {
      this.soundEnabled = Boolean(enabled)
      if (!this.soundEnabled) stopSound('call-ringtone')
      // Pauses/resumes rather than stop/restart — nowPlaying is left as-is
      // either way, muting doesn't change what's conceptually playing, just
      // whether it's audible (see setMusicMuted's own comment).
      setMusicMuted(!this.soundEnabled)
      this.save()
    },

    setSoundVolume(volume) {
      this.soundVolume = Math.max(0, Math.min(100, Number(volume) || 0))
      updateMusicVolume() // live, not just on the music's next play() — see that function's own comment
      this.save()
    },

    setMusicVolume(volume) {
      this.musicVolume = Math.max(0, Math.min(100, Number(volume) || 0))
      updateMusicVolume()
      this.save()
    },

    // Fetches all 3 save slots' summaries (sync IPC, see electron-main.js's
    // game-save:loadAll) for SlotPickerScreen.vue's preview cards — doesn't
    // touch live state, just caches the raw bundle for loadSlot() below to
    // read from a moment later once the player actually picks one. Plain
    // module-scope variable, not Pinia state — this is a one-shot local
    // cache, not something that needs to be reactive or ever persisted.
    loadSlotsSummary() {
      if (!window.storieGameSave) return { slot1: null, slot2: null, slot3: null }
      slotsCache = window.storieGameSave.loadAll()
      return slotsCache
    },

    // Called once the player picks a card on SlotPickerScreen.vue. Mirrors
    // what init() used to do (load + advance if resuming), scoped to one
    // slot: capture `project` (static per-launch data, never part of a
    // slot's own snapshot), wipe back to defaultState(), restore `project`,
    // set `activeSlotId` so save() knows where to write from now on, then
    // apply the slot's own snapshot if it had one. A brand-new save (empty
    // slot) deliberately does NOT call advance() — `{name}` in the very
    // first entries would bake in before the setup wizard even asks for it;
    // PhoneShell.vue calls startIfNeeded() once onboarding is done, same as
    // before this feature existed.
    loadSlot(slotId) {
      const bundle = slotsCache || this.loadSlotsSummary()
      const snapshot = bundle?.[slotId] || null
      const project = this.project
      this.stopMusic() // the slot being left behind must never keep playing into the new one
      Object.assign(this, defaultState())
      this.project = project
      this.activeSlotId = slotId
      if (snapshot) {
        Object.assign(this, snapshot)
        // the chapter that was "finished" when this save happened might not
        // have had a next chapter yet — re-check now in case one was added.
        this.advance()
      }
    },

    deleteSlot(slotId) {
      if (!window.storieGameSave) return
      window.storieGameSave.deleteSlot(slotId)
      if (slotsCache) slotsCache[slotId] = null
    },

    startIfNeeded() {
      if (this.started) return
      this.seedInitialContent()
      const entryId = this.project?.manifest?.entryChapterId || this.project?.chapters?.[0]?.id
      this.startChapter(entryId)
    },

    // populates the phone with "already there" content (project.seed) before
    // the timeline plays its first entry — old SMS/DM history, already-
    // published posts/reels/photos. Runs once per fresh save, right before
    // startChapter(). Pushed directly into state, not through pushMessage/
    // pushDm/processEntry, so none of it bumps an unread badge, pops a
    // notification, or counts toward the clock/battery message drift — it's
    // backlog, not something happening live.
    seedInitialContent() {
      const seed = this.project?.seed || {}
      const seedMessages = seed.messages || {}
      const seedDms = seed.dms || {}
      const seedPosts = seed.posts || []
      const seedReels = seed.reels || []
      const seedPhotos = seed.photos || []

      // seed content isn't tied to any one chapter, so it resolves against
      // the 'common' dictionary bucket (same one used for contact bios)
      // instead of fill()'s default currentChapterId — see translateStory
      // above and docs/story-engine.md §5 (in the NTR docs this ports from).
      const seedFill = (text) =>
        text
          ? this.translateStory(text, 'common').replace(/\{name\}/g, this.playerName || 'toi')
          : text

      for (const [contactId, msgs] of Object.entries(seedMessages)) {
        if (!this.messages[contactId]) this.messages[contactId] = []
        const thread = this.messages[contactId]
        for (const m of msgs) {
          thread.push({
            id: `seed-${contactId}-${thread.length}`,
            from: m.from,
            text: seedFill(m.text) || null,
            image: m.image || null,
            ts: daysAgoIso(m.daysAgo),
          })
        }
      }

      for (const [threadId, msgs] of Object.entries(seedDms)) {
        this.ensureThread(threadId)
        const thread = this.igThreads[threadId]
        for (const m of msgs) {
          thread.push({
            id: `seed-${threadId}-${thread.length}`,
            from: m.from,
            text: seedFill(m.text) || null,
            image: m.image || null,
            ts: daysAgoIso(m.daysAgo),
          })
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
        })
      }

      for (const r of seedReels) {
        this.reels.unshift({
          id: r.id || `seed-reel-${r.author}-${r.daysAgo}`,
          author: r.author,
          media: r.media,
          caption: seedFill(r.caption) || '',
          music: r.music || '',
          likes: r.likes ?? Math.floor(Math.random() * 200) + 10,
          comments: (r.comments || []).map((c) => ({ ...c, text: seedFill(c.text) })),
          commentsCount: r.commentsCount ?? (r.comments || []).length,
          ts: r.ts || relativeLabel(r.daysAgo),
        })
      }

      for (const p of seedPhotos) {
        this.photos.unshift({
          id: p.id || `seed-photo-${p.from}-${this.photos.length}`,
          from: p.from,
          url: p.url,
          caption: seedFill(p.caption) || '',
        })
      }

      // Entity schemas keep their own seed instances (`schema.seed`, edited
      // right in the Schémas tab — EntitySchemaForm.vue) instead of a bucket
      // here, since the field list an author needs to fill them in already
      // lives on the schema itself. Same "present before the timeline plays
      // its first entry" semantics as every seed above, applied via the
      // exact op effects.entities' 'set' mode already uses (merge fields
      // onto whatever's there, auto-generate an id if left blank).
      for (const schema of this.project?.gameConfig?.entitySchemas || []) {
        if (!schema.seed?.length) continue
        if (!this.entities[schema.id]) this.entities[schema.id] = {}
        const bucket = this.entities[schema.id]
        for (const inst of schema.seed) {
          const id =
            inst.entityId ||
            `entity-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
          bucket[id] = { ...bucket[id], ...inst.fields }
        }
      }
    },

    // called by LockScreen right after every unlock (see PhoneShell/
    // LockScreen) — a no-op unless the timeline is actually parked on a
    // `timeskip` entry, in which case this is what resumes it. A `landApp`
    // entry never reaches here at all — it skips the lock screen and
    // auto-advances itself instead (see processEntry's 'timeskip' case and
    // scheduleTimeSkip below), so this only ever handles the plain
    // lock-screen-tap case.
    continueAfterTimeSkip() {
      if (this.pendingTimeSkipLabel) {
        this.pendingTimeSkipLabel = null
        this.save()
      }
      const chapter = this.currentChapter
      const entry = chapter?.timeline[this.timelineIndex]
      if (!entry || entry.type !== 'timeskip') return
      this.timelineIndex++
      this.save()
      this.advance()
    },

    startChapter(chapterId) {
      const chapter = (this.project?.chapters ?? []).find((c) => c.id === chapterId)
      if (!chapter) return
      this.currentChapterId = chapterId
      this.timelineIndex = 0
      this.started = true
      if (!this.visitedChapterIds.includes(chapterId)) this.visitedChapterIds.push(chapterId)
      this.advance()
    },

    // --- conditions --------------------------------------------------------
    checkConditions(requires) {
      if (!requires) return true

      if (requires.flags) {
        const flagsOk = Object.entries(requires.flags).every(([key, expected]) => {
          const value = this.flags[key] || 0
          if (typeof expected === 'boolean') {
            return Boolean(value) === expected
          }
          if (expected && typeof expected === 'object') {
            if ('min' in expected && value < expected.min) return false
            if ('max' in expected && value > expected.max) return false
            return true
          }
          return value === expected
        })
        if (!flagsOk) return false
      }

      // { following: { contactId: true|false } } — whether the player
      // currently follows that contact (see isFollowing/toggleFollow). A
      // live, player-driven signal rather than something a narrative choice
      // sets: it can change between the moment this entry is authored and
      // the moment advance() actually reaches it, unlike a flag.
      if (requires.following) {
        const followingOk = Object.entries(requires.following).every(
          ([contactId, expected]) => this.isFollowing(contactId) === expected,
        )
        if (!followingOk) return false
      }

      // { collections: { flagKey: { size?: number|{min,max}, has?: itemKey } } }
      // — checks against a collection FLAG's key->value map (see
      // flagCollections in state, applyEffects()'s `effects.collections`
      // for how items get in/out). `size` and `has` are independent checks,
      // both optional, both must pass if present — same "every condition
      // present must hold" contract as `flags`/`following` above.
      if (requires.collections) {
        const collectionsOk = Object.entries(requires.collections).every(([flagKey, cond]) => {
          const map = this.flagCollections[flagKey] || {}
          if (cond.size !== undefined) {
            const size = Object.keys(map).length
            if (typeof cond.size === 'number') {
              if (size !== cond.size) return false
            } else {
              if ('min' in cond.size && size < cond.size.min) return false
              if ('max' in cond.size && size > cond.size.max) return false
            }
          }
          if (cond.has !== undefined && !(cond.has in map)) return false
          return true
        })
        if (!collectionsOk) return false
      }

      // { entities: [{ schemaId, entityId, field, value: bool|exact|{min}|
      // {max}|{min,max} }] } — same comparison shape/semantics as `flags`
      // above, just reading a schema instance's field instead of a flag.
      // `entityId: '*'` reads the first/only instance of that schema, same
      // sentinel the `{entity:*:...}` text token already uses (see
      // resolveDynamicText.js) — most conditions only care about "the"
      // instance, not a specific id. Uses `!(value >= min)` rather than
      // `value < min` so a missing instance/field (value undefined) FAILS
      // the condition instead of silently passing — unlike a flag, an
      // entity field has no numeric-default fallback, since it can just as
      // well be text or boolean.
      if (requires.entities) {
        const entitiesOk = requires.entities.every((cond) => {
          const instance =
            cond.entityId === '*'
              ? this.entityItems(cond.schemaId)[0]
              : this.entities?.[cond.schemaId]?.[cond.entityId]
          let value = instance?.[cond.field]
          // A `schedule` field holds an ARRAY of { from, to, place } slots,
          // not a scalar — comparing it directly against `cond.value` could
          // never match. Resolve it to whichever slot covers RIGHT NOW
          // first (same logic ScheduleBlock.vue uses to highlight the
          // active slot), so a condition reads as "this character is
          // currently at <place>" rather than needing to know the field's
          // internal array shape.
          const fieldDef = this.project?.gameConfig?.entitySchemas
            ?.find((s) => s.id === cond.schemaId)
            ?.fields?.find((f) => f.key === cond.field)
          if (fieldDef?.type === 'schedule') {
            const d = this.resolvedClock()
            const nowLabel = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
            value = activeSlotPlace(value, nowLabel)
          }
          const expected = cond.value
          if (typeof expected === 'boolean') return Boolean(value) === expected
          if (expected && typeof expected === 'object') {
            if ('min' in expected && !(value >= expected.min)) return false
            if ('max' in expected && !(value <= expected.max)) return false
            return true
          }
          return value === expected
        })
        if (!entitiesOk) return false
      }

      return true
    },

    // --- timeline processing ------------------------------------------------
    advance() {
      const chapter = this.currentChapter
      if (!chapter) return

      while (this.timelineIndex < chapter.timeline.length) {
        const entry = chapter.timeline[this.timelineIndex]

        if (!this.checkConditions(entry.requires)) {
          this.timelineIndex++
          continue
        }

        // An entry whose app was disabled after it was authored (game.
        // disabledApps, see GameForm.vue's "Applications" panel) stays in
        // the chapter's data untouched — the author might re-enable the app
        // later, or is fixing content elsewhere first — but must not play
        // out at runtime for an app that no longer exists on the phone.
        // Same silent-skip treatment as a failed `requires`. `appDm`/an
        // app-scoped `choice` target a DYNAMIC per-entry app (entry.app),
        // not a fixed one, so they're not in the static ENTRY_TYPE_APP map —
        // resolved here instead.
        const entryApp =
          entry.type === 'appDm' || (entry.type === 'choice' && entry.app)
            ? entry.app
            : ENTRY_TYPE_APP[entry.type]
        if (entryApp && !this.enabledAppIds.includes(entryApp)) {
          this.timelineIndex++
          continue
        }

        // incoming SMS/DM get a "typing..." beat before they land, timed by
        // length — see scheduleMessage/scheduleDm. Index isn't incremented
        // until the timer fires, so a reload mid-typing just re-triggers it.
        if (entry.type === 'message') {
          this.scheduleMessage(entry, chapter, () => {
            this.timelineIndex++
            this.save()
            this.advance()
          })
          return
        }
        if (entry.type === 'dm') {
          this.scheduleDm(entry, chapter, () => {
            this.timelineIndex++
            this.save()
            this.advance()
          })
          return
        }
        if (entry.type === 'appDm') {
          this.scheduleAppDm(entry, chapter, () => {
            this.timelineIndex++
            this.save()
            this.advance()
          })
          return
        }
        // same idea as the typing beat above — a short pause before the
        // clock/date actually change and the phone locks, so it reads as a
        // deliberate beat ("the phone is about to skip ahead") instead of
        // an instant cut with no warning.
        if (entry.type === 'timeskip') {
          this.scheduleTimeSkip(entry, chapter)
          return
        }
        // A hallucinated conversation the player only watches — see
        // scheduleHallucination/finishHallucination and
        // HallucinationPlayer.vue. Blocks by default (like `interaction`)
        // until the player has finished watching it play out, unless the
        // author set `blocking: false`.
        if (entry.type === 'hallucination') {
          this.scheduleHallucination(entry, chapter)
          return
        }
        // A silent beat — nothing shown, nothing changes, the timeline just
        // waits `duration` ms (author-controlled, unlike PACE_DELAY's fixed
        // small gap between every "instant" entry) before the next entry.
        // Same shape as scheduleTimeSkip/scheduleHallucination above (index
        // not incremented until the wait is over), but with no processEntry
        // call at all — there's genuinely nothing to do except wait.
        if (entry.type === 'pause') {
          setTimeout(() => {
            this.timelineIndex++
            this.save()
            this.advance()
          }, entry.duration || 1000)
          return
        }

        // a choice or a ringing call blocks progress until the player acts.
        // Keep the index pointing AT this entry (don't increment) so that a
        // page reload — which doesn't persist activeChoice/pendingCall —
        // re-presents the same prompt instead of silently skipping it.
        // Save right here too — without this, closing the tab mid-chapter
        // (very common while testing) lost all progress, since save() used
        // to only run once every available chapter was exhausted.
        //
        // presentBlockingEntry (not processEntry directly) — if the phone
        // is already showing another choice/call (typically one an Event's
        // reaction presented, see handleEngineEvent), this queues instead
        // of clobbering it; presentNextQueuedInteraction() shows it once
        // the phone frees up (see makeChoice/declineCall/endCall).
        // an `interaction` entry blocks the same way UNLESS the author
        // explicitly set `blocking: false` — see InteractionEntryForm.vue.
        // A non-blocking one falls through to the generic instant path
        // below: processEntry() still shows it (activeInteraction), the
        // timeline just doesn't wait for finishInteraction() before moving
        // on, same "comme les events" behavior requested for this mode.
        if (
          entry.type === 'choice' ||
          entry.type === 'call' ||
          (entry.type === 'interaction' && entry.blocking !== false)
        ) {
          this.presentBlockingEntry(entry, chapter, () => {
            this.timelineIndex++
            this.advance()
          })
          this.save()
          return
        }

        this.processEntry(entry, chapter)

        // everything else (post, photo, story, reel, effect, non-blocking
        // interaction) lands instantly
        // but still gets a light pause before the next entry, so a run of
        // them doesn't all appear in the same frame.
        this.timelineIndex++
        setTimeout(() => this.advance(), PACE_DELAY)
        return
      }

      // chapter finished — take the first authored outgoing edge whose
      // `requires` passes (see chapter.next, authored as arrows in
      // ChapterGraph.vue). No edges, or none whose requires currently
      // holds, means this chapter is where the story ends for this player —
      // show EndScreen.vue (author's chapter.endScreen if set, generic
      // fallback otherwise) instead of just quietly going nowhere.
      for (const edge of chapter.next || []) {
        if (this.checkConditions(edge.requires)) {
          this.startChapter(edge.to)
          return
        }
      }

      this.activeEnding = { ...(chapter.endScreen || {}) }
      if (!this.unlockedEndings.includes(chapter.id)) this.unlockedEndings.push(chapter.id)
      this.save()
    },

    // simulates the contact "typing" before an incoming SMS lands, timed by
    // text length, then hands off to `onDone` — used by both the main
    // timeline loop and `then` reactions so the beat is consistent everywhere.
    scheduleMessage(entry, chapter, onDone) {
      this.typingContact = entry.contact
      setTimeout(() => {
        this.typingContact = null
        this.processEntry(entry, chapter)
        onDone()
      }, typingDelay(entry.text))
    },

    // same beat, for an Pixly DM — `typingDm` also carries which contact is
    // typing so a group thread can show a name, not just dots.
    scheduleDm(entry, chapter, onDone) {
      if (entry.from === 'me') {
        this.processEntry(entry, chapter)
        onDone()
        return
      }
      this.typingDm = { thread: entry.thread, contact: entry.from }
      setTimeout(() => {
        this.typingDm = null
        this.processEntry(entry, chapter)
        onDone()
      }, typingDelay(entry.text))
    },

    // same beat, for a custom app's conversation module — see scheduleDm.
    scheduleAppDm(entry, chapter, onDone) {
      if (entry.from === 'me') {
        this.processEntry(entry, chapter)
        onDone()
        return
      }
      this.typingAppDm = { app: entry.app, thread: entry.thread, contact: entry.from }
      setTimeout(() => {
        this.typingAppDm = null
        this.processEntry(entry, chapter)
        onDone()
      }, typingDelay(entry.text))
    },

    // a proper film-style time-skip cut, not a blocking `then`/onDone
    // handoff like scheduleMessage/scheduleDm. By default a timeskip stops
    // the timeline until the player unlocks again (see continueAfterTimeSkip)
    // — long pause (the scene lingers) -> fade to black -> clock/date/lock
    // change while hidden behind the veil -> fade back in on the new lock
    // screen, already showing the right time. With `blocking: false`, the
    // last step instead resumes the timeline itself, right behind the veil
    // — the player can unlock whenever, continueAfterTimeSkip is then a
    // no-op since the timeline has already moved past this entry. A
    // `landApp` entry auto-advances the same way, regardless of its own
    // `blocking` value — it never shows a lock screen at all (see
    // processEntry's 'timeskip' case), so there's no tap left to gate on.
    scheduleTimeSkip(entry, chapter) {
      setTimeout(() => {
        this.timeSkipFading = true
        setTimeout(() => {
          this.processEntry(entry, chapter)
          this.save()
          setTimeout(() => {
            this.timeSkipFading = false
          }, 350)
          if (entry.blocking === false || entry.landApp) {
            this.timelineIndex++
            this.save()
            this.advance()
          }
        }, 450)
      }, 1400)
    },

    // a `hallucination` entry — no cinematic pause before it starts (unlike
    // scheduleTimeSkip above), processEntry shows it immediately. Blocks by
    // default: the timeline stays parked on this entry (timelineIndex not
    // incremented) until finishHallucination() runs, once
    // HallucinationPlayer.vue emits `finish`. `blocking: false` instead
    // advances right away, same "keeps playing behind it" idea as
    // timeskip/vfx's own non-blocking modes — the hallucination still shows
    // and plays out, the story just doesn't wait on it.
    scheduleHallucination(entry, chapter) {
      this.processEntry(entry, chapter)
      this.save()
      if (entry.blocking === false) {
        this.timelineIndex++
        this.save()
        this.advance()
      }
    },

    // a `vfx` entry — purely cosmetic, non-blocking overlay on top of the
    // phone screen (PhoneShell.vue reads `screenEffect` to pick which CSS
    // animation to show: glitch/static/crack/shake). `id` (not just `kind`)
    // is what PhoneShell keys its transition on, so two back-to-back `vfx`
    // entries of the SAME kind still restart the animation instead of the
    // second one being a no-op vue-diff against identical props.
    // `duration` is optional: given, it auto-clears back to null after that
    // many ms (guarded by matching `id` so an earlier effect's timeout can't
    // stomp a newer one that started while it was still running); omitted,
    // the effect stays on screen indefinitely — the author is expected to
    // place a later `vfx` entry with `mode: 'stop'` (see stopScreenEffect
    // below) wherever the story should turn it back off.
    triggerScreenEffect(kind, duration) {
      const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
      this.screenEffect = { kind: kind || 'glitch', id }
      if (duration) {
        setTimeout(() => {
          if (this.screenEffect?.id === id) this.screenEffect = null
        }, duration)
      }
    },

    // counterpart to triggerScreenEffect above, for a `vfx` entry authored
    // with `mode: 'stop'` — turns off whatever effect is currently showing,
    // regardless of which kind it is (an author stopping "the glitch" and
    // one stopping "whatever's currently running" are the same action here).
    stopScreenEffect() {
      this.screenEffect = null
    },

    // a `music` entry — background track, looping by default (unlike a
    // `vfx` entry's usual one-shot-with-optional-duration shape, music is
    // meant to keep playing until an explicit `mode: 'stop'` entry or the
    // author sets `loop: false` for a one-play track). `title` is purely
    // for HomeWidgets.vue's now-playing card — playMusic() itself resolves
    // `track` (a project asset path) and handles the actual playback.
    // `volume` (0-100, author's per-track mix level, default 100) layers
    // under the player's own musicVolume/soundVolume — see sound.js.
    // `fade` (ms) ramps the new track in; if something was already
    // playing, that one fades OUT over the same duration instead of
    // cutting abruptly (see playMusic's own comment on why).
    startMusic(track, title, loop, volume, fade) {
      if (!track) return
      playMusic(track, { loop: loop !== false, volume, fadeMs: fade || 0 })
      // Falls back to the asset's own filename (minus extension) rather
      // than leaving the widget on its old decorative placeholder text —
      // real music playing under fake "Vibes du soir" copy would read as
      // broken, not charming.
      const derivedTitle = track
        .split('/')
        .pop()
        .replace(/\.[^./]+$/, '')
      this.nowPlaying = { title: title || derivedTitle }
    },

    // counterpart to startMusic above, for a `music` entry authored with
    // `mode: 'stop'` — same "turn off whatever's currently on" shape as
    // stopScreenEffect. With a `fade`, nowPlaying (and the home widget it
    // drives) stays as-is until the fade actually finishes — clearing it
    // immediately would show "nothing playing" while the track is still
    // audibly winding down. No fade (mute toggle, project/slot reload,
    // reset) clears it right away, matching the hard-stop it actually is.
    stopMusic(fade) {
      stopMusicPlayback(fade || 0, () => {
        this.nowPlaying = null
      })
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
        resume()
        return
      }
      const entry = list[i]
      if (!this.checkConditions(entry.requires)) {
        this.runThen(list, i + 1, chapter, resume)
        return
      }
      // Same disabled-app skip as advance() above — a `then` entry is just
      // as much "already-authored content for an app that's gone" as a
      // top-level one. See advance()'s own comment on why appDm/app-scoped
      // choice aren't in the static ENTRY_TYPE_APP map.
      const entryApp =
        entry.type === 'appDm' || (entry.type === 'choice' && entry.app)
          ? entry.app
          : ENTRY_TYPE_APP[entry.type]
      if (entryApp && !this.enabledAppIds.includes(entryApp)) {
        this.runThen(list, i + 1, chapter, resume)
        return
      }
      if (entry.type === 'message') {
        this.scheduleMessage(entry, chapter, () => this.runThen(list, i + 1, chapter, resume))
        return
      }
      if (entry.type === 'dm') {
        this.scheduleDm(entry, chapter, () => this.runThen(list, i + 1, chapter, resume))
        return
      }
      if (entry.type === 'appDm') {
        this.scheduleAppDm(entry, chapter, () => this.runThen(list, i + 1, chapter, resume))
        return
      }
      // Same as advance()'s own 'pause' branch — special-cased here too
      // (unlike vfx/timeskip/hallucination, which just fall through to the
      // generic processEntry+PACE_DELAY path below) because the whole point
      // of this entry is an author-controlled wait; falling through would
      // silently collapse any authored duration down to the fixed 450ms
      // PACE_DELAY every other instant entry gets inside a `then` list.
      if (entry.type === 'pause') {
        setTimeout(() => this.runThen(list, i + 1, chapter, resume), entry.duration || 1000)
        return
      }
      // a nested choice/call blocks just like a top-level one — set the
      // continuation to "carry on with the rest of this `then` list" and
      // stop here until the player answers/hangs up (see makeChoice /
      // declineCall / endCall). presentBlockingEntry queues instead of
      // clobbering if the phone is already busy — see advance()'s own
      // comment on the same helper.
      if (
        entry.type === 'choice' ||
        entry.type === 'call' ||
        (entry.type === 'interaction' && entry.blocking !== false)
      ) {
        this.presentBlockingEntry(entry, chapter, () => this.runThen(list, i + 1, chapter, resume))
        return
      }
      this.processEntry(entry, chapter)
      setTimeout(() => this.runThen(list, i + 1, chapter, resume), PACE_DELAY)
    },

    // Shows a blocking entry (choice/call/blocking interaction) right now if
    // the phone is free, or queues it if the player is already mid-choice/
    // mid-call/mid-interaction — this is what lets the main chapter timeline
    // and an Event's own reaction (handleEngineEvent) each have a pending
    // one without one clobbering the other's activeChoice/pendingCall/
    // activeInteraction/timelineResume (they
    // used to share those 3 fields directly, so whichever presented second
    // silently ate the first one's state). The queued one is shown by
    // presentNextQueuedInteraction() below, once the current one resolves.
    presentBlockingEntry(entry, chapter, resume) {
      if (this.activeChoice || this.pendingCall || this.activeInteraction) {
        this.pendingInteractions.push({ entry, chapter, resume })
        return
      }
      this.timelineResume = resume
      this.processEntry(entry, chapter)
    },

    // Called by makeChoice/declineCall/endCall right after they free the
    // phone (activeChoice/pendingCall back to null) — presents whatever
    // queued up behind the one that just resolved, if anything did.
    presentNextQueuedInteraction() {
      const next = this.pendingInteractions.shift()
      if (!next) return
      this.timelineResume = next.resume
      this.processEntry(next.entry, next.chapter)
    },

    processEntry(entry, chapter) {
      switch (entry.type) {
        case 'message':
          this.pushMessage(entry.contact, {
            from: entry.contact,
            text: this.fill(entry.text),
            image: entry.image || null,
            deleteAfter: entry.deleteAfter || null,
          })
          this.tickClock()
          this.tickBattery()
          if (!this.isViewingConversation(entry.contact)) {
            this.pushNotification({
              app: 'messages',
              contact: entry.contact,
              title: this.contactName(entry.contact),
              text: this.fill(entry.text) || '📷 Photo',
            })
          }
          break

        case 'story':
          // no notification — a friend posting a story isn't worth a banner,
          // only direct communication (message/dm/call) is.
          this.stories.push({
            id: entry.id || `${chapter.id}-story-${this.timelineIndex}`,
            contact: entry.contact,
            media: entry.media || null,
            emoji: entry.emoji || '✨',
            bg: entry.bg || null,
            caption: this.fill(entry.caption) || '',
            ts: entry.ts || "à l'instant",
          })
          break

        case 'dm':
          this.pushDm(entry.thread, {
            from: entry.from,
            text: this.fill(entry.text),
            image: entry.image,
            deleteAfter: entry.deleteAfter || null,
          })
          this.tickClock()
          this.tickBattery()
          break

        case 'appDm':
          this.pushAppMessage(entry.app, entry.thread, {
            from: entry.from,
            text: this.fill(entry.text),
            image: entry.image,
          })
          this.tickClock()
          this.tickBattery()
          break

        case 'choice':
          this.activeChoice = {
            id: entry.id || `${chapter.id}-${this.timelineIndex}`,
            app: entry.app || null,
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
          }
          break

        case 'post':
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
          })
          break

        case 'reel':
          // no notification — same reasoning as `story`/`post`.
          this.reels.unshift({
            id: entry.id || `${chapter.id}-reel-${this.timelineIndex}`,
            author: entry.author,
            media: entry.media,
            caption: this.fill(entry.caption) || '',
            music: entry.music || '',
            likes: entry.likes ?? Math.floor(Math.random() * 200) + 10,
            comments: entry.comments || [],
            commentsCount: entry.commentsCount ?? (entry.comments || []).length,
            ts: entry.ts || "à l'instant",
          })
          break

        case 'photo':
          this.photos.unshift({
            id: entry.id || `${chapter.id}-photo-${this.timelineIndex}`,
            from: entry.from,
            url: entry.url,
            caption: this.fill(entry.caption) || '',
          })
          break

        case 'call':
          this.pendingCall = {
            id: entry.id || `${chapter.id}-call-${this.timelineIndex}`,
            contact: entry.contact,
            script: (entry.script || []).map((line) => ({
              ...line,
              text: this.fill(line.text),
            })),
          }
          this.pushNotification({
            app: 'calls',
            contact: entry.contact,
            title: this.contactName(entry.contact),
            text: i18n.global.t('calls.incomingNotification'),
          })
          startLoop('call-ringtone')
          break

        case 'effect':
          this.applyEffects(entry.effects)
          break

        case 'vfx':
          if (entry.mode === 'stop') this.stopScreenEffect()
          else this.triggerScreenEffect(entry.effect, entry.duration)
          break

        case 'music':
          if (entry.mode === 'stop') this.stopMusic(entry.fade)
          else this.startMusic(entry.track, entry.title, entry.loop, entry.volume, entry.fade)
          break

        // Shows the real "..." typing indicator (typingContact/typingDm —
        // the SAME fields scheduleMessage/scheduleDm already set right
        // before an incoming message lands) with nothing ever arriving
        // after it. Same fire-and-forget shape as `vfx` above: no dedicated
        // schedule*/finish* pair, no blocking dispatch branch needed in
        // advance()/runThen() — this case just sets the flag and manages
        // its own auto-clear timer, the timeline moves on immediately via
        // whichever generic path (top-level or nested `then`) called it.
        case 'fakeTyping': {
          const clearAfter = entry.duration || 2000
          if (entry.mode === 'dm') {
            this.typingDm = { thread: entry.thread, contact: entry.from }
            setTimeout(() => {
              this.typingDm = null
            }, clearAfter)
          } else {
            this.typingContact = entry.contact
            setTimeout(() => {
              this.typingContact = null
            }, clearAfter)
          }
          break
        }

        // Genuinely nothing to do here — advance()/runThen() both intercept
        // 'pause' before it ever reaches this switch (see their own
        // comments) to honor its authored `duration`. This case only exists
        // as a safety net so a 'pause' reaching processEntry through some
        // other path (none exist today) degrades to a silent no-op instead
        // of the default case's "unknown entry type" warning.
        case 'pause':
          break

        // Author-built phone interaction (see stepKinds.js / game.interactions).
        // PhoneShell.vue reads activeInteraction to mount InteractionPlayer.vue
        // full-screen; that component reports the outcome via
        // finishInteraction() below. Blocking vs non-blocking is decided by
        // advance()/runThen() (which route here either via
        // presentBlockingEntry, for a blocking one, or straight through, for
        // a non-blocking one) — this case itself just shows the interaction
        // either way.
        case 'interaction': {
          // Interactions are project data (game.interactions[], authored in
          // the editor's own "Interactions" tab), not code — this resolves
          // the entry's referenced id to its authored steps[] at fire time.
          // A dangling id (definition deleted, entry not updated) degrades
          // to an empty step list rather than crashing — InteractionPlayer.vue
          // treats zero steps as an immediate loss.
          const def = (this.project?.gameConfig?.interactions || []).find(
            (d) => d.id === entry.interactionId,
          )
          this.activeInteraction = {
            interactionId: entry.interactionId,
            steps: def?.steps || [],
            background: def?.background || null,
            blocking: entry.blocking !== false,
            onWin: entry.onWin || null,
            onLose: entry.onLose || null,
          }
          break
        }

        case 'timeskip': {
          // an ellipsis that can happen anywhere in a chapter, not just
          // between two — locks the phone right here. By default this also
          // blocks the timeline (see scheduleTimeSkip) until the player
          // unlocks it again, same as walking back in after time has
          // actually passed. `blocking: false` skips that wait — the
          // timeline keeps playing behind the lock screen instead, so life
          // (new messages, calls...) goes on whether the player checks the
          // phone or not.
          const clockEffects = {}
          if ('clock' in entry) clockEffects.clock = entry.clock
          if ('date' in entry) clockEffects.date = entry.date

          // battery drain proportional to how much time the skip actually
          // covers (-1% per 30min) — only computable if a clock/date
          // reference already existed before this entry, otherwise there's
          // no "before" to diff against (e.g. the very first timeskip that
          // ever sets the clock).
          const hadClockRef = Boolean(this.clockTime || this.clockDate)
          const before = hadClockRef ? this.resolvedClock() : null

          if (Object.keys(clockEffects).length) this.applyEffects(clockEffects)

          if (before && Object.keys(clockEffects).length) {
            const elapsedMinutes = Math.round(
              (this.resolvedClock().getTime() - before.getTime()) / 60000,
            )
            const drain = Math.floor(elapsedMinutes / 30)
            if (drain > 0) {
              const prev = this.battery
              this.battery = Math.max(0, this.battery - drain)
              this.checkLowBattery(prev)
            }
          }

          // A `landApp` entry skips the lock screen entirely — the player
          // lands straight on the chosen app, already unlocked, instead of
          // having to tap through a lock screen just to reach the home
          // screen behind it (see TimeskipEntryForm.vue's landApp/
          // landThread fields). The label moves from the lock screen to a
          // fade-in/out toast shown right here instead (see TimeSkipToast.vue).
          // Since there's no lock screen tap left to hook a "resume" on,
          // the timeline is auto-advanced by scheduleTimeSkip below, same as
          // `blocking: false` — `entry.blocking` has nothing left to gate.
          const phone = usePhoneStore()
          if (entry.landApp) {
            this.pendingTimeSkipLabel = null
            // `landThread` means different things per app: a plain contact
            // id for native SMS (1:1 only), a project.threads id (or
            // contact fallback) for native Pixly DM or a custom app's own
            // `conversations` block — same group-vs-1:1 shape DM already
            // has. openApp() resets activeConversation/activeDmThread, so
            // the native deep-link calls must run AFTER it, not before —
            // same ordering NotificationBanner.vue's own click-to-open
            // already follows.
            if (entry.landApp === 'messages') {
              phone.openApp('messages')
              if (entry.landThread) phone.openConversation(entry.landThread)
            } else if (entry.landApp === 'social') {
              phone.openApp('social')
              if (entry.landThread) phone.openDmThread(entry.landThread)
            } else {
              const app = this.project?.customApps?.find((a) => a.id === entry.landApp)
              const screenId = entry.landThread
                ? findScreenWithBlockType(app, 'conversations')
                : null
              phone.openApp(entry.landApp, { screenId, threadId: entry.landThread || null })
            }
            this.timeSkipToast = this.fill(entry.label) || null
          } else {
            this.pendingTimeSkipLabel = this.fill(entry.label) || null
            phone.lock()
          }
          break
        }

        case 'hallucination': {
          // A conversation the player can only watch, never write to real
          // thread state — see HallucinationPlayer.vue's own comment.
          // Messages are resolved (fill()) up front, same as a `call`
          // entry's script, since HallucinationPlayer just plays a plain
          // string list, no further engine lookups. `enterEffect` reuses
          // the exact same triggerScreenEffect() a `vfx` entry calls — the
          // "reality glitching" cue in is nothing new, just an author-picked
          // VFX_KINDS value instead of a fixed 'glitch'.
          const messages = (entry.messages || []).map((m) => ({
            from: m.from,
            text: this.fill(m.text),
          }))
          this.triggerScreenEffect(entry.enterEffect || 'glitch', 500)
          this.activeHallucination = {
            messages,
            exitEffect: entry.exitEffect || 'glitch',
            blocking: entry.blocking !== false,
          }
          break
        }

        default: {
          // Additive fallback for plug-in entry types (see
          // src/engine/apps/entryTypeRegistry.js) — the 10 cases above are
          // never reached for a plug-in type (they only match their own
          // hardcoded literal), so this only ever runs for a type this
          // switch itself doesn't know about.
          const customType = CUSTOM_ENTRY_TYPE_BY_TYPE[entry.type]
          if (customType) {
            customType.process(entry, { story: this, chapter })
          } else {
            console.warn('[story] unknown timeline entry type:', entry.type)
          }
        }
      }
    },

    // --- player actions ---------------------------------------------------
    makeChoice(optionIndex) {
      if (!this.activeChoice) return
      const option = this.activeChoice.options[optionIndex]
      if (!option) return

      const chapter = this.currentChapter

      // option.text is already resolved (translation + {name}) — it was
      // filled once when the choice was set up in processEntry, so the
      // button the player saw and the message they end up sending match.
      // `app` takes priority — an app-scoped choice always carries its
      // target thread id in `thread` too (see ChoiceEntryForm.vue), same
      // field the native DM branch below already uses.
      if (this.activeChoice.app) {
        this.pushAppMessage(this.activeChoice.app, this.activeChoice.thread, {
          from: 'me',
          text: option.text,
        })
      } else if (this.activeChoice.thread) {
        this.pushDm(this.activeChoice.thread, {
          from: 'me',
          text: option.text,
        })
      } else {
        this.pushMessage(this.activeChoice.contact, {
          from: 'me',
          text: option.text,
        })
      }
      if (option.effects) this.applyEffects(option.effects)

      this.activeChoice = null
      // Capture + clear BEFORE presentNextQueuedInteraction() — that call
      // may itself set a NEW this.timelineResume (for whatever it just
      // presented), so `resume` has to already be a plain local by then or
      // it would silently pick up the wrong continuation.
      const resume = this.timelineResume
      this.timelineResume = null
      this.presentNextQueuedInteraction()
      this.runThen(option.then || [], 0, chapter, resume)
    },

    answerCall() {
      if (!this.pendingCall) return
      const call = this.pendingCall
      stopSound('call-ringtone')
      playSound('call-accept')
      this.calls.unshift({
        id: call.id,
        contact: call.contact,
        type: 'answered',
        ts: "à l'instant",
        script: call.script,
      })
      this.dismissNotificationsFor({ app: 'calls', contact: call.contact })
      return call
    },

    declineCall() {
      if (!this.pendingCall) return
      stopSound('call-ringtone')
      playSound('call-end')
      this.calls.unshift({
        id: this.pendingCall.id,
        contact: this.pendingCall.contact,
        type: 'missed',
        ts: "à l'instant",
        script: [],
      })
      this.dismissNotificationsFor({
        app: 'calls',
        contact: this.pendingCall.contact,
      })
      this.pendingCall = null
      // Same capture-before-queue-check ordering as makeChoice() above.
      const resume = this.timelineResume
      this.timelineResume = null
      this.presentNextQueuedInteraction()
      resume()
    },

    endCall() {
      playSound('call-end')
      this.pendingCall = null
      const resume = this.timelineResume
      this.timelineResume = null
      this.presentNextQueuedInteraction()
      resume()
    },

    // Called by PhoneShell.vue when the currently-mounted interaction
    // component emits `finish` (see interactionRegistry.js's component
    // contract). Applies the matching win/lose branch's effects/then and
    // fires the matching event trigger regardless of blocking mode — a
    // non-blocking interaction's outcome ONLY ever surfaces through these
    // (the timeline already moved on when it started, see processEntry's
    // 'interaction' case), same "comme les events" behavior the blocking
    // mode's `then` list sits on top of.
    finishInteraction({ success }) {
      const interaction = this.activeInteraction
      if (!interaction) return
      this.activeInteraction = null

      const branch = success ? interaction.onWin : interaction.onLose
      if (branch?.effects) this.applyEffects(branch.effects)
      emitEngineEvent(success ? 'interaction.won' : 'interaction.lost', {
        interactionId: interaction.interactionId,
      })

      const chapter = this.currentChapter
      const then = branch?.then || []
      if (!interaction.blocking) {
        this.runThen(then, 0, chapter, () => {})
        return
      }
      // Same capture-before-queue-check ordering as makeChoice/declineCall/
      // endCall above — presentNextQueuedInteraction() may itself set a NEW
      // this.timelineResume before `then`'s own runThen gets to it.
      const resume = this.timelineResume
      this.timelineResume = null
      this.presentNextQueuedInteraction()
      this.runThen(then, 0, chapter, resume)
    },

    // called by HallucinationPlayer.vue once every message has been shown
    // and read (see its own HOLD_AFTER_LAST_MS). Triggers the exit glitch
    // (same triggerScreenEffect() a `vfx` entry uses) and clears the
    // overlay — for a non-blocking hallucination the timeline already moved
    // on back in scheduleHallucination, so this only ever advances it once.
    finishHallucination() {
      const hallucination = this.activeHallucination
      if (!hallucination) return
      this.activeHallucination = null
      // Short on purpose — the whole point is a jarring, abrupt cut back to
      // reality, not a lingering fade (see HallucinationPlayer.vue's own
      // HOLD_AFTER_LAST_MS comment for the matching reasoning on the other
      // side of this beat).
      this.triggerScreenEffect(hallucination.exitEffect || 'glitch', 250)
      if (hallucination.blocking === false) return
      this.timelineIndex++
      this.save()
      this.advance()
    },

    markRead(contactId) {
      this.unreadCounts[contactId] = 0
      this.dismissNotificationsFor({ app: 'messages', contact: contactId })
    },

    // --- social (Instagram-style) actions ----------------------------------
    // player-authored post from the "Créer" flow — not timeline-driven, so it
    // isn't gated by `requires`/flags, it's a direct action the player took.
    addOwnPost({ image, caption, filter }) {
      this.feedPosts.unshift({
        id: `me-post-${Date.now()}`,
        author: 'me',
        content: caption || '',
        image: image || null,
        imageFilter: filter || null,
        likes: 0,
        comments: [],
        ts: "à l'instant",
      })
      this.save()
    },

    toggleLike(postId) {
      this.likedPosts[postId] = !this.likedPosts[postId]
      if (this.likedPosts[postId]) {
        playSound('social-like')
        // Only on the like itself, not the unlike — matches the
        // 'post.liked' trigger's own name (see triggers.js). authorId is
        // looked up (works for both a feed post and a reel, same id space)
        // so an authored event can filter "liked something by THIS
        // contact" — a post's own id is otherwise opaque/unknown to an
        // author picking a match value in the editor.
        const authorId =
          this.feedPosts.find((p) => p.id === postId)?.author ??
          this.reels.find((r) => r.id === postId)?.author
        emitEngineEvent('post.liked', { postId, authorId })
      }
      this.save()
    },

    toggleFollow(contactId) {
      const nowFollowing = !this.isFollowing(contactId)
      this.followingContacts[contactId] = nowFollowing
      if (nowFollowing) emitEngineEvent('contact.followed', { contactId })
      this.save()
    },

    markStorySeen(storyId) {
      this.storiesSeen[storyId] = true
    },

    ensureThread(threadId) {
      if (!this.igThreads[threadId]) this.igThreads[threadId] = []
    },

    markDmRead(threadId) {
      this.igUnread[threadId] = 0
      this.dismissNotificationsFor({ app: 'social', thread: threadId })
    },

    // --- internals ---------------------------------------------------------
    // true while the player already has that exact conversation open on
    // screen — an incoming message there shouldn't bump the unread badge or
    // pop a notification banner for something they're already looking at.
    isViewingConversation(contactId) {
      const phone = usePhoneStore()
      return phone.currentApp === 'messages' && phone.activeConversation === contactId
    },

    isViewingDmThread(threadId) {
      const phone = usePhoneStore()
      return phone.currentApp === 'social' && phone.activeDmThread === threadId
    },

    // Same idea for a custom app's `conversations` block — phone.activeAppThread
    // is written by that block itself (its own navigation is otherwise LOCAL
    // to the block instance, see its own comment), not derived here.
    isViewingAppThread(appId, threadId) {
      const phone = usePhoneStore()
      return phone.activeAppThread?.appId === appId && phone.activeAppThread?.threadId === threadId
    },

    pushMessage(contactId, { from, text, image, deleteAfter }) {
      if (!this.messages[contactId]) this.messages[contactId] = []
      const msg = {
        id: `${contactId}-${this.messages[contactId].length}`,
        from,
        text,
        image: image || null,
        ts: this.resolvedClock().toISOString(),
        deleted: false,
        revealed: false,
      }
      this.messages[contactId].push(msg)
      // Re-read the just-pushed message back out of the reactive array
      // instead of scheduling on the local `msg` variable — `msg` is still
      // the plain object as constructed above, and Vue only wraps it
      // reactively once it's actually inside the array; a setTimeout that
      // mutates the pre-insertion object bypasses that proxy entirely, so
      // the mutation happens but never triggers a re-render (confirmed:
      // this is exactly why 500ms authored deleteAfter silently did
      // nothing visible on a real test).
      this.scheduleMessageDeletion(this.messages[contactId].at(-1), from, deleteAfter)
      // the bubble sound plays unconditionally, unlike the unread badge/
      // notification banner below — a message landing while you're already
      // looking at that exact thread still deserves a sound (that's the
      // whole point of a receive/send tone), it just doesn't need a banner
      // for something already on screen.
      playSound(from === 'me' ? 'sms-send' : 'sms-receive')
      if (from !== 'me' && !this.isViewingConversation(contactId)) {
        this.unreadCounts[contactId] = (this.unreadCounts[contactId] || 0) + 1
      }
    },

    // A `message`/`dm` entry can be authored with `deleteAfter` (ms) to make
    // the bubble self-destruct into a "this message was deleted" placeholder
    // once it's been on screen a while — real messaging apps do this, and
    // it's a narrative beat on its own (a contact having second thoughts).
    // Only ever applies to a message actually received (from !== 'me') —
    // a player's own outgoing line never disappears on them. Fire-and-forget
    // like vfx/fakeTyping: mutates the message object in place once the
    // timer fires, which the bubble template already reacts to.
    scheduleMessageDeletion(msg, from, deleteAfter) {
      if (!deleteAfter || from === 'me') return
      setTimeout(() => {
        msg.deleted = true
      }, deleteAfter)
    },

    // Player tap on a "this message was deleted" placeholder — reveals the
    // original text/image again, and taps again to re-hide it. No-op on a
    // message that was never deleted in the first place.
    toggleDeletedMessage(msg) {
      if (!msg.deleted) return
      msg.revealed = !msg.revealed
    },

    pushDm(threadId, { from, text, image, deleteAfter }) {
      this.ensureThread(threadId)
      const thread = this.igThreads[threadId]
      const msg = {
        id: `${threadId}-${thread.length}`,
        from,
        text: text || null,
        image: image || null,
        ts: this.resolvedClock().toISOString(),
        deleted: false,
        revealed: false,
      }
      thread.push(msg)
      // see pushMessage's own comment — must re-read the reactive reference
      // back out of `thread`, not schedule on the pre-insertion `msg`.
      this.scheduleMessageDeletion(thread.at(-1), from, deleteAfter)
      playSound(from === 'me' ? 'social-send' : 'dm-receive')
      if (from === 'me') return

      if (!this.isViewingDmThread(threadId)) {
        this.igUnread[threadId] = (this.igUnread[threadId] || 0) + 1
        const meta = this.getThread(threadId)
        this.pushNotification({
          app: 'social',
          thread: threadId,
          title: meta.group
            ? this.translateStory(meta.name, 'common')
            : this.socialHandle(this.getContact(from)),
          text: text || '📷 Photo',
        })
      }
    },

    ensureAppThread(appId, threadId) {
      if (!this.appThreads[appId]) this.appThreads[appId] = {}
      if (!this.appThreads[appId][threadId]) this.appThreads[appId][threadId] = []
    },

    // Per-app-scoped twin of pushDm() — same message shape/sound, but keyed
    // by (appId, threadId) instead of one global igThreads bucket.
    // "Already viewing this thread" suppression mirrors pushDm/pushMessage's
    // isViewingDmThread/isViewingConversation via isViewingAppThread():
    // a conversation module's open-thread state is LOCAL to its own block
    // instance (see ConversationsBlock.vue), not phone-level by default —
    // that block writes phone.activeAppThread itself specifically so this
    // check has something to read. Notification title is always the
    // SENDER's own name (`socialHandle`), not the thread's — a group
    // thread's name is authored on the block (block.threads), invisible to
    // the engine here, but naming the sender reads fine for a group message
    // too ("Alice: hey") and needs no group/1:1 branch at all.
    pushAppMessage(appId, threadId, { from, text, image }) {
      this.ensureAppThread(appId, threadId)
      const thread = this.appThreads[appId][threadId]
      thread.push({
        id: `${appId}-${threadId}-${thread.length}`,
        from,
        text: text || null,
        image: image || null,
        ts: this.resolvedClock().toISOString(),
      })
      // Sound plays unconditionally, same reasoning as pushMessage/pushDm's
      // own comment — a message landing while the thread is open still
      // deserves a tone, it just doesn't need a badge/banner.
      playSound(from === 'me' ? 'social-send' : 'dm-receive')
      if (from === 'me') return
      if (this.isViewingAppThread(appId, threadId)) return
      if (!this.appUnread[appId]) this.appUnread[appId] = {}
      this.appUnread[appId][threadId] = (this.appUnread[appId][threadId] || 0) + 1
      this.pushNotification({
        app: appId,
        thread: threadId,
        title: this.socialHandle(this.getContact(from)),
        text: text || '📷 Photo',
      })
    },

    // Called when a conversation-block's LOCAL thread view is opened (see
    // ConversationsBlock.vue) — zeroes the badge and dismisses any pending
    // notification for it. Suppressing FUTURE messages while open is now
    // handled separately by isViewingAppThread()/phone.activeAppThread —
    // this only clears what's already there, same spirit as tapping into a
    // native thread.
    markAppThreadRead(appId, threadId) {
      if (this.appUnread[appId]) this.appUnread[appId][threadId] = 0
      this.dismissNotificationsFor({ app: appId, thread: threadId })
    },

    pushNotification(notif) {
      this.notifications.unshift({
        id: `${Date.now()}-${Math.random()}`,
        ...notif,
      })
      if (this.notifications.length > 5) this.notifications.length = 5

      // messages/DM already play their receive tone unconditionally from
      // pushMessage/pushDm (that fires even with the thread open, this
      // banner doesn't) — only the new-follower ping (app: 'social', no
      // `thread`, not routed through pushMessage/pushDm at all) needs one
      // here. 'calls' plays nothing — the incoming call gets the looping
      // ringtone instead (see processEntry's 'call' case).
      if (notif.app === 'social' && !notif.thread) playSound('social-new-follower')
    },

    // Brief on-screen message (AppToast.vue), independent of the lock-screen
    // notification banner above — used by a custom-app button's own
    // `action.type: 'toast'` and by its `action.onFailToast` when a guard
    // condition doesn't hold (see ButtonBlock.vue). Just the latest string;
    // no queue, matching every other one-shot transient field here
    // (timeSkipToast, screenEffect...) — a second toast firing before the
    // first faded out simply replaces it.
    triggerActionToast(text) {
      if (text) this.actionToast = text
    },

    // Direct overwrite, unlike applyEffects()'s own `effects.flags` (which
    // ACCUMULATES a numeric delta rather than setting it — right for an
    // authored "+1 trust", wrong for "the player just typed 42"). Used by a
    // `form` block (see FormBlock.vue) — no other engine path needs a flag
    // *set* outright, so this stays its own small action rather than a new
    // effects op.
    setFlag(key, value) {
      if (key) this.flags[key] = value
    },

    // `depth` is internal — only evaluateAutomations() below ever passes it,
    // to cap how many "automation fires -> its own effect -> re-evaluate
    // automations" generations can chain from ONE original call. Every
    // ordinary caller (a choice, a timeline entry, a button) calls this with
    // one argument, same as always.
    applyEffects(effects, depth = 0) {
      if (!effects) return

      if (effects.flags) {
        for (const [key, delta] of Object.entries(effects.flags)) {
          // booleans are SET (true -> 1, false -> 0), not accumulated — this
          // makes one-shot "unlocked or not" flags safe even if the same
          // effect fires more than once. Numbers keep accumulating, for
          // counters/stats like trust that should build up over choices.
          if (typeof delta === 'boolean') {
            this.flags[key] = delta ? 1 : 0
          } else {
            this.flags[key] = (this.flags[key] || 0) + delta
          }
        }
      }

      // effects.collections = [{ flagKey, mode: 'add'|'remove'|'increment',
      // itemKey, value }] — a list of ops (not an object keyed by flagKey)
      // since one effect can touch the same collection more than once (e.g.
      // two separate ledger entries in one `effect` block). `itemKey` left
      // blank on 'add' auto-generates one (same id-gen shape TimelineEditor
      // already uses for group ids) — the common case for a growing
      // history/log, where the author never needs to think about keys at
      // all. 'remove' with no matching itemKey is a silent no-op, same
      // "nothing to do" spirit as every other effect here. 'increment' adds
      // a numeric delta (positive or negative) to whatever's already at
      // that key — unlike 'add' (which always OVERWRITES, see EffectsBuilder.vue's
      // own comment), this is the only mode that reads-before-writing;
      // `itemKey` is required here (no auto-generated key makes sense for
      // "increment THIS specific counter").
      if (effects.collections) {
        for (const op of effects.collections) {
          if (!op.flagKey) continue
          if (!this.flagCollections[op.flagKey]) this.flagCollections[op.flagKey] = {}
          const map = this.flagCollections[op.flagKey]
          if (op.mode === 'remove') {
            if (op.itemKey) delete map[op.itemKey]
          } else if (op.mode === 'increment') {
            if (op.itemKey)
              map[op.itemKey] = (Number(map[op.itemKey]) || 0) + (Number(op.value) || 0)
          } else {
            const key =
              op.itemKey ||
              `item-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
            map[key] = op.value
          }
        }
      }

      // effects.entities = [{ schemaId, entityId, mode: 'set'|'remove',
      // fields }] — same "list of ops, not object-keyed" shape as
      // effects.collections above, for the same reason (one effect can touch
      // more than one entity, or the same one twice). 'set' MERGES `fields`
      // onto whatever's already at that id (Object.assign, not overwrite) so
      // an author can update a single field — e.g. just `humeur` — without
      // re-specifying every other field of that instance; entityId left
      // blank auto-generates one, same id-gen shape as the collections
      // 'add' case just above. 'remove' with no matching entityId is a
      // silent no-op, same "nothing to do" spirit as collections' 'remove'.
      if (effects.entities) {
        for (const op of effects.entities) {
          if (!op.schemaId) continue
          if (!this.entities[op.schemaId]) this.entities[op.schemaId] = {}
          const bucket = this.entities[op.schemaId]
          if (op.mode === 'remove') {
            if (op.entityId) delete bucket[op.entityId]
          } else {
            const id =
              op.entityId ||
              `entity-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
            bucket[id] = { ...bucket[id], ...op.fields }
          }
        }
      }

      // Phone-state widgets — set directly (not accumulated), only the
      // fields you pass are changed, the rest of the object is left alone.
      if (effects.weather) {
        Object.assign(this.weather, effects.weather)
      }
      if (typeof effects.steps === 'number') {
        this.steps = effects.steps
      }
      if (typeof effects.stepsGoal === 'number') {
        this.stepsGoal = effects.stepsGoal
      }
      // a manual battery value is the author asserting the current level (a
      // charge, a check-in) — reset the passive drain counter so it doesn't
      // immediately ding a couple points off a value just set on purpose.
      if (typeof effects.battery === 'number') {
        const prev = this.battery
        this.battery = Math.max(0, Math.min(100, effects.battery))
        this.messagesSinceBatteryTick = 0
        this.checkLowBattery(prev)
      }
      if (effects.network) {
        Object.assign(this.network, effects.network)
      }
      // "clock"/"date" in effects (not just truthy) lets `{ clock: null }` /
      // `{ date: null }` explicitly clear that override and fall back to
      // the real device value — independently of one another, see
      // resolvedClock() above. Either one resets the message-driven drift
      // too: the author is asserting the current moment, so it shouldn't
      // start the scene already a few minutes off from what they set.
      if ('clock' in effects) {
        this.clockTime = effects.clock // 'HH:MM' or null
        this.clockOffsetMinutes = 0
        this.messagesSinceTick = 0
      }
      if ('date' in effects) {
        this.clockDate = effects.date // 'DD/MM/YYYY' or null
        this.clockOffsetMinutes = 0
        this.messagesSinceTick = 0
      }

      // { social: { <contactId>: { followers?: delta, following?: delta } } }
      // — added on top of that contact's base count (see socialStats getter),
      // same accumulate-don't-replace behavior as numeric flags.
      if (effects.social) {
        for (const [contactId, delta] of Object.entries(effects.social)) {
          if (!this.socialDeltas[contactId]) {
            this.socialDeltas[contactId] = { followers: 0, following: 0 }
          }
          if (typeof delta.followers === 'number') {
            this.socialDeltas[contactId].followers += delta.followers
          }
          if (typeof delta.following === 'number') {
            this.socialDeltas[contactId].following += delta.following
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
        const ids = Array.isArray(effects.newFollower) ? effects.newFollower : [effects.newFollower]
        for (const id of ids) {
          if (!this.socialDeltas.me) {
            this.socialDeltas.me = { followers: 0, following: 0 }
          }
          this.socialDeltas.me.followers += 1
          this.pushNotification({
            app: 'social',
            contact: id,
            title: this.socialHandle(this.getContact(id)),
            text: i18n.global.t('social.newFollowerNotification'),
          })
        }
      }

      this.evaluateAutomations(depth)
    },

    // --- automations (Données tab) -------------------------------------------
    // A small reactive rule engine layered ON TOP of checkConditions/
    // applyEffects, not a second narrative system: each rule in
    // `game.automations[]` is `{ id, label, requires, action, repeatMode:
    // 'once'|'count'|'unlimited', repeatCount }`. Re-evaluated after EVERY
    // applyEffects() call (the single choke point every flag/entity/
    // collection mutation already flows through) — exact, reacts the instant
    // a mutation happens. ALSO polled every 15s (see `automationPollTimer`,
    // started in loadProject()) for the one case that isn't a mutation at
    // all: a condition on a `schedule` field, whose resolved value changes
    // purely from real time passing.
    //
    // Fires on the FALSE -> TRUE transition only (edge-triggered), never on
    // every re-check while already true — `automationState[id].active`
    // (real save data, not in NON_PERSISTED_KEYS) remembers which side of
    // the condition each rule was on last time, so "already fired" survives
    // a reload. `repeatMode` caps how many transitions are allowed to
    // actually run the action ('once' = 1, 'count' = the author's own
    // number, 'unlimited' = no cap) — a rule can keep flipping true/false
    // past its cap without erroring, it just stops firing.
    //
    // A firing rule ALSO emits the fixed `automation.fired` engine trigger
    // (see triggers.js), same precedent as a button emitting `button.pressed`
    // — lets the Events tab react to it too, chaining into the exact same
    // condition/effects/then machinery, no separate concept needed.
    //
    // `depth` caps the "automation's own effect re-satisfies its own
    // condition" cascade — capped at the TOP (evaluateAutomations), not
    // inside runAutomationAction, so one generation = one full
    // evaluate-then-fire pass. Known gap: a `triggerEntry` action's nested
    // timeline can itself call applyEffects() through unrelated existing
    // call sites that don't thread `depth` through (they never needed to
    // before this) — those re-enter at depth 0, so a badly authored
    // automation reachable ONLY through that path isn't caught. Accepted for
    // now, same spirit as this engine's other documented partial guards
    // (see runThen's own timelineResume-clobber comment).
    evaluateAutomations(depth = 0) {
      if (depth > 5) return
      const automations = this.project?.gameConfig?.automations || []
      for (const rule of automations) {
        if (!rule.id) continue
        const nowTrue = this.checkConditions(rule.requires)
        const state = (this.automationState[rule.id] ||= { active: false, firedCount: 0 })
        if (!nowTrue) {
          state.active = false
          continue
        }
        if (state.active) continue // already true last check — not a new transition
        state.active = true
        const cap =
          rule.repeatMode === 'once'
            ? 1
            : rule.repeatMode === 'count'
              ? (rule.repeatCount ?? 1)
              : Infinity
        if (state.firedCount >= cap) continue
        state.firedCount++
        emitEngineEvent('automation.fired', { automationId: rule.id })
        this.runAutomationAction(rule.action, depth + 1)
      }
    },

    // Subset of the button-action catalog (see useBlockAction.js) that needs
    // no `inject()`-supplied context — an automation isn't rendered inside
    // any specific app screen, so `navigateScreen`/`openSheet`/`closeSheet`/
    // `requestInput` (which all need a CustomAppRenderer ancestor to inject
    // from) aren't offered in its action editor (BlockActionEditor's
    // `excludeKinds`) and are silently ignored here if a saved rule somehow
    // still has one. Everything else — modify values, show a toast, open an
    // app, chain steps, wait, run a scene — is the exact same behavior as a
    // button tap, just fired by a condition instead of a click.
    async runAutomationAction(action, depth = 0) {
      if (!action || action.type === 'none') return
      if (action.requires && !this.checkConditions(action.requires)) return
      const phone = usePhoneStore()
      if (action.type === 'effect') this.applyEffects(action.effects, depth)
      else if (action.type === 'toast') {
        this.triggerActionToast(resolveDynamicText(action.toastText, this))
      } else if (action.type === 'openApp') {
        phone.openApp(action.appId, { screenId: action.screenId || null })
      } else if (action.type === 'sequence') {
        for (const step of action.steps || []) await this.runAutomationAction(step, depth)
      } else if (action.type === 'wait') {
        await new Promise((resolve) => setTimeout(resolve, action.ms || 0))
      } else if (action.type === 'triggerEntry') {
        await new Promise((resolve) => {
          this.runThen(action.then || [], 0, this.currentChapter, resolve)
        })
      }
    },

    // +1 minute of narrative drift every 5 incoming message/dm entries —
    // small enough to feel like time is actually passing during a
    // conversation without being distracting. Reset whenever a chapter
    // pins the clock/date explicitly (see applyEffects above).
    tickClock() {
      this.messagesSinceTick++
      if (this.messagesSinceTick >= 3) {
        this.messagesSinceTick = 0
        this.clockOffsetMinutes++
      }
    },

    // passive battery drain from actually using the phone — -2% every 5
    // incoming message/dm entries. Reset whenever a chapter pins the battery
    // explicitly (see applyEffects above), same idea as the clock drift.
    tickBattery() {
      this.messagesSinceBatteryTick++
      if (this.messagesSinceBatteryTick >= 5) {
        this.messagesSinceBatteryTick = 0
        const prev = this.battery
        this.battery = Math.max(0, this.battery - 2)
        this.checkLowBattery(prev)
      }
    },

    // one ping the instant the battery actually crosses under 20%, not a
    // repeat every tick while it stays below — `prev` is the value just
    // before the mutation that's already landed by the time this runs.
    checkLowBattery(prev) {
      if (prev >= 20 && this.battery < 20) playSound('system-low-battery')
    },

    dismissNotification(id) {
      this.notifications = this.notifications.filter((n) => n.id !== id)
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
      )
    },

    // --- persistence ---------------------------------------------------------
    // window.storieGameSave only exists in a shipped/exported game (see
    // templates/game-shell/src-electron/electron-{main,preload}.js) — the
    // editor's own live preview has no such bridge and stays purely
    // in-memory, reset via loadProject() whenever a project is (re)opened,
    // exactly like before. Saves live in ONE small JSON file at
    // app.getPath('userData')/saves.json (Roaming, keyed by productName —
    // survives a reinstall/update, unlike anything next to the .exe),
    // holding all 3 fixed slots — writes go through activeSlotId (set by
    // loadSlot() once the player's picked one on SlotPickerScreen.vue), so
    // this doesn't touch the other 2 slots.
    save() {
      if (!window.storieGameSave || !this.activeSlotId) return
      const snapshot = { savedAt: Date.now() }
      for (const [key, value] of Object.entries(this.$state)) {
        if (!NON_PERSISTED_KEYS.has(key)) snapshot[key] = value
      }
      // Pinia state holds reactive proxies — Electron's IPC uses the
      // structured clone algorithm, which can't clone those directly (same
      // reasoning as project.js's loadProjectFromDisk JSON round-trip).
      // This also conveniently drops any stray `undefined`.
      window.storieGameSave.write(this.activeSlotId, JSON.parse(JSON.stringify(snapshot)))
    },

    // Settings app's "reset phone" — a fresh save within the CURRENTLY
    // LOADED project and SAME slot, not closing the project or bouncing
    // back to the slot picker. `defaultState()`'s `project` field is `null`
    // (see loadProject()'s own doc comment above), so a bare
    // `Object.assign(this, defaultState())` was wiping the loaded project
    // out from under the editor too — EditorPage.vue's `if (!story.project)
    // router.replace(...)` guard then bounced straight back to
    // open-project, which (via the last-opened-project auto-reload) tried
    // to load a project with no rootPath, loop + error. `activeSlotId` gets
    // the same preserve-through-wipe treatment for the same reason: without
    // it, the very next save() (fired by the wizard's own setPlayerName()
    // right after) would silently no-op, having no slot left to write to.
    resetSave() {
      const project = this.project
      const activeSlotId = this.activeSlotId
      this.stopMusic() // wiping progress shouldn't leave the old track playing under the fresh save
      Object.assign(this, defaultState())
      this.project = project
      this.activeSlotId = activeSlotId
      // Persists the reset immediately rather than waiting for the wizard's
      // own setPlayerName()/setLocale() calls to do it — otherwise quitting
      // between the reset and finishing the wizard leaves the OLD save on
      // disk, silently undoing the reset on next launch.
      this.save()
    },
  },
})
