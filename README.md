# Stories Engine

**Stories Engine** is a free, open-source editor for writing narrative games that a player
experiences through a fake smartphone — text messages, an Instagram-style social feed, phone
calls, a photo gallery, a journal, and settings, all inside a believable little phone UI. You write
your story once, branching it with a visual chapter graph, flags, and conditions, and export it as
a standalone game for Windows, macOS, Linux, or Android — no coding required, no engine dependency
for the player, no account, no internet connection needed to play. It's aimed at writers who want
to tell an interactive story in the "found phone" / epistolary format without becoming a
programmer to do it.

> 📸 SCREENSHOT NEEDED: hero shot — the editor window (authoring panel + live phone preview side
> by side), ideally with an interesting chapter open.

> 📸 SCREENSHOT NEEDED: the phone UI on its own, full-screen preview mode, showing a chat
> conversation or the Pixly social feed.

> 📸 SCREENSHOT NEEDED: the chapter graph with several connected chapters and at least one
> conditional arrow — gives a sense of the branching-story authoring experience.

## Who this is for

- **Writers** who want to build an interactive, phone-format visual novel without writing code —
  see the [user guide](docs/user-guide/README.md).
- **Developers** who want to extend the engine itself — new native apps, new mechanics, or just
  understanding how it fits together — see [Architecture](docs/architecture.md) and
  [Building a native app in code](docs/creating-custom-apps.md).

## Quick start

Stories Engine is a [Quasar](https://quasar.dev/)/Vue 3 app that runs as an Electron desktop app.

```bash
pnpm install
pnpm run dev:electron
```

This launches the editor itself in development mode (hot-reload, dev tools). `pnpm run dev` (no
`:electron`) runs it as a plain browser SPA instead, if you just want to poke at the UI without a
native window.

To build/export games or use the LAN phone preview from a local dev checkout, you first need to
vendor the engine's own build shell once (a pre-installed copy of the runtime this pipeline
assembles projects into — see [Architecture: vendoring](docs/architecture.md#vendoring-why-no-internet-access-is-needed)
for why this exists):

```bash
pnpm run vendor:game-shell
```

Then, from inside the running editor: **Build** (desktop `.exe`/`.app`/Linux binary, and/or
Android) or **Preview on your phone** (serves the open project on your local network). Or from the
command line, for a packaged build of the editor itself:

```bash
pnpm run build:electron        # current platform
pnpm run build:electron:win    # Windows
pnpm run build:electron:linux  # Linux
pnpm run build:electron:mac    # macOS
```

Linting/formatting:

```bash
pnpm run lint         # fix
pnpm run lint:check   # check only
```

See [`package.json`](package.json) for the full script list.

## How it's organized

- **[docs/architecture.md](docs/architecture.md)** — the technical map: the editor/runtime split,
  the Pinia stores, the three i18n systems, the plug-in entry-type mechanism, the build pipeline.
  Start here if you're contributing code.
- **[docs/creating-custom-apps.md](docs/creating-custom-apps.md)** — a practical guide to adding a
  new native phone app (like Messages or Journal) written in Vue.
- **[docs/user-guide/](docs/user-guide/README.md)** — the full author-facing guide: writing
  chapters, conditions and flags, the no-code custom-app builder, assets and translations,
  building/exporting, and a pre-publish checklist.

## Contributing

Issues and pull requests are welcome. Before touching engine code, read
[Architecture](docs/architecture.md#the-build-boundary) for the one rule that matters most: code
under `src/engine/` and `src/components/{phone,apps,shared}/` ships in every exported game and must
never import from `src/editor/` or `src/project/` (which never ship) — it's easy to miss because
the editor's own dev server won't catch the mistake, only a real export will.

## License

MIT — see [LICENSE](LICENSE). Bundled default assets (sounds, etc.) have their own attribution —
see [ASSETS_LICENSES.md](ASSETS_LICENSES.md).
