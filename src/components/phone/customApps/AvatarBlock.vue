<template>
  <div class="avatar-block">
    <div
      v-if="block.icon && !src"
      class="icon-circle"
      :style="{
        background: block.color || 'var(--app-secondary)',
        width: `${size}px`,
        height: `${size}px`,
      }"
    >
      <q-icon :name="block.icon" :size="`${Math.round(size * 0.4375)}px`" color="white" />
    </div>
    <AppAvatar
      v-else
      :name="label || '?'"
      :color="block.color || 'var(--app-secondary)'"
      :image="src"
      :size="size"
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
// `size` (px, user request — was already read by AppAvatar below but had
// no author-facing control at all) — 64 matches this block's own original
// fixed dimension, both here and in AppAvatar's own default prop, so an
// existing saved avatar renders unchanged. The icon-fallback path (no
// image/photo set) previously had this hardcoded in CSS instead of reading
// it at all — fixed to match, with its own icon glyph scaled at the same
// ~44% ratio the original fixed 64px circle / 28px icon pairing had.
const size = computed(() => props.block.size || 64)
</script>

<style scoped>
.avatar-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.icon-circle {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-label {
  color: var(--app-text);
  font-size: 13px;
  font-weight: 600;
}
</style>
