<template>
  <div class="timeline-editor" @dragover="onRootDragOver" @drop="performDrop">
    <div v-if="breadcrumb.length" class="breadcrumb-bar">
      <template v-for="(seg, si) in breadcrumb" :key="si">
        <span class="crumb" @click="seg.collapse">{{ seg.label }}</span>
        <q-icon
          v-if="si < breadcrumb.length - 1"
          name="chevron_right"
          size="14px"
          class="crumb-sep"
        />
      </template>
    </div>

    <div v-if="selected.size >= 2" class="selection-bar">
      <span>{{
        selected.size === 1
          ? t('timelineEditor.selectedOne')
          : t('timelineEditor.selectedMany', { n: selected.size })
      }}</span>
      <q-btn
        dense
        flat
        no-caps
        icon="create_new_folder"
        :label="t('timelineEditor.groupSelection')"
        size="sm"
        color="primary"
        @click="groupSelection"
      />
      <q-btn dense flat no-caps :label="t('common.cancel')" size="sm" @click="selected.clear()" />
    </div>

    <template v-for="(block, bi) in blocks" :key="block.kind + '-' + block.id">
      <!-- Group block: a contiguous run of entries sharing entry.group.id,
           rendered as one accordion. Only ever created from entries that
           were adjacent to begin with (see groupSelection) — reordering
           always moves the whole block together (moveBlock/onBlockDrop),
           so the contiguity invariant never breaks on its own. -->
      <div
        v-if="
          dropLine &&
          dropLine.scope === 'top' &&
          dropLine.blockIdx === bi &&
          dropLine.edge === 'before'
        "
        class="drop-line"
      />
      <div
        v-if="block.kind === 'group'"
        class="group-block"
        :class="{ 'drag-source': dragBlockIdx === bi }"
        draggable="true"
        @dragstart="onBlockDragStart(bi, $event)"
        @dragover="onBlockDragOver(bi, $event)"
        @drop="performDrop"
        @dragend="clearDrag"
      >
        <div class="group-header">
          <q-icon name="drag_indicator" size="18px" class="drag-handle" />
          <q-icon
            :name="groupCollapsed[block.id] ? 'expand_more' : 'expand_less'"
            size="18px"
            class="chevron"
            @click="groupCollapsed[block.id] = !groupCollapsed[block.id]"
          />
          <q-icon name="folder" size="16px" class="group-icon" />
          <q-input
            v-if="renamingGroupId === block.id"
            dense
            borderless
            autofocus
            class="group-label-input"
            v-model="groupLabelDraft"
            @blur="commitRename(block)"
            @keyup.enter="commitRename(block)"
            @click.stop
          />
          <span v-else class="group-label" @click="startRename(block)">
            {{ entries[block.start].group.label }}
            <q-icon name="edit" size="12px" />
          </span>
          <span class="group-count">{{
            t('timelineEditor.entriesCount', { n: block.end - block.start + 1 })
          }}</span>
          <div class="spacer" />
          <q-btn dense flat round icon="link_off" size="sm" @click.stop="ungroup(block)">
            <q-tooltip>{{ t('timelineEditor.ungroup') }}</q-tooltip>
          </q-btn>
        </div>

        <div v-if="!groupCollapsed[block.id]" class="group-members">
          <template v-for="i in memberRange(block)" :key="i">
            <div
              v-if="
                dropLine &&
                dropLine.scope === 'member' &&
                dropLine.groupId === block.id &&
                dropLine.index === i &&
                dropLine.edge === 'before'
              "
              class="drop-line"
            />
            <div
              :class="{ 'drag-source': dragMemberIdx === i }"
              draggable="true"
              @dragstart.stop="onMemberDragStart(i, $event)"
              @dragover.stop="onMemberDragOver(block, i, $event)"
              @drop.stop="performDrop"
              @dragend.stop="clearDrag"
            >
              <TimelineEntryCard
                :entry="entries[i]"
                :expanded="expandedSet.has(entries[i])"
                :breadcrumb="breadcrumb"
                :icon-for="iconFor"
                :help-for="helpFor"
                :form-for="formFor"
                :summary-for="summaryFor"
                :can-move-up="i > block.start"
                :can-move-down="i < block.end"
                @toggle="toggleExpand(entries[i])"
                @close="expandedSet.delete(entries[i])"
                @move-up="moveMember(i, -1, block)"
                @move-down="moveMember(i, 1, block)"
                @duplicate="duplicate(i)"
                @remove="remove(i)"
              />
            </div>
            <div
              v-if="
                dropLine &&
                dropLine.scope === 'member' &&
                dropLine.groupId === block.id &&
                dropLine.index === i &&
                dropLine.edge === 'after'
              "
              class="drop-line"
            />
          </template>
        </div>
      </div>

      <!-- Single (ungrouped) entry. -->
      <div
        v-else
        class="single-block"
        :class="{ 'drag-source': dragBlockIdx === bi }"
        draggable="true"
        @dragstart="onBlockDragStart(bi, $event)"
        @dragover="onBlockDragOver(bi, $event)"
        @drop="performDrop"
        @dragend="clearDrag"
      >
        <TimelineEntryCard
          :entry="entries[block.start]"
          :expanded="expandedSet.has(entries[block.start])"
          :breadcrumb="breadcrumb"
          :icon-for="iconFor"
          :help-for="helpFor"
          :form-for="formFor"
          :summary-for="summaryFor"
          :can-move-up="bi > 0"
          :can-move-down="bi < blocks.length - 1"
          show-checkbox
          :checked="selected.has(entries[block.start])"
          @toggle="toggleExpand(entries[block.start])"
          @close="expandedSet.delete(entries[block.start])"
          @move-up="moveBlock(bi, -1)"
          @move-down="moveBlock(bi, 1)"
          @duplicate="duplicate(block.start)"
          @remove="remove(block.start)"
          @check="(v) => toggleSelect(entries[block.start], v)"
        />
      </div>
      <div
        v-if="
          dropLine &&
          dropLine.scope === 'top' &&
          dropLine.blockIdx === bi &&
          dropLine.edge === 'after'
        "
        class="drop-line"
      />
    </template>

    <q-select
      dense
      outlined
      class="add-select"
      :label="t('timelineEditor.addEntry')"
      emit-value
      map-options
      :options="TYPE_OPTIONS"
      :model-value="null"
      @update:model-value="addEntry"
    >
      <template #prepend>
        <q-icon name="add" size="18px" />
      </template>
      <template #option="scope">
        <q-item v-bind="scope.itemProps">
          <q-item-section avatar>
            <q-icon :name="iconFor(scope.opt.value)" size="18px" />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ scope.opt.label }}</q-item-label>
            <q-item-label caption>{{ helpFor(scope.opt.value) }}</q-item-label>
          </q-item-section>
        </q-item>
      </template>
    </q-select>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { Notify } from 'quasar'
