# Writing chapters

This is the core of authoring in Stories Engine: the chapter graph, the timeline inside each
chapter, and the people (contacts) and conversations (threads) your story is built from.

## How a project is organized

You don't need to know this to write a story, but it's useful context: a project is a folder of
plain files. Chapters live one-per-file under `chapters/`, contacts and threads are single
project-wide files, and everything else (settings, translations, backlog content, custom apps,
your images/audio) has its own place. The editor manages all of this for you — you'll never need
to hand-edit these files — but it means a project is just a folder you can put under version
control, back up, or move between machines like any other.

## The chapter graph

Open the **Chapters** tab and zoom out (or press whatever collapses the currently-open chapter) to
see the graph: every chapter in your project as a card on a canvas, connected by arrows.

> 📸 SCREENSHOT NEEDED: the chapter graph with 3-4 connected chapters, showing at least one arrow
> with a condition label on it.

- **Arrows are drawn by you** — drag from the right edge of one chapter to the left edge of
  another. Nothing is inferred automatically; if two chapters aren't connected by an arrow, the
  story can never go from one to the other.
- **An arrow can carry a condition** (the same requires system used everywhere — see
  [Conditions, flags, and reactions](conditions-and-flags.md)) and an optional label to show
  instead of the raw condition on the graph.
- When a chapter finishes its timeline, the engine tries its outgoing arrows **in order** and
  follows the first one whose condition currently holds. Put your "default" path last, and your
  more specific/conditional paths before it.
- **No outgoing arrows at all = an ending.** The graph marks such a chapter with a dashed border
  and a "THE END" badge. See [Endings](#endings) below for what the player actually sees.
- **Right-click the canvas** to create a new chapter right where you clicked.
- **Duplicate** a chapter (button on its card) for a deep copy — its whole timeline and outgoing
  arrows, conditions and labels included — dropped just next to the original.
- **"Preview from this chapter"** on each card jumps the live preview straight there.
- While you're previewing, chapters you've actually reached light up with a small badge on the
  graph, so you can see at a glance how far your test run has explored.
- The very first chapter a fresh save opens is the project's **entry chapter** — set from a picker
  in the **Game** tab, not fixed at creation, so you can change your story's starting point later.

## The timeline and its entry types

Open any chapter and you're looking at its **timeline** — an ordered list of things that happen,
top to bottom. Every entry has a type, and most have an optional **condition** (see
[Conditions](conditions-and-flags.md)) that silently skips it if it doesn't hold — useful for
"this text only shows up if the player already knows X."

Entries can be **reordered** by drag-and-drop or the up/down buttons, and **grouped** — select
several adjacent entries and collapse them into a labeled, foldable section, purely for your own
readability on a long timeline. Grouping has no effect on how the story plays.

> 📸 SCREENSHOT NEEDED: a timeline with a mix of message/choice/photo entries, one collapsed group
> visible.

Here's every entry type:

| Type | What the player experiences |
|---|---|
| **Message** | An incoming text, with a typing delay proportional to its length, an unread badge, a notification (unless that conversation is already open), and an optional attached image. Can be made to auto-delete after a delay (see [Deletable messages](#deletable-messages)). |
| **DM** | Same as a message, but inside a Pixly (the in-story social app) direct-message thread. Sent instantly if the sender is you. |
| **Post** | A social-feed post from any contact (or you) — appears instantly, no notification. |
| **Reel** | A short-video-style post — media, caption, a music credit line. |
| **Story** | A Pixly story — a media clip or an emoji on a colored background, shown in the stories bar. |
| **Photo** | A photo the player receives — lands in the Gallery app, and becomes available as material for the player's own posts. |
| **Choice** | A prompt with several options, each with its own condition, effects, and follow-up. Stops the story until the player picks one; whichever text they picked is sent back as "their" message. |
| **Call** | A scripted incoming call — a line-by-line script the player taps through once they answer. Rings, and blocks the story until answered, declined, or hung up. |
| **Timeskip** | A narrative ellipsis — the phone locks, the screen fades to black, time (clock/date/battery) advances, then it fades back in. Can also land the player directly inside an app/conversation, skipping the lock screen entirely (useful for "you wake up to a message already waiting"). |
| **Effect** | An invisible entry that only applies effects (flags, phone-widget state) — no visible content. |
| **VFX** | A visual overlay on the phone screen itself (glitch, static, a crack, a shake) — purely cosmetic, for mood. |
| **Music** | Starts or stops a background track, with optional fade and looping. |
| **Hallucination** | A fake conversation the player only watches — never writes into a real thread — paired with a screen-glitch effect. Good for dream sequences or unreliable-narrator moments. |
| **Fake typing** | Shows a real "..." typing indicator (SMS or DM) with nothing ever arriving — pure suspense. |
| **Pause** | A silent, author-controlled wait — nothing happens on screen, the story just waits before continuing. |
| **Interaction** | Triggers an authored phone gesture (see [Interactions](conditions-and-flags.md#interactions)) — blocking or running alongside the rest of the story, your choice. |

Some apps add their own entry types on top of this list — for example, the built-in **Email** app
adds an `Email` entry (an incoming email, with a free-text sender rather than a project contact).
These appear in the same "add entry" menu, grouped with everything else, and only show up if the
app they belong to is enabled for your project (Game tab → Applications).

### Deletable messages

A `message` or `dm` entry can have a delay after which its bubble collapses into a "message
deleted" placeholder — tap it to reveal (or hide again) the original text. Never available on
something you sent as the player.

## Contacts and threads

**Contacts** (the Contacts tab) are everyone the player can text, call, or encounter on the social
feed: a name, an accent color, an optional Pixly bio and handle, separate avatars for
Messages/Calls vs. Pixly, starting follower/following counts, and whether they even have a social
presence at all (`hasSocial` — turn it off for someone who should only ever text, never appear on
the social app).

**Threads** (the Threads tab) only need an entry for **group** DM conversations — a name and a
list of participants. A 1:1 conversation needs nothing here at all; just reference the other
contact's id directly and the engine treats it as an implicit private thread. You (the player) are
always a participant in a group thread and can't be removed.

## Seed content

Sometimes a story needs to start with history already in place — old texts, posts your character
already made, photos already in the gallery — without playing any of it out live (no typing
delays, no notifications, no unread badges). That's what the **Seed** tab is for: five buckets
(messages, DMs, posts, reels, photos), each entry given a rough "how many days ago" instead of an
exact timestamp. It's loaded once, right before your first chapter starts.

## Endings

A chapter with no outgoing arrows is where that playthrough ends. What the player sees is
whatever you set in that chapter's **end screen** panel (title, text, an optional image) — all
fields optional, falling back to a generic "The End" screen if you leave them empty.

The **Journal** app's "Endings" tab tracks which endings the player has unlocked across their
playthrough (an "X / Y unlocked" count) without spoiling the ones they haven't reached yet — useful
for a story with multiple distinct endings you want players to know exist and hunt for.

## Next steps

- [Conditions, flags, and reactions](conditions-and-flags.md) — make your chapters and choices
  actually branch based on what the player has done.
- [Custom apps (no-code)](custom-apps-nocode.md) — build a whole new phone app beyond the built-in
  ones.
- [Assets, sound, and translations](assets-and-translations.md) — importing the images/audio your
  entries reference, and translating your story into other languages.
