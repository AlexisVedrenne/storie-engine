# Modern, optimized UI/UX — reference guide for Stories Engine

Reference doc, not an implementation plan: explains what a "modern and optimized" UI/UX means for this kind of tool (Electron desktop editor, dark theme, dense UI — sidebars, forms, resizable panels), and serves as a common baseline before rebuilding the editor's interface.

## 1. The principles that define good UI/UX

A "modern" interface isn't a matter of visual fashion (glassmorphism, neon...) — it's a matter of **clarity in service of the task**. Five non-negotiable principles:

1. **Clear visual hierarchy** — at any moment, the eye should know what matters most on screen. Achieved through size, weight, contrast, position — never through color alone (accessibility).
2. **Density in service of the task, not aesthetics** — a content editor (like this one) displays A LOT of fields. Density is acceptable and even desirable, but it must stay _scannable_: regular spacing, strict alignment, logical grouping.
3. **Systematic consistency** — a "primary" button always has the same color/shape everywhere. An 8px spacing is a multiple of 8px everywhere. One font for code/id, one for text — never an ad hoc mix component by component.
4. **Immediate feedback** — every action (click, save, error, loading) gets a visual response in under 300ms. Nothing should leave the user wondering "did that work?".
5. **Keyboard accessibility and contrast** — a tool used for hours a day must be keyboard-navigable (Tab, visible focus) and readable without eye strain (text contrast ≥ 4.5:1, dark theme included).

## 2. Spacing system — the foundation of everything

Symptom #1 of a "not clear" UI: every component invents its own spacing (8px here, 10px there, 12px elsewhere — already visible in the current code of `src/editor/components/*`). The solution: a **token system** based on a single base unit (8px), shared everywhere.

```css
/* src/css/design-tokens.scss — to be created, single source of truth */
:root {
  --space-1: 4px; /* micro-spacing (between icon and label) */
  --space-2: 8px; /* base spacing */
  --space-3: 12px; /* standard field/card padding */
  --space-4: 16px; /* standard panel padding */
  --space-6: 24px; /* separation between sections */
  --space-8: 32px; /* separation between major blocks */

  --radius-sm: 4px; /* buttons, badges */
  --radius-md: 8px; /* cards, fields */
  --radius-lg: 12px; /* panels, dialogs */

  --header-height: 48px; /* topbar */
  --sidebar-width: 280px; /* ChapterList */
  --row-height: 36px; /* one list row (chapter, collapsed entry) */
}
```

Simple rule: **every margin/padding value in CSS must be one of these variables**, never a hardcoded number. That's what gives the impression of "real software" rigor rather than "tinkering".

## 3. Typography

Only two fonts, each with a fixed role:

| Role                                       | Font                                                                   | Usage                                              |
| ------------------------------------------ | ----------------------------------------------------------------------- | --------------------------------------------------- |
| Interface (labels, buttons, running text)  | **Inter** or **Fira Sans** (sans-serif, very readable at small sizes)   | All UI text                                        |
| Identifiers / code / file paths            | **Fira Code** or **JetBrains Mono** (monospace)                        | `entry.type`, `chapter.id`, asset paths, JSON      |

Size scale (few steps, consistent everywhere):

```css
--text-xs: 11px;   /* section labels, badges, meta-info */
--text-sm: 13px;   /* standard form text */
--text-base: 14px; /* main content text */
--text-lg: 16px;   /* panel titles */
line-height: 1.4 to 1.5 everywhere (never 1 — too tight, tires the eye over a long session)
```

## 4. Color — a consistent dark palette

A "modern" dark UI isn't just `#111` everywhere — it has a gray scale with **precise roles**, plus a single accent (never two "primary" colors competing):

| Role              | Value                                                | Usage                                                                              |
| ----------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `--bg`            | `#0F172A`                                            | app background                                                                     |
| `--surface`       | `#1E293B`                                            | panels, cards                                                                      |
| `--surface-hover` | `#334155`                                            | hover on a row/card                                                                |
| `--border`        | `rgba(255,255,255,0.10)`                             | separators — never more opaque, never less visible                                |
| `--text`          | `#F8FAFC`                                            | main text                                                                          |
| `--text-muted`    | `#94A3B8`                                            | secondary labels, meta-info — **never darker than this gray**, or it's unreadable |
| `--accent`        | `#508DF5` (blue, already used for "active chapter")  | primary action, selection, link                                                   |
| `--success`       | `#22C55E`                                            | successful save                                                                   |
| `--danger`        | `#F55B50`                                            | deletion, error                                                                   |
| `--warning`       | `#FFC107`                                            | "unsaved changes" (already in use)                                                |