import { useStoryStore } from '@/engine/stores/story'
import { ENTRY_TYPE_APP } from '@/engine/apps/appIds'
import { CUSTOM_ENTRY_TYPES, CUSTOM_ENTRY_TYPE_BY_TYPE } from '@/engine/apps/entryTypeRegistry'
import { appHasBlockType } from '@/engine/customApps/appHasModule'
import TimelineEntryCard from '@/editor/components/TimelineEntryCard.vue'
import MessageEntryForm from '@/editor/components/entries/MessageEntryForm.vue'
import ChoiceEntryForm from '@/editor/components/entries/ChoiceEntryForm.vue'
import PostEntryForm from '@/editor/components/entries/PostEntryForm.vue'
import PhotoEntryForm from '@/editor/components/entries/PhotoEntryForm.vue'
import StoryEntryForm from '@/editor/components/entries/StoryEntryForm.vue'
import DmEntryForm from '@/editor/components/entries/DmEntryForm.vue'
import AppDmEntryForm from '@/editor/components/entries/AppDmEntryForm.vue'
import ReelEntryForm from '@/editor/components/entries/ReelEntryForm.vue'
import CallEntryForm from '@/editor/components/entries/CallEntryForm.vue'
import EffectEntryForm from '@/editor/components/entries/EffectEntryForm.vue'
import VfxEntryForm from '@/editor/components/entries/VfxEntryForm.vue'
import TimeskipEntryForm from '@/editor/components/entries/TimeskipEntryForm.vue'
import InteractionEntryForm from '@/editor/components/entries/InteractionEntryForm.vue'
import HallucinationEntryForm from '@/editor/components/entries/HallucinationEntryForm.vue'
import FakeTypingEntryForm from '@/editor/components/entries/FakeTypingEntryForm.vue'
import PauseEntryForm from '@/editor/components/entries/PauseEntryForm.vue'
import { useEditorI18n } from '@/editor/i18n'
import { entryTypeLabel, entryTypeHelp } from '@/editor/i18n/sharedOverrides'

