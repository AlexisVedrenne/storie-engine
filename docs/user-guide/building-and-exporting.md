# Building and exporting

When your story is ready to share, Stories Engine turns your project into a standalone game —
something a player can run without installing Stories Engine, without an internet connection, and
without any account. This page covers the actual export, plus the two ways to test a project
before you get there: the LAN phone preview and cloud sync.

## Validation before you build

Before a build actually runs, the editor checks your project for problems that would otherwise
surface as confusing bugs at runtime instead of clear errors now:

- Every reference to a contact or thread actually exists.
- Your entry chapter, and every chapter-graph arrow's target, points at a real chapter.
- Every chapter is reachable from the entry chapter (a chapter walked to by no path is flagged as
  a warning — probably orphaned content, or a missing arrow).
- A chapter where every outgoing arrow is conditional and none is a guaranteed fallback is flagged
  (risk of a silent, unintended ending if none of the conditions ever hold at that point).
- A duplicate condition on two arrows leaving the same chapter is flagged (the second one can never
  actually be taken).
- Every asset your project references actually exists on disk.

Errors block the build outright; warnings ask you to confirm you want to proceed anyway.

## The build assistant

The build assistant walks through three steps:

1. **Version** — bump your project's version number (none / patch / minor / major), written
   immediately to your project's manifest.
2. **Distribution targets** — check off which platforms to build for: desktop (Windows/macOS/Linux)
   and/or Android.
3. **Build** — progress, then the finished output copied to a folder you choose.

> 📸 SCREENSHOT NEEDED: the build assistant's distribution-targets step, with desktop and Android
> both checked.

Under the hood, every target builds from the same assembled copy of your project and the engine —
there's no separate pipeline to keep in sync between desktop and Android; see
[Architecture: the build/export pipeline](../architecture.md#the-buildexport-pipeline) if you want
the technical detail.

You can set a custom icon for the built desktop app from the Game tab (an `.ico` file is
recommended for a proper Windows taskbar/Explorer icon).

### Android export

Building for Android needs a Java/Android toolchain that isn't bundled with the editor by default
(it's large) — the first time you check the Android target, the editor downloads it for you, once
per machine, with its own progress bar. After that first download, Android builds work offline like
everything else.

### Where the output goes

Once a build finishes, you're asked where to copy the finished output — the editor cleans up its
own temporary working folder afterward (retrying automatically if Windows is briefly still holding
a lock on something, which happens occasionally right after a build finishes).

## Save slots in the exported game

An exported game gives the player **3 fixed save slots**, chosen on a dedicated screen the first
time they launch (or whenever they return to it) — each slot shows the chapter title and a relative
timestamp if it's already in use, and can be deleted from that screen. Once in a game, a player can
switch slots at any time from Settings ("Change save") without losing the progress in the slot
they're leaving. Saves are stored locally on the player's machine, entirely separate from anything
in Stories Engine itself.

## The LAN phone preview

The desktop preview inside the editor is convenient, but it's still a mouse-and-keyboard window —
not the most honest test of a touch interface. The **web preview** feature serves your currently
open project as a real webpage on your local network: start it, and any phone on the same Wi-Fi can
open the given address in its own browser and play your story with real touch input.

> 📸 SCREENSHOT NEEDED: the web-preview dialog showing the LAN URL/QR code, and (if possible) a
> phone browser screenshot showing the game running.

Only one preview session runs at a time — starting a new one stops whatever was already running,
and closing the preview dialog always stops the server. No separate install or account needed on
the phone; it's just a webpage.

## Cloud sync

If you want your project backed up, or to move it between two machines, Stories Engine can push and
pull a whole project (chapters, contacts, assets, custom apps — everything) to your **own** cloud
storage account — Google Drive, OneDrive, Dropbox, and dozens of others. There's no Stories Engine
cloud service behind this: it's powered entirely by [rclone](https://rclone.org/), a well-known
open-source tool that handles the actual provider connection and authentication; Stories Engine
just drives it.

- **Push** and **pull** are explicit, manual actions — nothing syncs automatically in the
  background by default, though there's an optional toggle for a quiet auto-save push every 5
  minutes if you want that.
- Only one cloud account is connected at a time. Disconnecting is a two-step process: disconnect
  the account, then separately choose whether to also delete the data you'd pushed remotely.
  Nothing is deleted by simply disconnecting.
- The last-synced state is recorded inside the project itself, so picking the project back up on a
  *different* machine after a pull shows you exactly when it was last pushed and from where.
- You can also pull a project straight from the cloud from the "open project" landing screen,
  before opening anything local — see [Getting started](getting-started.md).

Cloud sync is purely an editor convenience — it's never bundled into anything you export; a player
never touches it.

## Next steps

- [Publishing checklist](publishing-checklist.md) — a final pass before you actually share your
  story.
