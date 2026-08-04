<template>
  <div class="divider-block" />
</template>

<script setup>
defineProps({ block: { type: Object, required: true } })
</script>

<style scoped>
.divider-block {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
}
</style>