const { t } = useEditorI18n()

// `entries` is mutated in place (push/splice/swap) — the caller passes the
// actual reactive array (chapter.timeline, or an option's `then`), never a
// copy, so edits here are immediately visible to the live PhoneShell preview
// reading the same story data (see docs/phase2-plan.md).
// `breadcrumb` — ancestry of {label, collapse} segments built by whichever
// parent (a choice option's own TimelineEditor, ultimately) mounted THIS
// instance nested inside its "Juste après" tab. Plain prop-drilling, not
// provide/inject (no precedent for that pattern in this codebase, and a
// shared global "current path" would be ambiguous anyway — entries can be
// expanded simultaneously, not an accordion, so there's no single current
// path to share). Empty at the top level (mounted directly in
// EditorPage.vue), so the chapter view is unaffected. See
// docs/ui-ux-audit.md point 2.
//
// Grouping (accordion sections, readability only) is layered on top without
// touching any of that: a group is just a contiguous run of entries sharing
// `entry.group = { id, label }` — pure editor metadata, ignored at runtime
// like any other unknown field, so chapter.timeline stays exactly as flat
// as story.js's index-based advance() expects. See `blocks` below.
const props = defineProps({
  entries: { type: Array, required: true },
  breadcrumb: { type: Array, default: () => [] },
})
const story = useStoryStore()

const FORM_BY_TYPE = {
  message: MessageEntryForm,
  choice: ChoiceEntryForm,
  post: PostEntryForm,
  photo: PhotoEntryForm,
  story: StoryEntryForm,
  dm: DmEntryForm,
  appDm: AppDmEntryForm,
  reel: ReelEntryForm,
  call: CallEntryForm,
  effect: EffectEntryForm,
  vfx: VfxEntryForm,
  timeskip: TimeskipEntryForm,
  interaction: InteractionEntryForm,
  hallucination: HallucinationEntryForm,
  fakeTyping: FakeTypingEntryForm,
  pause: PauseEntryForm,
}
// Additive merge, never replacing the hardcoded 10 — a plug-in entry type
// (src/engine/apps/entryTypeRegistry.js) just adds its own `type` key on
// top, same pattern in all 4 maps below.
function formFor(type) {
  return FORM_BY_TYPE[type] || CUSTOM_ENTRY_TYPE_BY_TYPE[type]?.form || null
}

