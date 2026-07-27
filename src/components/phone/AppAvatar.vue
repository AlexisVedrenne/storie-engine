<template>
  <img v-if="image" class="app-avatar app-avatar-img" :src="resolveAssetUrl(image)" :style="avatarStyle" :alt="name" />
  <div v-else class="app-avatar" :style="avatarStyle">{{ initials }}</div>
</template>

<script setup>
import { computed } from 'vue'
import { resolveAssetUrl } from '@/engine/assets'

// Renders a colored circle with initials by default — zero external
// dependency, always visible instantly. Pass `image` (a project-relative
// asset path, see contacts.js) to show a real photo instead.
const props = defineProps({
  name: { type: String, required: true },
  color: { type: String, default: '#607d8b' },
  size: { type: [String, Number], default: 44 },
  image: { type: String, default: '' }
})

const initials = computed(() => {
  const parts = props.name.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() || '')
    .join('')
})

const avatarStyle = computed(() => {
  const px = typeof props.size === 'number' ? `${props.size}px` : props.size
  return {
    background: props.color,
    width: px,
    height: px,
    fontSize: `${Math.round(parseInt(props.size, 10) * 0.38)}px`
  }
})
</script>

<style scoped>
.app-avatar {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  flex-shrink: 0;
  letter-spacing: 0.5px;
}

.app-avatar-img {
  object-fit: cover;
}
</style>
