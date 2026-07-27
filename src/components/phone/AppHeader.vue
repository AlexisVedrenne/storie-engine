<template>
  <div class="app-header">
    <button class="back-btn" @click="$emit('back')" :aria-label="t('common.back')">
      <q-icon name="chevron_left" size="26px" />
    </button>
    <span class="title">{{ title }}</span>
    <span class="spacer" />
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

defineProps({ title: { type: String, default: '' } })
defineEmits(['back'])
const { t } = useI18n()
</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  padding: 10px 6px;
  color: #fff;
  font-weight: 600;
  font-size: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.back-btn {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 2px;
}

.title {
  flex: 1;
  text-align: center;
  margin-right: 26px;
}

.spacer {
  width: 0;
}
</style>
