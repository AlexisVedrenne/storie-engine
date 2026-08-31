<template>
  <div class="tabs-block">
    <button
      v-for="(tab, i) in resolvedTabs"
      :key="i"
      type="button"
      class="tab-btn"
      :class="{ active: tab.screenId === activeScreenId }"
      @click="navigate(tab.screenId)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<script setup>
// Pure navigation between the custom app's own screens — no game state
// touched, deliberately kept in the "visual" v1 scope (see plan §1).
import { computed, inject, ref } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import { resolveDynamicText } from '@/engine/customApps/resolveDynamicText'

const props = defineProps({ block: { type: Object, required: true } })
const story = useStoryStore()

const navigate = inject('customAppNavigate', () => {})
const activeScreenId = inject('customAppActiveScreenId', ref(null))
const listItem = inject('customAppListItem', null)

const resolvedTabs = computed(() =>
  (props.block.tabs || []).map((tab) => ({
    ...tab,
    label: resolveDynamicText(tab.label, story, listItem) || '',
  })),
)
</script>

<style scoped>
.tabs-block {
  display: flex;
  gap: 4px;
  padding: 3px;
  border-radius: 11px;
  background: var(--app-surface);
}

.tab-btn {
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

.tab-btn.active {
  background: rgba(var(--app-primary-rgb), 0.35);
  color: var(--app-text);
}
</style>