// Material icon per entry type — lets a 30-entry timeline be scanned by eye
// instead of read word by word (see docs/ui-ux-guidelines.md §7).
const ICON_BY_TYPE = {
  message: 'sms',
  choice: 'call_split',
  post: 'dynamic_feed',
  photo: 'photo',
  story: 'auto_awesome',
  dm: 'send',
  appDm: 'forum',
  reel: 'movie',
  call: 'call',
  effect: 'bolt',
  vfx: 'broken_image',
  timeskip: 'update',
  interaction: 'sports_esports',
  hallucination: 'blur_on',
  fakeTyping: 'more_horiz',
  pause: 'pause',
}
// `type` is either a real stored entry.type (from an existing entry card)
// or a picker option's composite value (`appDm::<appId>`, see
// appDmOptions above) — only the picker ever produces the latter, so
// stripping the suffix here covers both callers uniformly.
function baseType(type) {
  return type.startsWith('appDm::') ? 'appDm' : type
}
function iconFor(type) {
  const base = baseType(type)
  return ICON_BY_TYPE[base] || CUSTOM_ENTRY_TYPE_BY_TYPE[base]?.icon || 'help_outline'
}

// One-line plain-language reminder of what each entry type does, shown
// above its form — aimed at someone who's never touched this engine before
// (see docs/story-engine.md section 4 in the NTR repo for the full spec).
// Plug-in entry types' own label/help (CUSTOM_ENTRY_TYPE_BY_TYPE, e.g. the
// Email app) are authored directly in that app's entryType.js, which also
// ships in the built game — entryTypeLabel()/entryTypeHelp() look up an
// editor-dictionary override keyed by `type` first, falling back to that
// authored text unchanged (see sharedOverrides.js).
const BUILTIN_TYPES = [
  'message',
  'choice',
  'post',
  'photo',
  'story',
  'dm',
  'appDm',
  'reel',
  'call',
  'effect',
  'vfx',
  'timeskip',
  'interaction',
  'hallucination',
  'fakeTyping',
  'pause',
]
function helpFor(type) {
  const base = baseType(type)
  return BUILTIN_TYPES.includes(base)
    ? t(`timelineEditor.types.${base}.help`)
    : entryTypeHelp(CUSTOM_ENTRY_TYPE_BY_TYPE[base])
}

// computed, not a plain const — re-evaluates when the editor's own
// language switches (t() calls inside), same reason TYPE_OPTIONS below is
// already a computed for enabledAppIds.
// One "add entry" option PER custom app, showing that app's own name —
// not a single generic "Conversation (app custom)" entry — so an author
// scanning the picker sees exactly which app they're adding content for,
// same expectation as everywhere else in the editor that lists real
// project data instead of a category placeholder. The value carries the
// app id right through (`appDm::<appId>`, split back apart in
// iconFor/helpFor/defaultEntry below) so picking it needs no separate
// "which app?" step — addEntry() gets a fully-formed entry immediately.
// If a second app-scoped entry type is ever added, group it under the
// same per-app block here rather than flattening app+type combinations.
// Only apps that actually place a `conversations` block somewhere — an app
// with no such block has nowhere for an appDm entry's messages to ever be
// read, so offering it here would let an author build content nothing can
// show (same "don't offer what can't work" reasoning as TYPE_OPTIONS below,
// which hides an app's plug-in entry types once the app itself is disabled).
const appDmOptions = computed(() =>
  (story.project?.customApps || [])
    .filter((app) => appHasBlockType(app, 'conversations'))
    .map((app) => ({
      label: `${t('timelineEditor.types.appDm.label')} — ${app.label || app.id}`,
      value: `appDm::${app.id}`,
    })),
)

const ALL_TYPE_OPTIONS = computed(() => [
  ...BUILTIN_TYPES.filter((type) => type !== 'appDm').map((type) => ({
    label: t(`timelineEditor.types.${type}.label`),
    value: type,
  })),
  ...appDmOptions.value,
  // Plug-in entry types (entryTypeRegistry.js) tacked on, not merged in
  // place — keeps the 10 built-ins' own authored order untouched.
  ...CUSTOM_ENTRY_TYPES.map((def) => ({ label: entryTypeLabel(def), value: def.type })),
])

