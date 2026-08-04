<template>
  <div class="header-block">
    <AppTitleBar :title="block.title || ''" :icon="block.icon || 'apps'" :color="block.color || '#4c8bf5'" @back="phone.goHome()" />
  </div>
</template>

<script setup>
import { usePhoneStore } from '@/engine/stores/phone'
import AppTitleBar from '@/components/phone/AppTitleBar.vue'

defineProps({ block: { type: Object, required: true } })
const phone = usePhoneStore()
</script>

<style scoped>
/* AppTitleBar already carries its own 16px horizontal padding — cancel the
   parent BlockList's own inset (see CustomAppRenderer.vue) so it isn't
   doubled here specifically. */
.header-block {
  margin: 0 -16px;
}
</style>
