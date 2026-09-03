// Fixed catalog of visual blocks an author composes a custom app's screen
// from (see BlockBuilder.vue for authoring, BlockList.vue for the runtime
// interpreter that reads the same `type` values) — same "small bounded
// vocabulary, not a free canvas" precedent as stepKinds.js for interactions.
// `icon` here is only the palette's own Material icon (authoring UI), not a
// per-block field.
export const BLOCK_KINDS = [
  { type: 'header', icon: 'view_headline' },
  { type: 'footer', icon: 'vertical_align_bottom' },
  { type: 'text', icon: 'notes' },
  { type: 'image', icon: 'image' },
  { type: 'avatar', icon: 'account_circle' },
  { type: 'row', icon: 'list' },
  { type: 'card', icon: 'crop_square' },
  { type: 'overlay', icon: 'layers' },
  { type: 'sheet', icon: 'call_to_action' },
  { type: 'layout', icon: 'view_column' },
  { type: 'badge', icon: 'label' },
  { type: 'divider', icon: 'horizontal_rule' },
  { type: 'button', icon: 'smart_button' },
  { type: 'tabs', icon: 'tab' },
  { type: 'list', icon: 'repeat' },
  { type: 'conversations', icon: 'forum' },
  { type: 'schedule', icon: 'schedule' },
  { type: 'ledger', icon: 'show_chart' },
  { type: 'form', icon: 'edit_note' },
  { type: 'lookup', icon: 'search' },
  { type: 'map', icon: 'map' },
]

export function paletteIcon(type) {
  return BLOCK_KINDS.find((k) => k.type === type)?.icon || 'help_outline'
}

