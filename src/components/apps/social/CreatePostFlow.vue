<template>
  <div class="create-flow">
    <div class="flow-header">
      <button class="header-btn" @click="goBack">
        <q-icon :name="step === 1 ? 'close' : 'chevron_left'" size="24px" color="white" />
      </button>
      <span class="title">{{ stepTitle }}</span>
      <button class="header-btn text-btn" :disabled="!canAdvance" @click="goNext">
        {{ step === 5 ? t('social.createShare') : t('social.createNext') }}
      </button>
    </div>

    <transition :name="direction > 0 ? 'step-fwd' : 'step-back'" mode="out-in">
      <!-- step 1: pick a photo from the gallery -->
      <div v-if="step === 1" key="1" class="step-body">
        <div v-if="!story.photos.length" class="empty">{{ t('social.createEmptyGallery') }}</div>
        <div v-else class="photo-grid">
          <button
            v-for="p in story.photos"
            :key="p.id"
            class="photo-thumb"
            :class="{ selected: selectedPhoto && selectedPhoto.id === p.id }"
            @click="selectedPhoto = p"
          >
            <img :src="resolveAssetUrl(p.url)" />
          </button>
        </div>
      </div>

      <!-- step 2: crop (decorative) -->
      <div v-else-if="step === 2" key="2" class="step-body preview-body">
        <div class="crop-frame">
          <img :src="resolveAssetUrl(selectedPhoto.url)" :style="previewStyle" />
        </div>
        <div class="hint">{{ t('social.createCropHint') }}</div>
      </div>

      <!-- step 3: filters -->
      <div v-else-if="step === 3" key="3" class="step-body preview-body">
        <div class="crop-frame">
          <img :src="resolveAssetUrl(selectedPhoto.url)" :style="previewStyle" />
        </div>
        <div class="filter-row">
          <button
            v-for="f in filters"
            :key="f.id"
            class="filter-thumb"
            :class="{ active: filterId === f.id }"
            @click="filterId = f.id"
          >
            <img :src="resolveAssetUrl(selectedPhoto.url)" :style="{ filter: f.css }" />
            <span>{{ f.label }}</span>
          </button>
        </div>
      </div>

      <!-- step 4: adjustments -->
      <div v-else-if="step === 4" key="4" class="step-body preview-body">
        <div class="crop-frame">
          <img :src="resolveAssetUrl(selectedPhoto.url)" :style="previewStyle" />
        </div>
        <div class="sliders">
          <label class="slider-row">
            <span>{{ t('social.brightness') }}</span>
            <input v-model.number="brightness" type="range" min="50" max="150" />
          </label>
          <label class="slider-row">
            <span>{{ t('social.contrast') }}</span>
            <input v-model.number="contrast" type="range" min="50" max="150" />
          </label>
          <label class="slider-row">
            <span>{{ t('social.saturation') }}</span>
            <input v-model.number="saturate" type="range" min="0" max="200" />
          </label>
        </div>
      </div>

      <!-- step 5: caption + share -->
      <div v-else key="5" class="step-body final-body">
        <div class="final-top">
          <img :src="resolveAssetUrl(selectedPhoto.url)" :style="previewStyle" class="final-thumb" />
          <textarea v-model="caption" class="caption-input" :placeholder="t('social.captionPlaceholder')" rows="3" />
        </div>

        <div class="final-row">
          <span>{{ t('social.tagPeople') }}</span>
          <q-icon name="chevron_right" size="18px" color="rgba(255,255,255,0.4)" />
        </div>
        <div class="final-row">
          <span>{{ t('social.addLocation') }}</span>
          <q-icon name="chevron_right" size="18px" color="rgba(255,255,255,0.4)" />
        </div>
        <div class="final-row">
          <span>{{ t('social.music') }}</span>
          <q-icon name="chevron_right" size="18px" color="rgba(255,255,255,0.4)" />
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStoryStore } from '@/engine/stores/story'
import { resolveAssetUrl } from '@/engine/assets'

const emit = defineEmits(['close'])
const story = useStoryStore()
const { t } = useI18n()

const step = ref(1)
const direction = ref(1)
const selectedPhoto = ref(null)
const caption = ref('')

