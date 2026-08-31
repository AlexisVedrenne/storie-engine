// Global, per-editing-session undo/redo — ONE shared history across every
// resource EditorPage.vue lets you edit (a chapter, the whole contacts/
// threads array, gameConfig, a custom app, an i18n/seed bucket), not scoped
// to whichever tab happens to be open. Switching tabs no longer wipes
// history — undoing an edit made in a different tab auto-navigates the UI
// there (see navigateToResource, passed in by the caller) so the reverted
// content is actually visible, not just silently changed off-screen.
//
// Deliberately NOT a module-level singleton like useAssetLibrary.js/
// useCloudSync.js: those are shared because several sibling components must
// observe the same live state, while undo history has exactly one consumer
// (EditorPage.vue), so a fresh instance per page mount is simpler and avoids
// needing an explicit .clear() wired into closeProject().
import { ref, computed, nextTick } from 'vue'
import { Notify } from 'quasar'
import { useEditorI18n } from '@/editor/i18n'

// Shared across every resource in the project now (used to be per-resource),
// so a burst of edits to one chapter shouldn't evict a contact edited five
// minutes earlier — bumped up from the per-resource default accordingly.
const DEFAULT_MAX_UNDO_STEPS = 150
// Coalescing window — deliberately separate from EditorPage.vue's own
// AUTOSAVE_DEBOUNCE_MS (1200ms): that one exists to avoid hammering disk
// I/O, this one exists so a continuous typing burst collapses into ONE undo
// step instead of one every 1200ms of uninterrupted typing (which would
// rarely even trigger mid-burst, making the "debounce" pointless for its
// actual goal here). Overridable via `commitDebounceMs` so the caller's own
// named constant (next to AUTOSAVE_DEBOUNCE_MS) is the single source of
// truth rather than a second magic number buried in here.
const DEFAULT_COMMIT_DEBOUNCE_MS = 600

function cloneDeep(value) {
  return JSON.parse(JSON.stringify(value))
}

// Order-independent structural equality — NOT `JSON.stringify(a) ===
// JSON.stringify(b)`. Needed because replaceInPlace()'s delete-then-
// Object.assign reconstruction can leave the live object's key insertion
// order different from a freshly cloneDeep()'d snapshot even when every
// value is identical (Object.assign only appends genuinely-new keys;
// survivors keep their old position) — after a few undo/redo round-trips, a
// string comparison would report "changed" on pure no-op navigation and
// pollute the global history with phantom entries.
function deepEqual(a, b) {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (a === null || b === null) return a === b
  if (typeof a !== 'object') return a === b
  if (Array.isArray(a) !== Array.isArray(b)) return false
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false
    return a.every((v, i) => deepEqual(v, b[i]))
  }
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  return aKeys.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]))
}

// Resource-descriptor equality — deliberately coarser than deepEqual: e.g.
// 'game'/'events'/'interactions' all collapse to the same {kind:'game'}
// descriptor since they share one file on disk (gameConfig), so hopping
// between those three tabs is NOT a resource change for undo purposes (only
// for navHint, see below).
export function descriptorsEqual(a, b) {
  if (a === b) return true
  if (!a || !b || a.kind !== b.kind) return false
  switch (a.kind) {
    case 'chapter':
    case 'app':
      return a.id === b.id
    case 'i18n':
      return a.locale === b.locale && a.bucket === b.bucket
    case 'seed':
      return a.bucket === b.bucket
    default:
      return true // contacts/threads/game — singleton kinds, no sub-id
  }
}

// Mutates `target` in place — never reassigns the reference. Load-bearing:
// ContactList.vue/ThreadList.vue capture `const contacts = story.project.contacts`
// once at setup() (not a computed), so replacing that array's identity would
// silently detach those components from the store. TimelineEditor.vue reads
// props.entries fresh on every access and would tolerate either approach,
// but one uniform rule beats a special case per consumer.
function replaceInPlace(target, snapshot) {
  const clone = cloneDeep(snapshot)
  if (Array.isArray(target)) {
    target.splice(0, target.length, ...clone)
  } else {
    for (const key of Object.keys(target)) {
      if (!(key in clone)) delete target[key]
    }
    Object.assign(target, clone)
  }
}

