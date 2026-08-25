# Publishing checklist

A last pass before you share a build with the world — on itch.io, GitHub Releases, or anywhere
else. None of this is enforced by the tool; it's a checklist, not a gate.

## Inside the editor

- [ ] Run **Validate project** (see [Building and exporting](building-and-exporting.md#validation-before-you-build))
      and resolve every error; read through the warnings and confirm each one is intentional.
- [ ] Open the **flags catalog** (Game tab) and check for any flag flagged as "read but never
      set" — almost always a leftover from a cut branch or a typo in a flag name.
- [ ] Walk the **chapter graph** for chapters with no incoming arrow (orphaned content nobody will
      ever see) and chapters flagged as unreachable by validation.
- [ ] If your story has more than one ending, confirm each is actually reachable, and that your
      end-screen text/image is filled in for each one (or that you're happy with the generic
      fallback).
- [ ] If you're shipping more than one language, use the **i18n** tab's "hide already translated"
      filter per locale to find what's left, and check for orphaned entries left behind by later
      edits to the source text.
- [ ] If you toggled the **mature content** warning on, make sure that's actually what you want —
      it's the very first thing every player sees, before even the boot animation.
- [ ] Check the **Assets** tab for orphaned files you meant to delete, and for anything referenced
      that's still missing (validation catches the missing case, but a stray orphan is worth a
      manual glance too).
- [ ] Play through your story at least once, start to finish, in the actual exported build (not
      just the editor's live preview) — see the next section.

## Test the actual exported build

The editor's live preview runs the same engine code a build ships, but it's still worth testing the
*real* output before calling something final:

- [ ] Export a desktop build and actually run the packaged app, not just the preview — check that
      your custom build icon (if you set one) shows up correctly, and that the game launches
      cleanly with no project loaded (a common gap: something that only worked because the editor
      had a project already open).
- [ ] Play through with a **fresh save** (SlotPickerScreen → an empty slot) to make sure the setup
      wizard and your very first chapter work exactly as intended with no accumulated flags from
      testing.
- [ ] If you're shipping for Android, test the actual APK on a device (or at least test the LAN
      web preview on a real phone — see [Building and exporting](building-and-exporting.md#the-lan-phone-preview))
      — touch interaction genuinely differs from the desktop preview.
- [ ] If you're shipping multiple languages, switch language from Settings mid-playthrough at
      least once to confirm nothing silently stays untranslated in a jarring way.

## Before uploading

- [ ] Confirm the credits/attribution for any third-party assets you used (sounds, fonts, images)
      match their actual license terms — see [`ASSETS_LICENSES.md`](../../ASSETS_LICENSES.md) in
      this repository for how the engine's own bundled defaults are credited, as a model to follow
      for your own project's assets.
- [ ] Write a short, honest description and content notes for your store page — especially if the
      mature-content warning is enabled; tell players what to expect before they hit the warning
      screen, not just at it.
- [ ] Decide what save-slot behavior you want players to know about — 3 fixed slots, switchable
      from Settings without losing progress (see
      [Save slots in the exported game](building-and-exporting.md#save-slots-in-the-exported-game))
      — worth a line in your store description if your story is long enough that players will
      care.
- [ ] Keep a copy of the **project itself**, not just the exported build — the exported game has no
      way to be re-opened for editing; only your original Stories Engine project folder can be.

## Next steps

If you're publishing the *engine* itself (contributing to Stories Engine, or shipping a fork), see
the main [README](../../README.md) and [Architecture](../architecture.md) instead — this checklist
is about shipping a *story*, not the tool that makes it.
