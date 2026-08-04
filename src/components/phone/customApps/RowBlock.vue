<template>
  <div class="row-block">
    <q-icon v-if="block.icon" :name="block.icon" size="20px" class="row-icon" />
    <div class="row-text">
      <div class="row-label">{{ label }}</div>
      <div v-if="sublabel" class="row-sublabel">{{ sublabel }}</div>
    </div>
    <q-icon v-if="block.chevron" name="chevron_right" size="18px" class="row-chevron" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import { resolveDynamicText } from '@/engine/customApps/resolveDynamicText'

const props = defineProps({ block: { type: Object, required: true } })
const story = useStoryStore()
const label = computed(() => resolveDynamicText(props.block.label, story) || '')
const sublabel = computed(() => resolveDynamicText(props.block.sublabel, story))
</script>

<style scoped>
.row-block {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  color: #fff;
}

.row-icon {
  flex-shrink: 0;
  opacity: 0.85;
}

.row-text {
  flex: 1;
  min-width: 0;
}

.row-label {
  font-size: 14px;
}

.row-sublabel {
  font-size: 12px;
  opacity: 0.5;
}

.row-chevron {
  flex-shrink: 0;
  opacity: 0.4;
}
</style>
