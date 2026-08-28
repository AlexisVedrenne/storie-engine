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
      return { type, title: '', icon: 'apps', color: '#4c8bf5', sticky: false }
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
      return { type, style: 'body', content: '' }
    case 'image':
      return { type, src: '', fullBleed: false }
    case 'avatar':
      return { type, label: '', color: '#607d8b', icon: '', src: '' }
    case 'row':
      return { type, icon: '', label: '', sublabel: '', chevron: false }
    case 'card':
      return { type, blocks: [] }
    case 'layout':
      // Pure flex arranger — no background/padding chrome of its own,
      // unlike `card` (which is really "layout, column direction, + a
      // visible grouped-card background"). `direction` picks row vs column;
      // `gap` in px between children.
      return { type, direction: 'row', gap: 8, blocks: [] }
    case 'badge':
      return { type, label: '', color: '#4c8bf5' }
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
      return { type, label: '', color: '#4c8bf5', action: { type: 'none' } }
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
    default:
      return { type }
  }
}