// Authoring an SMS/post/reel/etc. for an app the project doesn't even ship
// makes no sense — hide it from the "add entry" picker rather than let an
// author build content nothing will ever show. Existing entries of a
// since-disabled type are left in the chapter's data untouched (not deleted
// or hidden here) — story.js's advance()/runThen() are what actually skip
// them at runtime, same silent-skip as a failed `requires`.
const TYPE_OPTIONS = computed(() =>
  ALL_TYPE_OPTIONS.value.filter((opt) => {
    const app = opt.value.startsWith('appDm::') ? opt.value.slice(7) : ENTRY_TYPE_APP[opt.value]
    return !app || story.enabledAppIds.includes(app)
  }),
)

function firstContactId() {
  return story.contactsList.find((c) => c.id !== 'me')?.id
}

function defaultEntry(type) {
  if (type.startsWith('appDm::')) {
    return {
      type: 'appDm',
      app: type.slice(7),
      thread: firstContactId(),
      from: firstContactId(),
      text: '',
    }
  }
  switch (type) {
    case 'message':
      return { type, contact: firstContactId(), text: '' }
    case 'choice':
      return { type, contact: firstContactId(), prompt: '', options: [{ text: '', then: [] }] }
    case 'post':
      return { type, author: firstContactId(), content: '' }
    case 'photo':
      return { type, from: firstContactId(), url: '' }
    case 'story':
      return { type, contact: firstContactId(), emoji: '✨' }
    case 'dm':
      return { type, thread: firstContactId(), from: firstContactId(), text: '' }
    case 'reel':
      return { type, author: firstContactId(), media: '' }
    case 'call':
      return { type, contact: firstContactId(), script: [] }
    case 'effect':
      return { type, effects: {} }
    case 'vfx':
      return { type, mode: 'start', effect: 'glitch', duration: 1200 }
    case 'timeskip':
      return { type }
    case 'interaction':
      return {
        type,
        interactionId: story.project?.gameConfig?.interactions?.[0]?.id || '',
        blocking: true,
        onWin: {},
        onLose: {},
      }
    case 'hallucination':
      return { type, messages: [], enterEffect: 'glitch', exitEffect: 'glitch' }
    case 'fakeTyping':
      return { type, mode: 'sms', contact: firstContactId(), duration: 2000 }
    case 'pause':
      return { type, duration: 1000 }
    default: {
      // Additive fallback for plug-in entry types — reached only for a
      // type none of the cases above matches.
      const customType = CUSTOM_ENTRY_TYPE_BY_TYPE[type]
      return customType ? customType.defaultEntry({ firstContactId }) : { type }
    }
  }
}

// Keyed by entry object reference, not by array index — an index-keyed map
// would silently point at the wrong entry the moment anything reorders
// (moveUp/moveDown already did; drag/group-move only added more ways to).
const expandedSet = reactive(new Set())
function toggleExpand(entry) {
  if (expandedSet.has(entry)) expandedSet.delete(entry)
  else expandedSet.add(entry)
}

function addEntry(type) {
  const entry = defaultEntry(type)
  props.entries.push(entry)
  expandedSet.add(entry)
}

// Removing the last-but-one member of a group leaves a "group" of 1, which
// is pointless clutter — auto-dissolve it rather than require an explicit
// "Dissoudre" click for something the author didn't really ask to keep.
function remove(i) {
  const removed = props.entries[i]
  props.entries.splice(i, 1)
  expandedSet.delete(removed)
  selected.delete(removed)
  if (removed.group) {
    const gid = removed.group.id
    const remaining = props.entries.filter((e) => e.group?.id === gid)
    if (remaining.length === 1) remaining[0].group = undefined
  }
}
function duplicate(i) {
  props.entries.splice(i + 1, 0, JSON.parse(JSON.stringify(props.entries[i])))
}

