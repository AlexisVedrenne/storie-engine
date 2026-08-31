<template>
  <button
    type="button"
    class="button-block"
    :class="[`size-${block.size || 'normal'}`, { flat: block.flat }]"
    :style="{
      background: block.flat ? 'transparent' : block.color || 'var(--app-primary)',
      color: block.flat ? block.color || 'var(--app-primary)' : block.textColor || undefined,
      borderRadius: block.radius != null ? `${block.radius}px` : 'var(--app-radius)',
    }"
    @click="onClick"
  >
    <q-icon v-if="block.icon" :name="block.icon" size="18px" />
    {{ label }}
  </button>
</template>

<script setup>
// First action-wired block — a small FIXED catalog of action kinds
// (block.action.type), same "bounded vocabulary" precedent as blocks/steps
// themselves, not a generic scripting hook. The actual dispatch lives in
// useBlockAction.js (shared with a `lookup` result's own action, authored
// via the same BlockActionEditor.vue) — see that file for what each kind
// does.
import { computed, inject } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import { resolveDynamicText } from '@/engine/customApps/resolveDynamicText'
import { useBlockAction } from '@/engine/customApps/useBlockAction'

const props = defineProps({ block: { type: Object, required: true } })
const story = useStoryStore()
const listItem = inject('customAppListItem', null)
const { runAction } = useBlockAction()
const label = computed(() => resolveDynamicText(props.block.label, story, listItem) || '')

function onClick() {
  runAction(props.block.action, listItem)
}
</script>

<style scoped>
.button-block {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: none;
  border-radius: 12px;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

/* `flat` (user request — Quasar's own `q-btn flat` meaning: no fill, no
   elevation, just colored text) drops the background this element would
   otherwise always paint. */
.button-block.flat {
  box-shadow: none;
}

/* `size` (user request) — padding/font-size pairs, same "small bounded
   scale, not a free number" precedent as the radius/spacing scales in the
   app theme. `normal` matches this button's own original fixed dimensions
   byte-for-byte, so an existing saved button is unaffected. */
.button-block.size-small {
  padding: 6px 12px;
  font-size: 12px;
}

.button-block.size-normal {
  padding: 11px 16px;
  font-size: 14px;
}

.button-block.size-large {
  padding: 15px 22px;
  font-size: 16px;
}
</style>
