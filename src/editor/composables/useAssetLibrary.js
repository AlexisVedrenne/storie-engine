// Shared files/folders listing for the Assets tab (AssetTree.vue +
// AssetsPanel.vue) — module-level refs, not per-call state, since both
// components need to see the same list and either can trigger a refresh
// after a mutating action (import/delete/create-folder) happening in the
// OTHER component. Unlike contacts/threads, assets aren't part of
// story.project's reactive state, so there's no existing single source of
// truth to read from — this composable is that source of truth.
import { ref } from 'vue'
import { useStoryStore } from '@/engine/stores/story'

const files = ref([])
const folders = ref([])
const loading = ref(false)

export function useAssetLibrary() {
  const story = useStoryStore()

  async function refresh() {
    loading.value = true
    try {
      const result = await window.storieAPI.listAssetFiles({
        rootPath: story.project.rootPath,
        assetsRoot: story.project.assetsRoot,
      })
      files.value = result.files
      folders.value = result.folders
    } finally {
      loading.value = false
    }
  }

  return { files, folders, loading, refresh }
}
