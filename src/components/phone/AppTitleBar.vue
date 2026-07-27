<template>
  <div class="app-titlebar">
    <button class="back-btn" @click="$emit('back')" :aria-label="t('common.back')">
      <q-icon name="chevron_left" size="26px" />
    </button>
    <div class="title-row">
      <span class="app-chip" :style="{ background: color }">
        <q-icon :name="icon" size="13px" color="white" />
      </span>
      <h1 class="big-title">{{ title }}</h1>
    </div>
    <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

defineProps({
  title: { type: String, required: true },
  icon: { type: String, required: true },
  color: { type: String, required: true },
  subtitle: { type: String, default: '' }
})
defineEmits(['back'])
const { t } = useI18n()
</script>

<style scoped>
.app-titlebar {
  padding: 6px 16px 8px;
  flex-shrink: 0;
}

.back-btn {
  background: none;
  border: none;
  color: #fff;
  opacity: 0.8;
  cursor: pointer;
  display: flex;
  padding: 2px;
  margin-left: -4px;
  margin-bottom: 2px;
  transition: transform 0.12s ease;
}

.back-btn:active {
  transform: scale(0.88);
}

.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-chip {
  width: 22px;
  height: 22px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.big-title {
  margin: 0;
  color: #fff;
  font-size: 27px;
  font-weight: 800;
  letter-spacing: -0.5px;
}

.subtitle {
  margin: 2px 0 0 30px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
}
</style>