function summaryFor(entry) {
  switch (entry.type) {
    case 'message':
      return `${story.getContact(entry.contact).name}: ${entry.text || ''}${entry.deleteAfter ? ' 🗑️' : ''}`
    case 'choice':
      return entry.prompt || t('timelineEditor.emptyPrompt')
    case 'post':
      return `${story.getContact(entry.author).name} — ${entry.content || ''}`
    case 'photo':
      return entry.caption || entry.url || ''
    case 'story':
      return `${story.getContact(entry.contact).name} ${entry.emoji || ''}`
    case 'dm':
      return `${entry.thread}: ${entry.text || ''}${entry.deleteAfter ? ' 🗑️' : ''}`
    case 'appDm': {
      // Always leads with the app's own label — an author scanning a long
      // timeline needs to tell an app-scoped conversation apart from native
      // DM/SMS (and from another custom app's own chat) at a glance, not
      // just from the icon (see this feature's own scoping discussion).
      const appLabel =
        story.project?.customApps?.find((a) => a.id === entry.app)?.label || entry.app || '?'
      return `[${appLabel}] ${entry.thread}: ${entry.text || ''}`
    }
    case 'reel':
      return entry.caption || entry.media || ''
    case 'call':
      return `${story.getContact(entry.contact).name} — ${t('timelineEditor.linesCount', { n: (entry.script || []).length })}`
    case 'effect':
      return Object.keys(entry.effects || {}).join(', ')
    case 'vfx':
      if (entry.mode === 'stop') return t('timelineEditor.vfxStopSummary')
      return (
        t(`entries.vfx.kinds.${entry.effect || 'glitch'}`) +
        (entry.duration ? ` · ${entry.duration}ms` : ` · ${t('timelineEditor.vfxUntilStopped')}`)
      )
    case 'timeskip':
      return entry.label || `${entry.clock || ''} ${entry.date || ''}`.trim()
    case 'interaction': {
      const def = (story.project?.gameConfig?.interactions || []).find(
        (d) => d.id === entry.interactionId,
      )
      const label = def?.name || entry.interactionId || ''
      return `${label} · ${entry.blocking === false ? t('timelineEditor.interactionParallel') : t('timelineEditor.interactionBlocking')}`
    }
    case 'hallucination':
      return t('timelineEditor.linesCount', { n: (entry.messages || []).length })
    case 'fakeTyping': {
      const who =
        entry.mode === 'dm'
          ? story.getContact(entry.from).name
          : story.getContact(entry.contact).name
      return `${who} · ${entry.duration ?? 2000}ms`
    }
    case 'pause':
      return `${entry.duration ?? 1000}ms`
    default:
      return ''
  }
}

// --- blocks: entries collapsed into { single } or { group } units --------
// A "block" is the unit that moves atomically: one ungrouped entry, or one
// whole contiguous group. Top-level move/drag operates on blocks so a
// group can never be split apart by an ordinary reorder — only `ungroup()`
// removes the `.group` tag.
const blocks = computed(() => {
  const out = []
  const list = props.entries
  let i = 0
  while (i < list.length) {
    const gid = list[i].group?.id
    if (gid) {
      let j = i
      while (j < list.length && list[j].group?.id === gid) j++
      out.push({ kind: 'group', id: gid, start: i, end: j - 1 })
      i = j
    } else {
      out.push({ kind: 'single', id: `e${i}`, start: i, end: i })
      i++
    }
  }
  return out
})

function memberRange(block) {
  const out = []
  for (let i = block.start; i <= block.end; i++) out.push(i)
  return out
}

// Moves the whole block at `blockIdx` one slot up/down among top-level
// blocks — a group moves as a unit, exactly like a single entry does.
function moveBlock(blockIdx, dir) {
  const list = blocks.value
  const block = list[blockIdx]
  const targetIdx = blockIdx + dir
  if (targetIdx < 0 || targetIdx >= list.length) return
  const other = list[targetIdx]
  const len = block.end - block.start + 1
  const slice = props.entries.splice(block.start, len)
  let otherStart = other.start
  if (block.start < other.start) otherStart -= len
  const insertAt = dir < 0 ? otherStart : otherStart + (other.end - other.start + 1)
  props.entries.splice(insertAt, 0, ...slice)
}

