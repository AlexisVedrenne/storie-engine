# Custom apps (no-code)

Beyond the built-in apps (Messages, Pixly, Calls, Gallery, Journal, Email, Settings), you can build
your own phone app entirely inside the editor — no coding involved — from the **Apps** tab. Think
a banking app, a note-taking app, a fictional forum, a fake dating app — anything that fits the
"screen made of stacked components" shape.

![The Apps tab's block builder, with the live phone preview](../images/custom-app-builder.png)

If you're a developer looking to add a genuinely new native app written in Vue instead (like
Messages or Journal), see [Building a native app in code](../creating-custom-apps.md) — that's a
different, code-based path aimed at extending the engine itself.

## How it works

A custom app is a **screen made of blocks**, stacked and nested. You drag blocks in from a
palette, arrange them, and fill in their fields — every change shows up instantly in the live phone
preview next to the editor, exactly like editing a chapter's timeline.

An app can have multiple **screens** (switchable via a `tabs` block), and everything you build is
saved as part of your project, ready to export like everything else.

## The block catalog

| Block | What it does |
|---|---|
| **Header** | A title + icon + color band at the top of a section. |
| **Text** | A paragraph or label, with a style (body, heading, etc). |
| **Image** | A picture, optionally full-bleed. |
| **Avatar** | A round profile picture/initial, with a color. |
| **Row** | An icon + label + optional sublabel + optional chevron — a settings-style list row. |
| **Card** | A container with a visible background, for grouping other blocks. |
| **Layout** | A plain flex container (row or column) with no background — for arranging other blocks without the visual weight of a card. |
| **Badge** | A small colored label/pill. |
| **Divider** | A horizontal rule. |
| **Button** | See [Buttons](#buttons) below. |
| **Tabs** | Switches which screen of the app is currently shown. |
| **List** | Repeats a block template once per item — see [Lists](#lists) below. |
| **Conversations** | A real chat module — see [Conversations](#conversations) below. |

Every block can be **dragged** between containers (not just reordered in place), **duplicated**,
and given a **condition** — a block whose condition doesn't hold is entirely absent, not just
hidden with CSS, exactly like a timeline entry's `requires`. A handful of presets (a ready-made
profile header, a stats row, etc.) are available to start from instead of building common patterns
block by block.

### Buttons

A button can do one of three things:

1. **Nothing** — purely visual/decorative.
2. **Apply effects** — the same effects system used everywhere else (flags, phone widgets...).
3. **Navigate to a screen** — switch this app's active screen, the same mechanism the Tabs block
   uses.

Every button press also fires the `button.pressed` event (with the app id and an optional button
id as payload), which you can react to from the **Events** tab exactly like any other trigger — see
[Events](conditions-and-flags.md#events).

### Lists

A `list` block repeats a block **template** — a small subtree you design once — once per item from
one of two sources:

- **Contacts** — every project contact (optionally filtered to only the ones the player follows).
- **A flag collection** — one of your [flag collections](conditions-and-flags.md#flags), so a list
  can display a growing history/ledger/inventory the story has been building up via effects.

Inside the template, text fields can reference the current item with `{item:...}` tokens (a
contact's name, pseudo, follower count, color — or a collection item's key/value, depending on the
source).

### Conversations

The `conversations` block is the one genuinely interactive block — a full chat module (a thread
list plus a message view with choice-driven replies), reusing the exact same underlying engine as
Pixly's native DMs. Thread **definitions** (who's in a group, its name) come from the project's own
**Threads** tab, same as everywhere else — you don't re-author who's in a conversation separately
per app. Only the actual **message history** is kept separate per app, so a custom app's chat never
mixes with native Messages/DM or with another custom app's own conversations.

To script messages into a custom app's conversation from the timeline, use the **DM (app)**
("appDm") entry type and an app-scoped **choice**, both of which appear in the timeline's "add
entry" menu once your app has a `conversations` block somewhere. If you send a player straight into
a custom app's conversation via a `timeskip`'s landing option (see
[Writing chapters](writing-chapters.md)), the unread badge/notification for that exact thread is
suppressed the same way it would be for a conversation the player already has open.

## Variables and translation

Any text field on a block can interpolate live values with `{...}` tokens — `{flag:someKey}` for a
flag's current value, plus fixed tokens like `{playerName}`, `{battery}`, `{steps}`,
`{stepsGoal}`, `{weather}` — with a "Variable" button next to each relevant field, same idea as the
emoji picker button found throughout the editor.

A custom app's text goes through the same "common" translation bucket as contact names and bios —
see [Translations](assets-and-translations.md#translations) — so it's translated the same way as
everything else that isn't tied to one specific chapter.

## Icons

Every icon field in the project — a custom app's own icon on the home screen, a block's icon, an
interaction step's icon — uses the same **icon picker** (a searchable Material-icon browser), not
just custom apps specifically.

## Storage and sharing

A custom app is stored as one file, `apps/<id>.json` — plain JSON, not executable code. This makes
it easy to export a single app (data + whatever assets it references) as a `.zip` and import it
into a *different* project — asset paths get renamed to avoid collisions with anything already in
the target project's `assets/` folder, and the app's own id is de-collided too if needed. Handy for
reusing a "settings-style app" you built once across multiple stories.

## Enabling and ordering

Like every native app, a custom app appears in the **Game** tab's Applications panel, where you can
toggle it on/off per project and drag it into whatever home-screen order you want, right alongside
Messages/Pixly/etc. — native and custom apps share one merged list, with no special treatment for
either kind.

## Next steps

- [Conditions, flags, and reactions](conditions-and-flags.md) — the condition/effects system
  blocks and buttons plug into.
- [Assets, sound, and translations](assets-and-translations.md) — importing images your blocks
  reference, and translating your app's text.
