<template>
  <div class="widgets">
    <!-- Weather — driven by story.weather, see docs § widgets pilotés -->
    <div class="widget wide weather">
      <div class="weather-top">
        <span class="city">{{ story.weather.city }}</span>
        <span class="temp">{{ story.weather.temp }}°</span>
      </div>
      <div class="weather-icon">{{ story.weather.icon }}</div>
      <div class="caption">{{ story.weather.caption }}</div>
    </div>

    <!-- Calendar — real current date, for a bit of "this is alive" feel -->
    <div class="widget calendar">
      <div class="cal-weekday">{{ weekday }}</div>
      <div class="cal-day">{{ day }}</div>
      <div class="cal-month">{{ month }}</div>
    </div>

    <!-- Steps — fake counter with an animated ring -->
    <div class="widget steps">
      <svg class="ring" viewBox="0 0 42 42">
        <circle class="ring-bg" cx="21" cy="21" r="18" />
        <circle
          class="ring-fg"
          cx="21"
          cy="21"
          r="18"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="dashOffset"
        />
      </svg>
      <div class="steps-text">
        <div class="steps-value">{{ story.steps.toLocaleString(story.activeLocale) }}</div>
        <div class="caption">{{ t('home.stepsUnit') }}</div>
      </div>
    </div>

    <!-- Music — real once a `music` timeline entry is playing (story.nowPlaying,
         see story.js's startMusic/stopMusic); decorative placeholder text
         otherwise, same look a project that never uses the feature always had. -->
    <div class="widget wide music">
      <div class="music-art">🎵</div>
      <div class="music-info">
        <div v-if="story.nowPlaying" class="music-title-clip">
          <div class="music-title-inner">
            <span class="music-title-track">{{ story.nowPlaying.title }}</span>
            <span class="music-title-track" aria-hidden="true">{{ story.nowPlaying.title }}</span>
          </div>
        </div>
        <div v-else class="music-title">{{ t('home.musicTitle') }}</div>
      </div>
      <div class="eq" :class="{ playing: !!story.nowPlaying }">
        <span></span><span></span><span></span><span></span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStoryStore } from '@/engine/stores/story'

const story = useStoryStore()
const { t } = useI18n()

// story.resolvedClock() (driven by clockTime/clockDate, set via an `effect`
// — see applyEffects) combines the real device date with whichever piece
// a chapter has overridden.
const now = computed(() => story.resolvedClock())
const weekday = computed(() => now.value.toLocaleDateString(story.activeLocale, { weekday: 'short' }).replace('.', ''))
const day = computed(() => now.value.getDate())
const month = computed(() => now.value.toLocaleDateString(story.activeLocale, { month: 'short' }).replace('.', ''))

// weather + steps come from the story now — see stores/story.js applyEffects
// ("weather", "steps", "stepsGoal" keys) to drive them from the timeline.
const progress = computed(() =>
  Math.min(100, Math.round((story.steps / story.stepsGoal) * 100))
)

const radius = 18
const circumference = 2 * Math.PI * radius
const dashOffset = computed(() => circumference * (1 - progress.value / 100))
</script>

<style scoped>
.widgets {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 22px;
}

.widget {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 14px;
  position: relative;
  overflow: hidden;
}

.widget.wide {
  grid-column: span 2;
}

.caption {
  font-size: 11px;
  opacity: 0.6;
  line-height: 1.3;
}

/* --- Weather --- */
.weather {
  background: linear-gradient(135deg, #3a6fd8, #2b4e9e);
}

.weather-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.city {
  font-size: 13px;
  font-weight: 600;
}

.temp {
  font-size: 22px;
  font-weight: 300;
}

.weather-icon {
  position: absolute;
  top: 8px;
  right: 14px;
  font-size: 34px;
  opacity: 0.85;
}

.weather .caption {
  margin-top: 16px;
  max-width: 75%;
}

/* --- Calendar --- */
.calendar {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.cal-weekday {
  font-size: 11px;
  font-weight: 700;
  color: #ff6b6b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.cal-day {
  font-size: 30px;
  font-weight: 300;
  line-height: 1.1;
}

.cal-month {
  font-size: 11px;
  opacity: 0.6;
  text-transform: capitalize;
}

/* --- Steps --- */
.steps {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.ring {
  width: 42px;
  height: 42px;
  transform: rotate(-90deg);
  flex-shrink: 0;
}

.ring-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.15);
  stroke-width: 4;
}

.ring-fg {
  fill: none;
  stroke: #8bc34a;
  stroke-width: 4;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.6s ease;
}

.steps-text {
  line-height: 1.2;
}

.steps-value {
  font-size: 16px;
  font-weight: 600;
}

/* --- Music --- */
.music {
  display: flex;
  align-items: center;
  gap: 10px;
}

.music-art {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.music-info {
  flex: 1;
  min-width: 0;
}

.music-title {
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Real track title (story.nowPlaying) — continuous seamless marquee
   instead of ellipsis-truncating: two identical copies side by side,
   scrolled left by exactly one copy's width then snapped back, so the
   loop point is invisible. */
.music-title-clip {
  overflow: hidden;
  white-space: nowrap;
}

.music-title-inner {
  display: inline-flex;
  animation: music-title-scroll 9s linear infinite;
}

.music-title-track {
  font-size: 12.5px;
  font-weight: 600;
  padding-right: 28px;
}

@keyframes music-title-scroll {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}

.eq {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 14px;
  flex-shrink: 0;
}

.eq span {
  width: 3px;
  height: 4px;
  background: var(--phone-accent, #4c8bf5);
  border-radius: 2px;
  animation: eq-bounce 0.8s ease-in-out infinite;
  animation-play-state: paused;
}

.eq.playing span {
  animation-play-state: running;
}

.eq span:nth-child(1) {
  animation-delay: 0s;
}
.eq span:nth-child(2) {
  animation-delay: 0.15s;
}
.eq span:nth-child(3) {
  animation-delay: 0.3s;
}
.eq span:nth-child(4) {
  animation-delay: 0.45s;
}

@keyframes eq-bounce {
  0%,
  100% {
    height: 4px;
  }
  50% {
    height: 14px;
  }
}


</style>
