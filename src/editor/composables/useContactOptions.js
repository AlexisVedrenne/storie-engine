// Shared contact/thread picker options for editor forms — extracted from the
// pattern independently duplicated across ~10 entry forms (ChoiceEntryForm.vue
// has the most complete version, merging group threads + implicit 1:1
// contact-as-thread options). Unlike those duplicates (plain `const`, built
// once at setup), these are `computed()` so they stay correct now that
// contacts/threads are editable mid-session (Phase 4a) instead of static for
// the whole editor session.
//
// Not yet wired into the pre-existing entry forms — that's unrelated-scope
// churn across files this change doesn't need to touch. Intended as the
// eventual replacement, adopted opportunistically next time one of those
// files is touched for its own reason.
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

  const threadOptions = computed(() => [
    ...(story.project?.threads || []).map((t) => ({ label: `${t.name} (groupe)`, value: t.id })),
    ...story.contactsList.filter((c) => c.id !== 'me').map((c) => ({ label: `${c.name} (1:1)`, value: c.id })),
  ])

  return { contactOptions, contactOptionsNoMe, threadOptions }
}
