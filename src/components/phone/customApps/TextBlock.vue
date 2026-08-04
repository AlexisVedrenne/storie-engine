<template>
  <p
    class="text-block"
    :class="block.style || 'body'"
    :style="{ color: block.color || undefined, fontSize: block.size ? `${block.size}px` : undefined }"
  >
    {{ block.content || '' }}
  </p>
</template>

<script setup>
// `color`/`size` are optional overrides on top of the title/body style
// preset — unset (the common case), the preset's own font-size/opacity
// below applies untouched.
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
