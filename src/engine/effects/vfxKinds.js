// Single source of truth for which screen-effect kinds exist — read by
// VfxEntryForm.vue (a `vfx` entry's own kind picker) AND
// HallucinationEntryForm.vue (its enter/exit effect pickers, see
// entryType 'hallucination' in story.js) so both stay in lockstep: a new
// kind added here (+ its CSS in PhoneShell.vue's `.screen-effect-veil.
// effect-*` rules + its i18n label under `entries.vfx.kinds.*`) shows up
// in both pickers automatically, no second list to remember to update.
// Order = roughly "subtle" to "extreme", matches PhoneShell.vue's own CSS
// grouping.
export const VFX_KINDS = ['glitch', 'static', 'corrupted', 'shake', 'crack', 'blackout']
