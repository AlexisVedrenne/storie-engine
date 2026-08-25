# Building a native app in code

This is a guide for a developer adding a brand-new phone app to Stories Engine itself — a Vue
component that ships in every exported game, like Messages, Pixly, Journal, or Email. If you
instead want to know how a *story author* builds an app inside the editor with no code, that's the
no-code app builder — see [Custom apps (no-code)](user-guide/custom-apps-nocode.md) in the user
guide. If you haven't already, read [Architecture](architecture.md) first, especially
[The build boundary](architecture.md#the-build-boundary) and
[The apps system](architecture.md#the-apps-system) — this guide assumes that context.

We'll use the **Email** app (`src/components/apps/email/`) as the running example. It exists
specifically as a proof that a new native app — including one with its own scriptable timeline
entry type — can be built using *only* the documented registry conventions, with zero edits to any
of the engine's core mechanism files.

## The required file shape

At minimum, a new app is a folder at `src/components/apps/<id>/` containing:

```
src/components/apps/<id>/
├── manifest.js     # required
└── App.vue         # required
```

`src/engine/apps/registry.js` auto-discovers every folder shaped like this via two
`import.meta.glob` calls — one for `manifest.js`, one for `App.vue`. Drop in a properly-shaped
folder and it's registered automatically; no other file needs to know it exists. A `manifest.js`
with no matching `App.vue` is skipped with a console warning, not a crash.

### `manifest.js`

```js
// src/components/apps/email/manifest.js
export default {
  id: 'email',
  order: 6,
  labelKey: 'home.apps.email',
  icon: 'mail',
  color: '#3f8cff',
  badge: (story) => (story.customData?.emails || []).filter((e) => !e.read).length,
}
```

| Field | Meaning |
|---|---|
| `id` | Unique app id — used everywhere (`disabledApps`, `appOrder`, `entryApp`, custom-app landing targets). Pick something short and stable; renaming it later breaks every project that references it. |
| `order` | Sort position among apps that don't have a project-specific `appOrder` override. Optional — an app without one sorts after every one that has it. |
| `labelKey` | A key into the shipped-game i18n dictionaries (`src/i18n/<locale>/index.js`'s `home.apps.*`) — **not** a literal string, so the home-screen label is translated in all 5 shipped locales. |
| `icon` | A Material icon name, rendered via `q-icon`. For a custom image instead, import one (`import icon from './icon.png'`) and set `iconImage` instead of/alongside `icon` — `HomeScreen.vue`/`SetupWizard.vue` prefer `iconImage` (a full-bleed tile) over `icon` (a centered glyph on `color`) when both are present. |
| `color` | Background color behind the icon glyph, and generally this app's accent color throughout its own screens. |
| `badge(story)` | A function taking the live `story` store, returning a number for the home-screen unread badge. Return `0` (or a function that always returns `0`) if the app has no "unread" concept — see Journal's manifest. |

### `App.vue`

A normal Vue SFC. `PhoneShell.vue` mounts whichever app's component matches `phone.currentApp`
full-screen inside the phone frame. There's no required prop contract beyond that — an app reads
whatever it needs directly from the `story`/`phone` Pinia stores, same as every native app does.
Styling can be one inline `<style scoped>` block (what the 5 original built-ins use) or split into
a sibling `App.css` via `<style scoped src="./App.css">` — the registry doesn't care either way.

## Registering it so it's toggleable per project

Nothing extra is needed for the app to *appear* — auto-discovery handles that. What makes it
**toggleable per-project** is also already generic: `GameForm.vue`'s "Applications" panel iterates
`story.mergedAppRegistry` (native `APP_REGISTRY` + the project's own custom apps, normalized to one
shape) and writes to `game.disabledApps` (an id opt-out list) and `game.appOrder` (a full id list,
used by `orderedAppList()`). Both fields use the "absent = default" convention, so a project
authored before your app existed keeps working with zero migration — your app just shows up,
enabled, in its manifest `order` position.

You don't write any registration code for this — it falls out of shipping a correctly-shaped
`manifest.js`.

## Giving it its own timeline entry type

If your app needs authors to be able to script content into it from the chapter timeline (an
incoming email, in Email's case), add `src/components/apps/<id>/entryType.js`. It's picked up the
same way — `src/engine/apps/entryTypeRegistry.js` globs every `*/entryType.js` eagerly and builds
two exports (`CUSTOM_ENTRY_TYPES`, `CUSTOM_ENTRY_TYPE_BY_TYPE`) that four "mechanism" files each
consult through exactly one additive fallback:

- `story.js`'s `processEntry()` — `default` case calls `customType.process(entry, { story, chapter })`.
- `TimelineEditor.vue` — merges `CUSTOM_ENTRY_TYPES` into the "add entry" picker's options, and
  falls back to `CUSTOM_ENTRY_TYPE_BY_TYPE[type].defaultEntry(ctx)` when adding one.
- `src/project/extractTranslatableStrings.js` — calls `customType.extractText(entry)` so your
  entry's text gets picked up by the translation editor.
- `src/engine/apps/appIds.js`'s `ENTRY_TYPE_APP` — spreads in `def.app` for every custom type, so
  disabling your app hides the entry type from the picker and silently skips already-authored
  entries at runtime, same as a built-in type scoped to a disabled native app.

None of those files need editing when you add a new plug-in type — you're adding a new module that
those already-generic fallbacks pick up.

### The contract, in full — `entryType.js`

```js
// src/components/apps/email/entryType.js
import EmailEntryForm from './EmailEntryForm.vue'

export default {
  type: 'email',        // entry.type value — must be globally unique
  app: 'email',          // owning app id — must match manifest.js's id
  icon: 'mail',
  label: 'Email',         // shown in TimelineEditor's "add entry" dropdown
  help: 'An email the player receives — appears in the Email app...',
  form: EmailEntryForm,   // the authoring form component (see below)

  defaultEntry() {
    return { type: 'email', fromEmail: '', fromName: '', subject: '', text: '' }
  },

  process(entry, { story }) {
    story.customData.emails ??= []
    const subject = story.fill(entry.subject) || '(no subject)'
    const fromName = story.fill(entry.fromName) || entry.fromEmail || ''
    story.customData.emails.unshift({
      id: entry.id || `email-${Date.now()}-${story.customData.emails.length}`,
      fromEmail: entry.fromEmail || '',
      fromName,
      subject,
      text: story.fill(entry.text) || '',
      ts: entry.ts || new Date().toISOString(),
      read: false,
    })
    story.pushNotification({ app: 'email', title: fromName, text: subject })
  },

  extractText(entry) {
    return [entry.fromName, entry.subject, entry.text]
  },

  collectReferences() {
    return [] // no link to project.contacts — sender is free text
  },
}
```

`process(entry, ctx)` gets `ctx.story` — the **full Pinia store instance** — and `ctx.chapter`.
That's the same access a built-in type's `processEntry` case has: `story.fill()` for
translation+`{name}` interpolation, `story.pushNotification()` for a lock-screen banner,
`story.customData` as your app's own free-form persisted namespace (it's part of the save file,
not `NON_PERSISTED_KEYS` — keep whatever you put there JSON-safe). There's no sandboxing here; a
plug-in type has the same power a built-in `processEntry` case does, deliberately, since it's
meant to cover cases the built-ins genuinely can't (a received note/document/whatever) without
inventing a second, restricted API.

`defaultEntry(ctx)` receives `{ firstContactId() }` if you need a sensible default contact — Email
doesn't, since its sender is free text, not a project contact.

### Where the authoring form lives

`form: EmailEntryForm` points at a Vue component (`EmailEntryForm.vue`) that edits `entry`'s own
fields — normal `v-model="entry.subject"` bindings, since (per the build-boundary rule) `entry` is
the live reactive object shared with the running preview.

**Important placement detail**: `EmailEntryForm.vue` lives at `src/components/apps/email/`, not
`src/editor/components/entries/` where every *built-in* type's form lives. That's not a style
choice — `entryTypeRegistry.js` statically imports `form` (`import EmailEntryForm from
'./EmailEntryForm.vue'`) as part of building `CUSTOM_ENTRY_TYPES`, and that registry module itself
lives under `src/engine/`, which **ships**. If the form component lived under `src/editor/`, the
exported-game build would try to bundle a component that imports from a directory that was never
copied into the shell — a real failure this project hit once (see `shellAssembly.js`'s comment on
why `src/components/shared/` was moved out from under `src/editor/`): the build succeeds in the
editor's own dev server (everything is on disk there) and only fails once you actually try to
export a game. **A plug-in entry type's form component must live inside the app's own folder or
under `src/components/shared/`, never under `src/editor/`.**

### How the editor-side label gets translated without touching the shared file

`label`/`help` above are **French** — genuine, non-fallback text baked into a file that ships. The
editor UI still needs to show them in whichever of its 5 languages the author is using, without
`entryType.js` importing anything editor-only. `src/editor/i18n/sharedOverrides.js` bridges this:

```js
export function entryTypeLabel(def) {
  if (!def) return ''
  return editorTOptionalPath(['entryTypes', def.type, 'label']) ?? def.label
}
```

`TimelineEditor.vue` calls `entryTypeLabel(CUSTOM_ENTRY_TYPE_BY_TYPE[type])` instead of reading
`def.label` directly — it looks up an override keyed by `entryTypes.email.label` in the editor's
own dictionaries first, falling back to the original French text authored in `entryType.js`
unchanged if no override exists for the current editor language. `entryType.js` itself never knows
this layer exists. If you want your entry type's label properly translated in the editor's other 4
languages, add `entryTypes.<type>.label`/`.help` entries to each of
`src/editor/i18n/{en-US,es-ES,de-DE,it-IT}.js` — optional, but worth doing for consistency with the
rest of the editor.

## Adding a new event trigger

If your app needs authors to react to something the player does in it (an event, in the
"conditions & effects" sense — see [Conditions, effects, flags, events](architecture.md#conditions-effects-flags-events)),
add an entry to the catalog in `src/engine/events/triggers.js`:

```js
{
  name: 'email.opened',          // unique trigger name, dot-namespaced by convention
  app: 'email',                   // groups it under your app in the Events tab's "add" menu
  label: 'Email ouvert',          // French — same shared-file/sharedOverrides.js relationship as
                                   //   entry-type labels above; add a `triggers.email.opened.label`
                                   //   override to src/editor/i18n/*.js if you want it translated
  matchFields: [
    { key: 'emailId', label: 'Email', optionsFrom: 'projectEmails' }, // if you add such a source
  ],
},
```

Then, wherever the actual thing happens (your `App.vue`, most likely), call:

```js
import { emit } from '@/engine/events/eventManager'
emit('email.opened', { emailId: mail.id })
```

`ENGINE_TRIGGERS` (re-exported from `eventManager.js`) is derived from this catalog automatically
— `story.loadProject()` subscribes to every trigger in it, so adding a catalog entry is the only
step needed for `game.events` authored against your trigger to actually fire.

## i18n: which bucket does what

| Text | Where it lives | Ships? |
|---|---|---|
| Player-facing UI strings your `App.vue` renders (empty states, buttons, section titles) | `src/i18n/<locale>/index.js`, under a key namespaced to your app (e.g. `email.empty`) — **all 5 locales** | Yes |
| Your `entryType.js`'s `label`/`help` | Written directly in the file, French, as shown above | Yes |
| Editor-facing strings — a config/admin form for your app in `GameForm.vue` or elsewhere in the editor | `src/editor/i18n/<locale>.js` — all 5 editor locales | Never |
| Editor-side override of your (shipped) `label`/`help`/trigger label | `src/editor/i18n/sharedOverrides.js` convention — add `entryTypes.<type>.*` / `triggers.<name>.*` keys to the editor dictionaries | Never (it's the override, not the fallback) |

Leaving a shipped-game string in only one locale isn't a build error, but it means players in the
other 4 languages see raw French — check `src/i18n/*/index.js` for the existing key shape and
match it across all 5 files.

## The build boundary, concretely

Everything under `src/components/apps/<id>/` ships in every exported game (it's on
`shellAssembly.js`'s copy list). Concretely, that means:

- **Never** `import ... from '@/editor/...'` anywhere in your app folder — not in `App.vue`, not
  in `manifest.js`, not in `entryType.js`, not in a form component. It will resolve fine in the
  editor's own `pnpm run dev:electron` (the whole repo is on disk there) and then fail to resolve
  the moment someone runs Build or LAN Preview, because the assembled shell genuinely doesn't
  contain `src/editor/`.
- **Never** `import ... from '@/project/...'` — same reasoning; `src/project/` is editor-only
  pure-JS tooling (chapter-graph layout, search, validation), not copied either.
- **Do** import from `@/engine/...`, `@/components/{apps,phone,shared}/...`, `@/i18n/...`,
  `@/boot/...`, `@/css/...`, `@/utils/...`, or any third-party package already a dependency of the
  main project (`package.json`, not `templates/game-shell/package.json` — the shell's own
  dependencies are fixed by the vendored install, see [Vendoring](architecture.md#vendoring-why-no-internet-access-is-needed)
  in the architecture doc).
- If you genuinely need to share a small utility between an editor authoring form and your app's
  runtime code, put it in `src/components/shared/` — it's copied into every shell specifically
  because it sits at that intersection (see `EmojiPickerBtn.vue`/`IconPickerBtn.vue`, used by both
  editor forms and by `EmailEntryForm.vue`).

There's no lint rule catching a stray `@/editor/` import today — the only signal is a build that
fails to resolve a module, and it only shows up when someone actually runs Build/LAN Preview, not
in everyday editor development. Double-check your imports by eye, or grep your new files for
`from '@/editor` / `from '@/project` before considering the app finished.

## Worked example, end to end

Putting it together, a minimal new "Notes" app (a read-only list the player can't write to,
scriptable from the timeline) would be:

```
src/components/apps/notes/
├── manifest.js       # { id: 'notes', order: 8, labelKey: 'home.apps.notes',
│                      #   icon: 'sticky_note_2', color: '#f5c518', badge: () => 0 }
├── App.vue            # reads story.customData.notes, renders a list
└── entryType.js        # type: 'note', app: 'notes', process() pushes into
                         #   story.customData.notes (mirrors entryType.js's email pattern above)
```

Plus:

1. Add `home.apps.notes` (and any other player-facing strings your `App.vue` uses) to all 5
   `src/i18n/<locale>/index.js` files.
2. If notes need their own event trigger (e.g. `note.read`), add it to `triggers.js` and `emit()`
   it from `App.vue`.
3. Grep your new files for `@/editor`/`@/project` imports — there should be none.
4. Run a real export (or LAN preview) at least once before calling it done — the editor's own dev
   server can't catch a build-boundary violation, only an actual `quasar build -m electron` run
   through the assembled shell can.

That's the whole surface. No file outside `src/components/apps/notes/` needs to change, and no
core engine file needs a new `case` — every mechanism this guide describes is already generic.
