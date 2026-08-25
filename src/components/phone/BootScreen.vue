<template>
  <div class="boot-screen">
    <div class="boot-logo">
      <q-icon name="smartphone" size="42px" color="white" />
    </div>
    <div class="boot-title">{{ story.gameConfig?.osName || 'PhoneOS' }}</div>
    <div class="boot-progress">
      <div class="boot-progress-fill" />
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { playSound } from '@/engine/utils/sound'
import { useStoryStore } from '@/engine/stores/story'

const story = useStoryStore()
const emit = defineEmits(['done'])

// timed to roughly match the fill animation below — purely cosmetic,
// no state to load here (that already happened in PhonePage before this
// component even mounted).
onMounted(() => {
  playSound('system-boot')
  setTimeout(() => emit('done'), 3200)
})
</script>

<style scoped>
.boot-screen {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  background: #000;
}

.boot-logo {
  width: 84px;
  height: 84px;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--phone-accent-gradient, linear-gradient(135deg, #7b5cff, #f5576c));
  animation:
    boot-pop 0.6s cubic-bezier(0.34, 1.4, 0.64, 1) both,
    boot-pulse 1.6s ease-in-out 0.6s infinite;
}

@keyframes boot-pop {
  from {
    opacity: 0;
    transform: scale(0.5);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes boot-pulse {
  0%,
  100% {
    box-shadow: 0 0 40px rgba(123, 92, 255, 0.5);
  }
  50% {
    box-shadow: 0 0 60px rgba(245, 87, 108, 0.55);
  }
}

.boot-title {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 3px;
  text-transform: uppercase;
  opacity: 0;
  animation: boot-fade 0.6s ease 0.5s both;
}

@keyframes boot-fade {
  to {
    opacity: 1;
  }
}

.boot-progress {
  position: absolute;
  bottom: 70px;
  width: 120px;
  height: 3px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.15);
  overflow: hidden;
}

.boot-progress-fill {
  height: 100%;
  width: 0%;
  border-radius: 2px;
  background: var(--phone-accent-gradient, linear-gradient(90deg, #7b5cff, #f5576c));
  animation: boot-fill 2.7s ease-in-out 0.3s forwards;
}

@keyframes boot-fill {
  to {
    width: 100%;
  }
}
</style>
