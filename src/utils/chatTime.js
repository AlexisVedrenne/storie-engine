// Shared by ChatThread.vue (SMS) and DmThreadScreen.vue (Pixly DM) — turns a
// flat message list into the same list with a `chatLabel` attached wherever
// a date/time divider should show above that bubble: the very first message,
// any message more than GAP_MS after the previous one, or the first message
// of a new calendar day. `now` should be the story's resolved clock (see
// story.js resolvedClock), not the real device time, so "Aujourd'hui"/"Hier"
// track the in-game calendar instead of the player's real-world day.

import { i18n } from '@/engine/i18n/instance'

const GAP_MS = 20 * 60 * 1000 // 20 minutes

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

export function formatChatLabel(ts, now) {
  const locale = i18n.global.locale.value
  const d = new Date(ts)
  const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000)
  if (diffDays === 0) return `${i18n.global.t('common.today')} ${time}`
  if (diffDays === 1) return `${i18n.global.t('common.yesterday')} ${time}`
  return `${d.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} ${time}`
}

// Flattened for rendering: one entry per DOM node, never two nodes for the
// same key — `<transition-group>` + `<template v-for>` only supports a
// single root child per iteration, so a message that needs a divider above
// it becomes two consecutive list entries (`divider`, then `message`)
// instead of one entry with two children.
export function toChatItems(messages, now) {
  const items = []
  messages.forEach((m, i) => {
    const prev = messages[i - 1]
    const needsDivider =
      !prev ||
      new Date(m.ts).getTime() - new Date(prev.ts).getTime() >= GAP_MS ||
      startOfDay(new Date(m.ts)) !== startOfDay(new Date(prev.ts))
    if (needsDivider) {
      items.push({ kind: 'divider', id: `${m.id}-divider`, label: formatChatLabel(m.ts, now) })
    }
    items.push({ kind: 'message', id: m.id, message: m })
  })
  return items
}