Contrast rule: main text on background ≥ 4.5:1 (WCAG AA minimum) — verifiable in 10 seconds with any color-contrast checker. **Measured on 2026-08-18**: `--accent`/`--danger` in small text (`--text-xs`) on `--surface` came out at 4.40:1/3.97:1 — below the AA threshold for normal text (4.5:1), even though they already passed the 3:1 threshold (large text/UI components). Lightened slightly (`#4C8BF5`→`#508DF5`, `#F44336`→`#F55B50`) to get back above 4.5:1 on both `--bg` AND `--surface` — every other role (text, text-muted, success, warning) was already well above, no change needed.

## 5. Information hierarchy & density

For a dense tool (stacked forms, entry lists, nested builders), three concrete techniques:

- **Group by card/section with a slightly different background** (`--surface` on `--bg`) rather than separator lines everywhere — the eye groups things visually with no effort.
- **A single section-title level per child screen** (e.g. "Conditions (flags)" in `RequiresBuilder`) — in discreet uppercase `--text-xs`, never more prominent than the content it introduces.
- **Collapse/expand (already in place in `TimelineEditor`)** — the right instinct — but the collapsed state must give an _immediately useful_ summary, not just the type. Already done (`summaryFor()`), worth pushing further visually (icon per entry type rather than a text badge — see §7).

## 6. Feedback & affordance

- **Pointer cursor** on every clickable element (chapter rows, entry cards, ▲▼ buttons) — currently not guaranteed everywhere.
- **150–250ms transition** on hover/focus (`transition: background-color 0.2s ease`) — never an instant change nor a >400ms transition that slows down manipulation.
- **Visible keyboard focus states** (`:focus-visible { outline: 2px solid var(--accent) }`) — essential for a tool used all day, where navigating between form fields by keyboard is faster than by mouse.
- **No emoji icons as UI icons** (✨👍 etc. in the app's own code, not in the authored narrative content) — use the Material icons already provided by Quasar (`q-icon`), consistent in size and style.
- **Buttons differentiated by intent**: primary (Save, Create — `--accent` background), secondary (Cancel, close — outline), destructive (Delete — `--danger`, never the same color as a normal button).

## 7. Concrete application to Stories Engine — what's missing today

Direct observation of the current code (`src/editor/**`):

- **No shared tokens** — every `.vue` defines its own colors/sizes/paddings in hardcoded values (`#16161f`, `#e8e8f0`, `rgba(255,255,255,0.1)` repeated everywhere, never the same value twice). This is cause #1 of the "not clear" feeling — nothing visually echoes between components.
- **Unhierarchized density** — in `TimelineEditor`/`RequiresBuilder`/`EffectsBuilder`, every field has the same visual weight (same size, same gray) — impossible to quickly scan "what's filled in, what isn't".
- **Undifferentiated buttons** — every `q-btn dense flat` looks alike (Save, Delete, Add, ▲▼) — no action hierarchy.
- **No icon per entry type** — the text badge (`message`, `choice`...) in `TimelineEditor` forces reading instead of visual recognition — a dedicated icon per type (💬 message, ❓ choice, 📷 photo...) massively speeds up scanning a 30-entry timeline.
- **"Flat" forms** — `EffectsBuilder`/`RequiresBuilder` stack a lot of fields with no clear visual breathing room between sections (the `q-expansion-item`s help, but the expanded content stays dense with no structured spacing).

## 8. Checklist before considering a UI pass "done"

Actual state verified on 2026-07-28 (see `docs/ui-ux-audit.md` for details
and screenshots) — this checklist was still a wish list when this doc was
first written, it now reflects what's actually in place:

- [x] A single token file (color/spacing/radius/type), everything else references it — `src/css/design-tokens.scss`, adopted in 30/31 files of `src/editor`.
- [x] Fixed-role dark palette (§4), a single accent — also verified on generic Quasar dialogs (fixed 2026-07-28, see audit point 5).
- [x] Two fonts max, size scale limited to 4-5 steps — Inter/Fira Code actually loaded since 2026-07-28 (`@fontsource/*`), previously just names in CSS never actually served (see audit point 1).
- [x] Every button has a clear visual intent (primary/secondary/destructive)
- [x] Every entry type has a recognizable icon, not just a text badge
- [x] `cursor: pointer` + visible hover on every clickable element
- [x] Visible keyboard focus on all fields/buttons (`:focus-visible` global, `src/css/app.scss`)
- [x] Text contrast verified (4.5:1 minimum) on dark background — measured 2026-08-18 for every palette role (§4) on both `--bg` AND `--surface`; `--accent`/`--danger` adjusted, the rest already passed.
- [x] No hardcoded spacing/color value in a new component — always a variable
