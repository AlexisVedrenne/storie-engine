<template>
  <div class="avatar-block">
    <div v-if="block.icon && !block.src" class="icon-circle" :style="{ background: block.color || '#607d8b' }">
      <q-icon :name="block.icon" size="28px" color="white" />
    </div>
    <AppAvatar v-else :name="block.label || '?'" :color="block.color || '#607d8b'" :image="block.src || ''" :size="block.size || 64" />
    <span v-if="block.label" class="avatar-label">{{ block.label }}</span>
  </div>
</template>

<script setup>
import AppAvatar from '@/components/phone/AppAvatar.vue'

defineProps({ block: { type: Object, required: true } })
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
