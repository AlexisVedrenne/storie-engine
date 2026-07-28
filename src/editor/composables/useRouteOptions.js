// Route picker options + identity helpers — mirrors useContactOptions.js's
// shape/reasoning exactly, for the same reason: routes are editor-only
// organization (see story.js's routesList/getRoute), and every place a
// route gets picked (ChapterList.vue's filter, EditorPage.vue's chapter
// header) should render the same pastille dot instead of re-deriving it.
import { computed } from 'vue'
import { useStoryStore } from '@/engine/stores/story'

export function useRouteOptions() {
  const story = useStoryStore()

  const routeOptions = computed(() => story.routesList.map((r) => ({ label: r.name, value: r.id })))

  function routeColor(id) {
    return story.getRoute(id)?.color || '#999999'
  }
  function routeLabel(id) {
    return story.getRoute(id)?.name || ''
  }

  return { routeOptions, routeColor, routeLabel }
}
