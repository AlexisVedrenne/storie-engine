<template>
  <button type="button" class="button-block" :style="{ background: block.color || '#4c8bf5' }">
    {{ block.label || '' }}
  </button>
</template>

<script setup>
// Visual only in v1 — deliberately not wired to any action (see the plan's
// scope note: action blocks are a later phase). Renders inert on purpose.
defineProps({ block: { type: Object, required: true } })
</script>

<style scoped>
.button-block {
  border: none;
  border-radius: 12px;
  padding: 11px 0;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: default;
}
</style>