export function defaultBlock(type) {
  switch (type) {
    case 'header':
      // `sticky` (pilier 03) pins the header to the top of the screen's own
      // scroll area instead of scrolling away with the rest of the content
      // — defaults false so every existing saved header renders unchanged.
      return { type, title: '', icon: 'apps', color: '', sticky: false }
    case 'footer':
      // The symmetric counterpart to header.sticky (pilier 03) — a row of
      // action buttons pinned to the BOTTOM of the screen ("barre d'action
      // fixe en bas d'un formulaire"). Same recursive-container shape as
      // `layout` (row/column, its own `blocks[]`), not `card`'s padded-panel
      // look. `sticky` defaults true here (unlike header) since a
      // non-sticky footer is indistinguishable from just placing a `layout`
      // block last — the toggle exists for the rarer "footer-styled but not
      // pinned" case, matching the doc's own `header.sticky`/`footer.sticky`
      // pairing.
      return { type, direction: 'row', gap: 8, bgColor: '', sticky: true, blocks: [] }
    case 'text':
      // `align` ('left'/'center'/'right', unset = 'left' — the browser's own
      // default for LTR text, so an existing saved text block renders
      // unchanged) — user request.
      return { type, style: 'body', content: '', align: '' }
    case 'image':
      return { type, src: '', fullBleed: false }
    case 'avatar':
      return { type, label: '', color: '', icon: '', src: '' }
    case 'row':
      return { type, icon: '', label: '', sublabel: '', chevron: false }
    case 'card':
      // `action` (user request) — same fixed catalog a button offers
      // (BlockActionEditor.vue/useBlockAction.js); 'none' (default) keeps
      // the card purely a visual container exactly as before. A card with
      // an action is clickable ANYWHERE on its own background, but a
      // nested interactive block (e.g. a button placed inside it) still
      // works independently and never double-fires it — BlockList.vue
      // already wraps every block, including nested ones, in its own
      // click-catching div, which stops the click from ever bubbling up to
      // the card's own listener.
      return { type, blocks: [], action: { type: 'none' } }
    case 'overlay':
      // A positioned layer above the normal flow (pilier 03) — `anchor`
      // picks one of 5 fixed corner/center presets, resolved against
      // whichever ancestor sets `position: relative` (the screen root by
      // default, or the nearest Card/Layout it's nested inside — see
      // OverlayBlock.vue). Deliberately not a free x/y coordinate or an
      // arbitrary-block anchor id — same bounded-catalog trade as every
      // other block here. `offsetX`/`offsetY` (px, default 0 — user
      // request) nudge the block from that anchor point without abandoning
      // the anchor system entirely — still "pin to a corner/center", just
      // with fine adjustment on top.
      return { type, anchor: 'top-right', offsetX: 0, offsetY: 0, blocks: [] }
    case 'sheet':
      // A modal that opens from a button's `openSheet` action (targeting
      // `sheetId`) instead of taking a spot in the normal row/column flow —
      // BlockList.vue never renders it inline, only CustomAppRenderer.vue
      // does, as a backdrop + panel, when its `sheetId` matches whichever
      // one a button opened. Only one sheet can be open at a time; switching
      // screens always closes it. `blocks[]` is its own content, same
      // recursive shape as `card`. `position` ('bottom'/'center'/'top',
      // default 'bottom' — the original iOS-action-sheet-only behavior)
      // picks where it docks and which edge(s) get rounded — see
      // CustomAppRenderer.vue's SHEET_POSITIONS. `size` ('auto'/'full-width'/
      // 'full-height'/'full-screen', default 'auto' — user request) overrides
      // the panel's own width/height regardless of position.
      // `bgColor`/`opacity` (user request, corrected from an earlier miss —
      // "the MODAL itself is see-through, not the backdrop") control the
      // PANEL's own background: it used to be `var(--app-bg)`, which is
      // 'transparent' by default (that var is really "the whole screen's
      // wallpaper layer", never meant for a floating panel that needs to
      // read as solid on its own) — a real bug independent of these new
      // fields, not just a missing option. `bgColor` (optional, falls back
      // to a literal `#1c1f26` — same "hardcoded, not theme-derived"
      // treatment the backdrop's own darkening color already gets, for the
      // same reason: it must look right regardless of how translucent the
      // author's theme colors happen to be) is blended with transparent at
      // `opacity`% (0-100, default 95 — solid-looking by default, fixing
      // the "can't see the card inside" report without the author touching
      // anything) via `color-mix()`.
      return {
        type,
        sheetId: '',
        position: 'bottom',
        size: 'auto',
        bgColor: '',
        opacity: 95,
        blocks: [],
      }
    case 'layout':
      // Pure flex arranger — no background/padding chrome of its own,
      // unlike `card` (which is really "layout, column direction, + a
      // visible grouped-card background"). `direction` picks row vs column;
      // `gap` in px between children. `justify`/`align` (unset = the
      // browser's own flex defaults, flex-start/stretch — user request) map
      // straight onto CSS justify-content/align-items, same small bounded
      // option set every other enum-ish field here uses rather than a free
      // CSS value.
      return { type, direction: 'row', gap: 8, justify: '', align: '', blocks: [] }
    case 'badge':
      return { type, label: '', color: '' }
    case 'divider':
      return { type }
    case 'button':
      // `action.type`: 'none' (default, purely visual) | 'effect' (applies
      // flags/effects, same shape/mechanism as a choice option's own
      // `effects`) | 'navigateScreen' (switches this app's active screen,
      // same mechanism as the `tabs` block) | 'event' (fires
      // `button.pressed`) | 'toast' (shows `action.toastText` briefly, no
      // other effect). Small fixed catalog, not a generic action system —
      // see ButtonBlock.vue. Independent of which kind is picked: an
      // optional `action.requires` gates the whole action (reuses
      // checkConditions, same shape as a block's own display condition) —
      // failing it no-ops and, if set, shows `action.onFailToast` instead
      // (e.g. "Not enough funds.") rather than silently doing nothing.
      // `icon` (optional, shown before the label — user request), `size`
      // ('small'/'normal'/'large', default 'normal' — the original fixed
      // padding/font-size this button always had) and `flat` (boolean,
      // default false — a transparent background with `color` used as the
      // TEXT color instead of the fill, same "flat" meaning Quasar's own
      // `q-btn` uses elsewhere in this editor) are user-requested styling
      // options, all optional so an existing saved button renders unchanged.
      return {
        type,
        label: '',
        icon: '',
        color: '',
        size: 'normal',
        flat: false,
        action: { type: 'none' },
      }
    case 'tabs':
      return { type, tabs: [{ label: '', screenId: '' }] }
    case 'list':
      // `source: 'contacts'` (original v1, the only one for a while — see
      // git history for why a picker wasn't added until a second source
      // was actually needed) iterates project.contacts, `onlyFollowed`
      // filters to story.isFollowing(). `source: 'flagCollection'`
      // iterates a collection flag's key->value map (story.flagCollections,
      // `flagKey` picks which one) — a growing history/log/inventory an
      // author builds via `effects.collections` (see EffectsBuilder.vue),
      // not fixed project data. `source: 'entity'` iterates instances of an
      // author-defined entity schema (story.entities, `schemaId` picks
      // which one — see the Schémas tab / EntitySchemaForm.vue), for
      // structured multi-field records a flat collection can't hold.
      // `source: 'entityCollection'` (user request) iterates ONE entity
      // instance's own `type: 'collection'` field (story.entityCollectionItems,
      // `schemaId`+`entityId`+`fieldKey` pick which one — `entityId: '*'` is
      // the usual first/only-instance sentinel) — same key->value shape as
      // `flagCollection`, just scoped to a single record's own field
      // instead of a project-wide flag, so it reuses the exact same
      // `{item:key}`/`{item:value}` tokens.
      // `template` is a block subtree (same shape as card/layout's own
      // `blocks[]`) authored ONCE and repeated per item; its text fields can
      // use the `{item:...}` tokens (see resolveDynamicText.js —
      // CONTACT_ITEM_TOKENS/COLLECTION_ITEM_TOKENS, or one token per field
      // of the chosen schema for `source: 'entity'`).
      return {
        type,
        source: 'contacts',
        onlyFollowed: false,
        flagKey: '',
        schemaId: '',
        entityId: '*',
        fieldKey: '',
        template: [],
      }
    case 'conversations':
      // The "conversation module" — real interactive chat, not just visual
      // (see docs — this is the first custom-app block that reads/writes
      // game state on its own). Thread DEFINITIONS (id/name/participants
      // for a group; a 1:1 needs none, it's just a project contact id) are
      // the project's own native `project.threads` (the Threads editor tab)
      // — reused as-is, not re-authored per block. Only the actual MESSAGE
      // HISTORY is namespaced per app (story.appThreads), so a custom app's
      // conversation never crosses into native DM/SMS or another app's own
      // chat, while "who's in the group" stays single-sourced. `showAvatar`/
      // `nameField` are the two display options asked for — which contact
      // info to render, not per-message content.
      return { type, showAvatar: true, nameField: 'name' }
    case 'schedule':
      // Shows ONE entity instance's own `type: 'schedule'` field (an array
      // of `{ from, to, place }` slots, authored in EntitySchemaForm.vue) as
      // a day timeline, highlighting whichever slot covers the current
      // in-fiction time (story.resolvedClock()) — see ScheduleBlock.vue.
      // `entityId: '*'` is the same sentinel the `{entity:...}` token uses
      // (see resolveDynamicText.js) for "the first/only instance of that
      // schema"; a specific id addresses one among several. Not a `list`
      // variant — a list repeats a template once PER ITEM, this renders ONE
      // item's own structured field.
      return { type, schemaId: '', entityId: '*', fieldKey: '' }
    case 'ledger':
      // A numeric flag COLLECTION (story.flagCollections[flagKey], the same
      // one `list` block's `source: 'flagCollection'` already reads —
      // `story.collectionItems`) rendered as a mini area-chart + the entry
      // list below it, for any value that varies over time: a currency
      // balance, a reputation/trust score, anything an author already
      // builds via `effects.collections`. Not its own data source — deliberately
      // reuses collections rather than inventing a "ledger" concept, same
      // spirit as `schedule` reusing entity fields instead of a new bucket.
      // Non-numeric entries are ignored by the chart (coerced to 0) but
      // still shown in the list.
      return { type, flagKey: '' }
    case 'form':
      // The first block that lets the PLAYER write a value instead of just
      // triggering an author-authored one. `target: 'flag'` writes
      // `story.flags[flagKey]` directly (story.setFlag() — a real
      // overwrite, not applyEffects()'s accumulate-by-default) with
      // `inputType` (text/number/boolean) picked by the author, since a
      // flag has no declared type of its own to read at runtime.
      // `target: 'entity'` writes one field of an entity instance
      // (`effects.entities`'s own 'set' op) — its input widget is inferred
      // from that field's OWN declared schema type instead of asking the
      // author to pick one again; only text/number/boolean/ref:contact
      // fields are supported here (schedule/ref:entity are structured data,
      // not a fit for a single form input). `entityId: '*'` is the usual
      // first/only-instance sentinel — a form with no matching instance to
      // write into silently does nothing, same "absent = no-op" spirit as
      // every other block here.
      return {
        type,
        label: '',
        target: 'flag',
        flagKey: '',
        inputType: 'text',
        schemaId: '',
        entityId: '*',
        fieldKey: '',
        // 'live' (write on every keystroke) is the historical default, kept
        // so existing saved blocks don't change behavior. 'blur' commits
        // once the player leaves the field; 'button' defers to an explicit
        // submit tap. `readonly` shows the current value without letting
        // the player edit it (e.g. a form mixing an editable field with a
        // computed one displayed the same way).
        commitMode: 'live',
        readonly: false,
      }
    case 'lookup':
      // A fake search/browser (pilier 05) — `results[]` is author-authored
      // ({ title, excerpt, source, requires, action }), each individually
      // gated by its OWN `requires` (same RequiresBuilder every other
      // condition in this project uses) so a result only becomes findable
      // once the player has actually discovered whatever it's gated on.
      // Filtering is plain client-side text matching (LookupBlock.vue)
      // against the player's typed query — no results shown at all until
      // they type something, same "search, don't browse" spirit as a real
      // search engine. Generic to any "consult authored content" mechanic:
      // archives, a forum, an internal database — not fixed to one theme.
      // `action` (added right after shipping, per user feedback) is the
      // SAME fixed catalog a button offers — authored via the shared
      // BlockActionEditor.vue, run via the shared useBlockAction.js — a
      // tapped result can apply an effect, open a sheet, jump to another
      // app, etc., not just display text.
      return { type, placeholder: '', results: [] }
    case 'map':
      // A fake map — an author-uploaded image shown at its own NATURAL
      // size (never scaled down to fit the phone), inside a viewport the
      // player drags to pan around when it's bigger than the screen — same
      // "no real GPS/space modeling, just an image + labeled points" spirit
      // the engine already commits to for `schedule`'s own place names (see
      // that block's own comment). `pois[]` ({ x, y, label, icon, color,
      // action }) are positioned in PERCENT of the image's own natural
      // dimensions (0-100), not the viewport — stays correctly placed
      // regardless of how much of the image happens to be scrolled into
      // view. `action` is the SAME fixed catalog a button/lookup-result
      // offers (BlockActionEditor.vue/useBlockAction.js) — a tap on a POI
      // can apply an effect, open a sheet, trigger a scene, etc.
      // `initialZoom` (%, 100 = the image's natural size) sets the starting
      // zoom level; the player can then zoom in/out at runtime (+/- buttons,
      // wheel, pinch — see MapBlock.vue), clamped 50-300%.
      // A POI can optionally carry `link: {schemaId, entityId, xField,
      // yField}` — when set, x/y are read live from that ONE entity
      // instance's own number fields instead of the static x/y (see
      // MapBlock.vue's poiPosition()), so an automation writing those fields
      // (e.g. reacting to a `schedule` field's current place) moves the pin
      // with zero extra plumbing. A POI can also optionally carry `content`
      // (a `blocks[]` subtree, same shape as card/overlay) rendered as a
      // small bounded card instead of the default icon+label pill.
      return { type, src: '', height: 280, pois: [], initialZoom: 100 }
    default:
      return { type }
  }
}