// `dropLine` — where the dragged block/member would land, recomputed on
// every dragover from cursor position vs the hovered row's own midpoint
// (top half → before it, bottom half → after it), so the author sees
// exactly which gap it'll drop into instead of always "before whatever I'm
// over" (a fixed rule reads as jumpy once a block is more than one row).
//
// Drop handling itself is centralized at the ROOT element (see
// onRootDragOver/performDrop below), not on each row — the flex `gap`
// between rows belongs to no element's box, so a dragover/drop bound only
// to individual rows left literal dead pixels where the browser shows its
// native "not allowed" cursor and rejects the drop outright. The root's
// box covers that gap space too, so a single root-level handler that
// always preventDefault()s while one of OUR OWN drags is in flight (and
// falls back to the last precise `dropLine`) closes that hole. Per-row
// dragover handlers still run (bubbling up first) to keep `dropLine`
// precise while hovering an actual row.
const dropLine = ref(null)
function clearDrag() {
  dragBlockIdx = null
  dragMemberIdx = null
  dropLine.value = null
}
function edgeFromEvent(ev) {
  const rect = ev.currentTarget.getBoundingClientRect()
  return ev.clientY - rect.top < rect.height / 2 ? 'before' : 'after'
}

let dragBlockIdx = null
function onBlockDragStart(blockIdx, ev) {
  dragBlockIdx = blockIdx
  dragMemberIdx = null
  if (ev.dataTransfer) {
    ev.dataTransfer.effectAllowed = 'move'
    // Some browsers (Firefox in particular) refuse to complete a drag with
    // no data at all — harmless placeholder, we never read it back.
    ev.dataTransfer.setData('text/plain', '')
  }
}
function onBlockDragOver(blockIdx, ev) {
  if (dragBlockIdx === null && dragMemberIdx === null) return // not one of our own drags
  ev.preventDefault()
  if (dragBlockIdx === null) return // a member-drag hovering outside its own group — root's fallback covers it
  dropLine.value = { scope: 'top', blockIdx, edge: edgeFromEvent(ev) }
}

// Reordering within a single group's span only — a member never leaves its
// group via drag (only `ungroup()` does that).
function moveMember(i, dir, block) {
  const j = i + dir
  if (j < block.start || j > block.end) return
  const [item] = props.entries.splice(i, 1)
  props.entries.splice(j, 0, item)
}

let dragMemberIdx = null
function onMemberDragStart(i, ev) {
  dragMemberIdx = i
  dragBlockIdx = null
  if (ev.dataTransfer) {
    ev.dataTransfer.effectAllowed = 'move'
    ev.dataTransfer.setData('text/plain', '')
  }
}
function onMemberDragOver(block, i, ev) {
  if (dragBlockIdx === null && dragMemberIdx === null) return
  ev.preventDefault()
  if (dragMemberIdx === null || dragMemberIdx < block.start || dragMemberIdx > block.end) return
  dropLine.value = { scope: 'member', groupId: block.id, index: i, edge: edgeFromEvent(ev) }
}

