<template>
  <p class="text-block" :class="block.style || 'body'">{{ block.content || '' }}</p>
</template>

<script setup>
defineProps({ block: { type: Object, required: true } })
</script>

<style scoped>
.text-block {
  margin: 0;
  color: #fff;
}

.text-block.title {
  font-size: 20px;
  font-weight: 800;
}

.text-block.body {
  font-size: 14px;
  line-height: 1.5;
  opacity: 0.85;
}
</style>
