<template>
  <span class="badge-block" :style="{ background: block.color || '#4c8bf5' }">{{ block.label || '' }}</span>
</template>

<script setup>
defineProps({ block: { type: Object, required: true } })
</script>

<style scoped>
.badge-block {
  display: inline-flex;
  align-self: flex-start;
  padding: 3px 10px;
  border-radius: 999px;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
}
</style>
