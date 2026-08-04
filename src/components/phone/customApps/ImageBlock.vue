<template>
  <img v-if="block.src" class="image-block" :src="resolveAssetUrl(block.src)" alt="" />
</template>

<script setup>
import { resolveAssetUrl } from '@/engine/assets'

defineProps({ block: { type: Object, required: true } })
</script>

<style scoped>
.image-block {
  display: block;
  width: 100%;
  max-height: 220px;
  object-fit: cover;
  border-radius: 12px;
}
</style>