// `currentDescriptor`/`resolveResource`/`navigateToResource` are injected by
// EditorPage.vue (which owns viewMode/selection state) rather than living
// here, keeping this composable store-agnostic:
//   currentDescriptor(): () => descriptor | null — identity of whatever's
//     currently being edited.
//   resolveResource(descriptor): descriptor => live object/array | null —
//     may return null if the target was deleted since (e.g. a chapter
//     removed via the graph).
//   navigateToResource(descriptor, navHint): (descriptor, navHint) => bool —
//     mutates viewMode/selection to make currentDescriptor() match; returns
//     false if the target no longer exists.
export function useUndoHistory(
  currentDescriptor,
  resolveResource,
  navigateToResource,
  {
    commitDebounceMs = DEFAULT_COMMIT_DEBOUNCE_MS,
    maxSteps = DEFAULT_MAX_UNDO_STEPS,
    navHint = () => null,
  } = {},
) {
  const { t } = useEditorI18n()
  const undoStack = ref([]) // [{ descriptor, snapshot, navHint }]
  const redoStack = ref([])
  // Snapshot of the resource at `baselineDescriptor` before the batch of
  // edits currently being coalesced — null when nothing's tracked yet.
  let baseline = null
  let baselineDescriptor = null
  let commitTimer = null
  // True only while undo()/redo() itself is mutating a resource, so the
  // caller's own deep watch (which drives notifyMutated()) doesn't record
  // our own replaceInPlace() as a new undoable edit.
  let applying = false

  function flushPendingCommit() {
    if (commitTimer != null) {
      clearTimeout(commitTimer)
      commitTimer = null
    }
    if (baseline == null || baselineDescriptor == null) return
    const live = resolveResource(baselineDescriptor)
    if (!live) {
      // Tracked resource vanished (deleted via a structural op elsewhere) —
      // nothing sane to commit against, drop it.
      baseline = null
      baselineDescriptor = null
      return
    }
    const current = cloneDeep(live)
    if (deepEqual(current, baseline)) return // pure navigation, no real edit — don't pollute history
    undoStack.value.push({ descriptor: baselineDescriptor, snapshot: baseline, navHint: navHint() })
    if (undoStack.value.length > maxSteps) undoStack.value.shift()
    baseline = current
    redoStack.value = []
  }

  // Called from EditorPage.vue's own deep watcher on activeResource, right
  // alongside where it sets dirty.value = true — this composable never
  // watches anything itself, it's driven externally so there's only ever
  // one deep watcher in the whole editor, not two racing each other.
  function notifyMutated() {
    if (applying) return
    const d = currentDescriptor()
    if (baseline == null || !descriptorsEqual(d, baselineDescriptor)) {
      const live = resolveResource(d)
      baseline = live ? cloneDeep(live) : null
      baselineDescriptor = live ? d : null
    }
    clearTimeout(commitTimer)
    commitTimer = setTimeout(() => {
      commitTimer = null
      flushPendingCommit()
    }, commitDebounceMs)
  }

  // Called every time EditorPage.vue's own re-arm watcher fires (viewMode/
  // selection changed) — flushes whatever was pending on the OLD resource
  // into the global history, then starts tracking the new one. Returns
  // whether the resource identity actually changed (vs. e.g. hopping
  // between Jeu/Events/Interactions, which all share one descriptor) so the
  // caller can decide whether to reset its own `dirty` flag.
  function resync() {
    const d = currentDescriptor()
    const changed = !descriptorsEqual(d, baselineDescriptor)
    flushPendingCommit()
    if (changed) {
      const live = resolveResource(d)
      baseline = live ? cloneDeep(live) : null
      baselineDescriptor = live ? d : null
    }
    return changed
  }

  async function applyEntry(entry, targetStack) {
    if (!descriptorsEqual(entry.descriptor, currentDescriptor())) {
      const ok = navigateToResource(entry.descriptor, entry.navHint)
      if (!ok) return false
      // Lets EditorPage.vue's own re-arm watcher (triggered by the ref
      // changes navigateToResource just made) run resync() and refresh
      // baseline/baselineDescriptor onto the newly-navigated resource
      // BEFORE we read/mutate it below.
      await nextTick()
    }
    const live = resolveResource(entry.descriptor)
    if (!live) return false
    const before =
      baseline != null && descriptorsEqual(baselineDescriptor, entry.descriptor)
        ? baseline
        : cloneDeep(live)
    applying = true
    replaceInPlace(live, entry.snapshot)
    // A second, separate nextTick(): the mutation above only just happened,
    // so the (possibly freshly re-subscribed) deep watcher on this resource
    // hasn't run its queued callback yet — wait for it before releasing the
    // guard, same reasoning as the single-resource case, just one tick later
    // than the navigation's own tick.
    await nextTick()
    applying = false
    baseline = cloneDeep(live)
    baselineDescriptor = entry.descriptor
    targetStack.value.push({ descriptor: entry.descriptor, snapshot: before, navHint: navHint() })
    return true
  }

  async function undo() {
    flushPendingCommit()
    if (!undoStack.value.length) return
    const entry = undoStack.value.pop()
    const applied = await applyEntry(entry, redoStack)
    if (!applied) Notify.create({ type: 'warning', message: t('editorPage.undoTargetGone') })
  }

  async function redo() {
    flushPendingCommit()
    if (!redoStack.value.length) return
    const entry = redoStack.value.pop()
    const applied = await applyEntry(entry, undoStack)
    if (!applied) Notify.create({ type: 'warning', message: t('editorPage.undoTargetGone') })
  }

  return {
    canUndo: computed(() => undoStack.value.length > 0),
    canRedo: computed(() => redoStack.value.length > 0),
    undo,
    redo,
    notifyMutated,
    resync,
  }
}