// Root-level fallback — see the comment on `dropLine` above. Bound on the
// component's outermost element so its box covers every dead-pixel gap
// between rows.
function onRootDragOver(ev) {
  if (dragBlockIdx === null && dragMemberIdx === null) return
  ev.preventDefault()
}
function performDrop() {
  if (dragBlockIdx !== null) dropBlock()
  else if (dragMemberIdx !== null) dropMember()
  else clearDrag()
}
function dropBlock() {
  const line = dropLine.value
  if (!line || line.scope !== 'top' || dragBlockIdx === line.blockIdx) {
    clearDrag()
    return
  }
  const list = blocks.value
  const src = list[dragBlockIdx]
  const target = list[line.blockIdx]
  const len = src.end - src.start + 1
  const slice = props.entries.splice(src.start, len)
  let targetStart = target.start
  let targetEnd = target.end
  if (src.start < targetStart) {
    targetStart -= len
    targetEnd -= len
  }
  const insertAt = line.edge === 'before' ? targetStart : targetEnd + 1
  props.entries.splice(insertAt, 0, ...slice)
  clearDrag()
}
function dropMember() {
  const line = dropLine.value
  if (!line || line.scope !== 'member') {
    clearDrag()
    return
  }
  const block = blocks.value.find((b) => b.kind === 'group' && b.id === line.groupId)
  if (!block || dragMemberIdx < block.start || dragMemberIdx > block.end) {
    clearDrag()
    return
  }
  const [item] = props.entries.splice(dragMemberIdx, 1)
  let target = dragMemberIdx < line.index ? line.index - 1 : line.index
  if (line.edge === 'after') target += 1
  props.entries.splice(target, 0, item)
  clearDrag()
}

// --- grouping (accordion sections) ---------------------------------------
const selected = reactive(new Set())
function toggleSelect(entry, checked) {
  if (checked) selected.add(entry)
  else selected.delete(entry)
}

const groupCollapsed = reactive({})
const renamingGroupId = ref(null)
const groupLabelDraft = ref('')

function groupSelection() {
  const indices = [...selected].map((e) => props.entries.indexOf(e)).sort((a, b) => a - b)
  if (indices.length < 2) return
  const contiguous = indices.every((idx, k) => idx === indices[0] + k)
  if (!contiguous) {
    Notify.create({
      type: 'negative',
      message: t('timelineEditor.notAdjacent'),
    })
    return
  }
  const id = `grp-${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`
  for (const idx of indices) props.entries[idx].group = { id, label: t('timelineEditor.newGroup') }
  selected.clear()
}

function startRename(block) {
  renamingGroupId.value = block.id
  groupLabelDraft.value = props.entries[block.start].group.label
}
function commitRename(block) {
  if (renamingGroupId.value !== block.id) return // already committed via keyup.enter before the blur fired
  const label = groupLabelDraft.value.trim() || t('timelineEditor.group')
  for (let k = block.start; k <= block.end; k++) props.entries[k].group.label = label
  renamingGroupId.value = null
}

function ungroup(block) {
  for (let k = block.start; k <= block.end; k++) props.entries[k].group = undefined
}
</script>

<style scoped>
.timeline-editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.breadcrumb-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
}

.crumb {
  color: var(--color-accent);
  cursor: pointer;
}

.crumb:hover {
  text-decoration: underline;
}

.crumb-sep {
  color: var(--color-text-muted);
}

.selection-bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-accent-tint, var(--color-surface));
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
}

.group-block {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-surface-alt, var(--color-bg));
}

.group-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--row-height);
  padding: 0 var(--space-2) 0 var(--space-1);
}

.group-icon {
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.drag-handle {
  color: var(--color-text-muted);
  cursor: grab;
  flex-shrink: 0;
}

.chevron {
  color: var(--color-text-muted);
  cursor: pointer;
  flex-shrink: 0;
}

.group-label {
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: text;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.group-label-input {
  flex: 1;
  min-width: 0;
}

.group-count {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.spacer {
  flex: 1;
}

.group-members {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-2);
  padding-left: calc(var(--space-2) + 18px);
  border-top: 1px solid var(--color-border);
}

.add-select {
  margin-top: var(--space-2);
}

.drop-line {
  height: 3px;
  margin: -1px 0;
  border-radius: 2px;
  background: var(--color-accent);
  flex-shrink: 0;
}

.drag-source {
  opacity: 0.4;
}
</style>
