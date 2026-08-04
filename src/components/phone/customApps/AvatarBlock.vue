<template>
  <div class="avatar-block">
    <div v-if="block.icon && !block.src" class="icon-circle" :style="{ background: block.color || '#607d8b' }">
      <q-icon :name="block.icon" size="28px" color="white" />
    </div>
    <AppAvatar v-else :name="label || '?'" :color="block.color || '#607d8b'" :image="block.src || ''" :size="block.size || 64" />
    <span v-if="label" class="avatar-label">{{ label }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import { resolveDynamicText } from '@/engine/customApps/resolveDynamicText'
import AppAvatar from '@/components/phone/AppAvatar.vue'

const props = defineProps({ block: { type: Object, required: true } })
const story = useStoryStore()
const label = computed(() => resolveDynamicText(props.block.label, story))
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
