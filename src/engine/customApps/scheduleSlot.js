// Shared "which slot is active right now" logic for a `schedule` field
// ({ from, to, place } array) — used by ScheduleBlock.vue (highlighting the
// current slot) and story.js's checkConditions (a `requires.entities`
// condition targeting a schedule field resolves to the active place instead
// of comparing the raw array). One implementation so the two never drift.
export function slotContains(slot, nowLabel) {
  if (!slot?.from || !slot?.to) return false
  return slot.from <= slot.to
    ? nowLabel >= slot.from && nowLabel < slot.to
    : nowLabel >= slot.from || nowLabel < slot.to
}

export function activeSlotPlace(slots, nowLabel) {
  const slot = (slots || []).find((s) => slotContains(s, nowLabel))
  return slot?.place || ''
}
