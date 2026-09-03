<template>
  <div class="tab-panel-block">
    <div class="tab-panel-bar">
      <button
        v-for="(tab, i) in resolvedTabs"
        :key="i"
        type="button"
        class="tab-panel-btn"
        :class="{ active: i === activeIndex }"
        @click="activeIndex = i"
      >
        {{ tab.label }}
      </button>
    </div>
    <BlockList :blocks="(block.tabs || [])[activeIndex]?.blocks || []" />
  </div>
</template>

<script setup>
// q-tabs + q-panel equivalent (user request) — `tabs` (TabsBlock.vue)
// switches the app's ACTIVE SCREEN, this switches CONTENT within the same
// spot instead, no navigation at all. `activeIndex` is plain component
// state, never written to `block`/project data — same "which sub-thing is
// showing" precedent as activeScreenId elsewhere, resets to the first tab
// every time this block remounts (switching screens, reopening the app...),
// which is the expected behavior for a UI affordance, not a save-worthy
// choice.
import { ref, computed, inject } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import { resolveDynamicText } from '@/engine/customApps/resolveDynamicText'
import BlockList from './BlockList.vue'

const props = defineProps({ block: { type: Object, required: true } })
const story = useStoryStore()
const listItem = inject('customAppListItem', null)

const activeIndex = ref(0)

const resolvedTabs = computed(() =>
  (props.block.tabs || []).map((tab) => ({
    ...tab,
    label: resolveDynamicText(tab.label, story, listItem) || '',
  })),
)
</script>

<style scoped>
.tab-panel-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tab-panel-bar {
  display: flex;
  gap: 4px;
  padding: 3px;
  border-radius: 11px;
  background: var(--app-surface);
}

.tab-panel-btn {
  flex: 1;
  background: none;
  border: none;
  border-radius: 9px;
  color: rgba(255, 255, 255, 0.55);
  font-size: 13px;
  font-weight: 600;
  padding: 8px 0;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.tab-panel-btn.active {
  background: rgba(var(--app-primary-rgb), 0.35);
  color: var(--app-text);
}
</style>
