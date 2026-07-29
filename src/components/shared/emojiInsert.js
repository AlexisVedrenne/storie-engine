import { nextTick } from 'vue'

// Inserts `emoji` at the current caret position of a QInput's native
// <input>/<textarea> (accessed via QInput's own `nativeEl`, see
// EmojiPickerBtn.vue), instead of always appending to the end — a user
// picking an emoji mid-sentence expects it to land where they were typing.
// Falls back to a plain append when there's no element yet (ref not mounted,
// field never focused) so the button still works on an empty/fresh field.
export function insertEmojiAtCaret(qInputRef, currentValue, emoji) {
  const value = currentValue || ''
  const el = qInputRef?.nativeEl
  if (!el) return value + emoji

  const start = el.selectionStart ?? value.length
  const end = el.selectionEnd ?? value.length
  const next = value.slice(0, start) + emoji + value.slice(end)
  const caret = start + emoji.length

  // The DOM element's own value only reflects `next` after Vue re-renders
  // from the caller's v-model update — restoring the caret has to wait for
  // that render, otherwise setSelectionRange lands on the stale, shorter
  // string still in the DOM.
  nextTick(() => {
    el.focus()
    el.setSelectionRange(caret, caret)
  })

  return next
}

const RECENT_KEY = 'storie-editor-recent-emoji'
const RECENT_MAX = 24

export function loadRecentEmoji() {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function pushRecentEmoji(emoji) {
  const list = [emoji, ...loadRecentEmoji().filter((e) => e !== emoji)].slice(0, RECENT_MAX)
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list))
  } catch {
    // localStorage unavailable (private mode, quota) — recent list is a
    // convenience, not persisted state anything else depends on.
  }
  return list
}
