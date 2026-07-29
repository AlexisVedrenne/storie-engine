// Shared contact/thread picker options + identity helpers for editor forms —
// used by every entry form that lets you pick a contact or a conversation
// (ChoiceEntryForm, MessageEntryForm, PostEntryForm, DmEntryForm, CallEntryForm,
// RequiresBuilder, EffectsBuilder, CommentsListField...). `computed()` (not a
// plain `const` built once) so options stay correct now that contacts/threads
// are editable mid-session (Phase 4a) instead of static for the whole editor
// session.
import { computed } from 'vue'
import { useStoryStore } from '@/engine/stores/story'

export function useContactOptions() {
  const story = useStoryStore()

  const contactOptions = computed(() =>
    story.contactsList.map((c) => ({ label: c.name, value: c.id })),
  )

  const contactOptionsNoMe = computed(() =>
    story.contactsList.filter((c) => c.id !== 'me').map((c) => ({ label: c.name, value: c.id })),
  )

  // `group` tags each option so pickers can tell a real group thread (no
  // color of its own) apart from an implicit 1:1 thread (a contact id,
  // which does have a color) — e.g. to show a contact's identity dot only
  // where it's meaningful. See docs/ui-design-principles.md.
  const threadOptions = computed(() => [
    ...(story.project?.threads || []).map((t) => ({
      label: `${t.name} (groupe)`,
      value: t.id,
      group: true,
    })),
    ...story.contactsList
      .filter((c) => c.id !== 'me')
      .map((c) => ({ label: `${c.name} (1:1)`, value: c.id, group: false })),
  ])

  // Identity helpers behind the "pastille" pattern (docs/ui-design-principles.md,
  // section "Pastille d'identité") — centralized here so every contact/thread
  // picker across the editor renders the same dot/fallback instead of each
  // form re-deriving it from `story.getContact` on its own.
  function contactColor(id) {
    return story.getContact(id)?.color || '#999999'
  }
  function contactLabel(id) {
    return story.getContact(id)?.name || ''
  }
  function isGroupThread(id) {
    return threadOptions.value.find((o) => o.value === id)?.group ?? false
  }
  function threadLabel(id) {
    return threadOptions.value.find((o) => o.value === id)?.label || ''
  }

  return {
    contactOptions,
    contactOptionsNoMe,
    threadOptions,
    contactColor,
    contactLabel,
    isGroupThread,
    threadLabel,
  }
}
