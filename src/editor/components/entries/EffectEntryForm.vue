<template>
  <div class="entry-form">
    <EffectsBuilder :model-value="entry.effects" @update:model-value="(v) => (entry.effects = v)" />
  </div>
</template>

<script setup>
import EffectsBuilder from '@/editor/components/EffectsBuilder.vue'

defineProps({ entry: { type: Object, required: true } })
</script>

<style scoped>
.entry-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