const filters = [
  { id: 'normal', label: 'Normal', css: '' },
  { id: 'clarendon', label: 'Clarendon', css: 'contrast(1.2) saturate(1.35)' },
  { id: 'gingham', label: 'Gingham', css: 'sepia(0.25) contrast(0.9) brightness(1.05)' },
  { id: 'moon', label: 'Moon', css: 'grayscale(1) contrast(1.1)' },
  { id: 'lark', label: 'Lark', css: 'contrast(0.9) saturate(1.1) brightness(1.1)' }
]
const filterId = ref('normal')

const brightness = ref(100)
const contrast = ref(100)
const saturate = ref(100)

const cssFilter = computed(() => {
  const base = filters.find(f => f.id === filterId.value)?.css || ''
  return `${base} brightness(${brightness.value}%) contrast(${contrast.value}%) saturate(${saturate.value}%)`.trim()
})

const previewStyle = computed(() => ({ filter: cssFilter.value }))

const stepTitle = computed(
  () =>
    ({
      1: t('social.createNewPost'),
      2: t('social.createCrop'),
      3: t('social.createFilter'),
      4: t('social.createEdit'),
      5: t('social.createNewPost'),
    })[step.value]
)

const canAdvance = computed(() => step.value !== 1 || !!selectedPhoto.value)

function goBack() {
  if (step.value === 1) {
    emit('close')
    return
  }
  direction.value = -1
  step.value--
}

function goNext() {
  if (!canAdvance.value) return
  if (step.value < 5) {
    direction.value = 1
    step.value++
    return
  }
  story.addOwnPost({ image: selectedPhoto.value.url, caption: caption.value, filter: cssFilter.value })
  emit('close')
}
</script>

<style scoped>
.create-flow {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #000;
  color: #fff;
}

.flow-header {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.header-btn {
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  display: flex;
  padding: 2px;
  font-size: 14px;
  font-weight: 600;
  transition: opacity 0.12s ease;
}

.header-btn:active:not(:disabled) {
  opacity: 0.6;
}

.header-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.text-btn {
  color: #4fc3f7;
}

.title {
  flex: 1;
  text-align: center;
  font-size: 15px;
  font-weight: 600;
}

.step-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 2px;
}

.step-fwd-enter-active,
.step-fwd-leave-active,
.step-back-enter-active,
.step-back-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.22s cubic-bezier(0.34, 1.2, 0.64, 1);
}

.step-fwd-enter-from {
  opacity: 0;
  transform: translateX(24px);
}

.step-fwd-leave-to {
  opacity: 0;
  transform: translateX(-24px);
}

.step-back-enter-from {
  opacity: 0;
  transform: translateX(-24px);
}

.step-back-leave-to {
  opacity: 0;
  transform: translateX(24px);
}

.empty {
  padding: 24px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
  text-align: center;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
}

.photo-thumb {
  border: none;
  padding: 0;
  cursor: pointer;
  aspect-ratio: 1;
  overflow: hidden;
  opacity: 0.6;
  transition:
    opacity 0.15s ease,
    transform 0.12s ease;
}

.photo-thumb:active {
  transform: scale(0.94);
}

.photo-thumb.selected {
  opacity: 1;
  outline: 2px solid #4fc3f7;
  outline-offset: -2px;
}

.photo-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.preview-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 14px;
  gap: 14px;
}

.crop-frame {
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  background: #111;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.crop-frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hint {
  font-size: 12px;
  opacity: 0.5;
  text-align: center;
}

.filter-row {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  width: 100%;
  padding-bottom: 4px;
}

.filter-thumb {
  flex-shrink: 0;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 10.5px;
  width: 62px;
}

.filter-thumb img {
  width: 58px;
  height: 58px;
  object-fit: cover;
  border-radius: 4px;
}

.filter-thumb.active {
  color: #fff;
}

.filter-thumb.active img {
  outline: 2px solid #4fc3f7;
}

.sliders {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.slider-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12.5px;
  opacity: 0.85;
}

.slider-row input {
  width: 100%;
}

.final-body {
  display: flex;
  flex-direction: column;
  padding: 0;
}

.final-top {
  display: flex;
  gap: 10px;
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.final-thumb {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
}

.caption-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  resize: none;
  color: #fff;
  font-size: 13.5px;
  font-family: inherit;
}

.caption-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.final-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 13.5px;
}
</style>
