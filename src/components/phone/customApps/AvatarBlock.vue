<template>
  <div class="avatar-block">
    <div
      v-if="block.icon && !src"
      class="icon-circle"
      :style="{ background: block.color || '#607d8b' }"
    >
      <q-icon :name="block.icon" size="28px" color="white" />
    </div>
    <AppAvatar
      v-else
      :name="label || '?'"
      :color="block.color || '#607d8b'"
      :image="src"
      :size="block.size || 64"
    />
    <span v-if="label" class="avatar-label">{{ label }}</span>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import { resolveDynamicText } from '@/engine/customApps/resolveDynamicText'
import AppAvatar from '@/components/phone/AppAvatar.vue'

const props = defineProps({ block: { type: Object, required: true } })
const story = useStoryStore()
const listItem = inject('customAppListItem', null)
const label = computed(() => resolveDynamicText(props.block.label, story, listItem))
// `useItemAvatar` (only meaningful inside a list's per-item template, see
// BlockPropertiesForm.vue's toggle) swaps in the current contact's own
// photo — a boolean toggle rather than a `{item:...}` text token since
// AssetField (the image picker widget) has no free-text field to type one
// into. Falls back to the block's own static `src` otherwise.
const src = computed(() =>
  props.block.useItemAvatar && listItem ? listItem.avatar || '' : props.block.src || '',
)
</script>

<style scoped>
.avatar-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.icon-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-label {
  color: #fff;
  font-size: 13px;
  font-weight: 600;
}
</style>
