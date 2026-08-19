<template>
  <div class="app-screen">
    <transition name="screen-swap" mode="out-in">
      <div v-if="screen === 'main'" key="main" class="list-stack">
        <AppTitleBar
          :title="t('settings.title')"
          icon="settings"
          color="#8e8e93"
          @back="phone.goHome()"
        />

        <div class="settings-list">
          <button class="account-card" @click="screen = 'about'">
            <AppAvatar :name="story.myName" :color="story.myColor" :size="48" />
            <div class="account-info">
              <div class="account-name">{{ story.myName }}</div>
              <div class="account-sub">{{ t('settings.accountSub', { osName }) }}</div>
            </div>
            <q-icon name="chevron_right" size="20px" color="rgba(255,255,255,0.35)" />
          </button>

          <div class="section">
            <div class="row">
              <q-icon name="wifi" size="19px" color="#2196f3" />
              <span class="row-label">{{ t('settings.wifi') }}</span>
              <span class="row-sub">{{ wifiOn ? 'Freebox-8F3D2' : t('settings.wifiOff') }}</span>
              <button class="switch" :class="{ on: wifiOn }" @click="wifiOn = !wifiOn">
                <span class="knob" />
              </button>
            </div>
            <div class="row">
              <q-icon name="signal_cellular_alt" size="19px" color="#4caf50" />
              <span class="row-label">{{ t('settings.mobileData') }}</span>
              <button
                class="switch"
                :class="{ on: mobileDataOn }"
                @click="mobileDataOn = !mobileDataOn"
              >
                <span class="knob" />
              </button>
            </div>
            <div class="row">
              <q-icon name="bluetooth" size="19px" color="#2196f3" />
              <span class="row-label">{{ t('settings.bluetooth') }}</span>
              <button
                class="switch"
                :class="{ on: bluetoothOn }"
                @click="bluetoothOn = !bluetoothOn"
              >
                <span class="knob" />
              </button>
            </div>
          </div>

          <div class="section">
            <div class="row">
              <q-icon name="notifications" size="19px" color="#f44336" />
              <span class="row-label">{{ t('settings.notifications') }}</span>
              <button class="switch" :class="{ on: notifsOn }" @click="notifsOn = !notifsOn">
                <span class="knob" />
              </button>
            </div>
            <button class="row nav-row" @click="screen = 'sound'">
              <q-icon name="volume_up" size="19px" color="#f44336" />
              <span class="row-label">{{ t('settings.sound') }}</span>
              <span class="row-sub">{{
                story.soundEnabled ? `${story.soundVolume}%` : t('settings.soundOff')
              }}</span>
              <q-icon name="chevron_right" size="18px" color="rgba(255,255,255,0.3)" />
            </button>
          </div>

          <div class="section">
            <button class="row nav-row" @click="screen = 'display'">
              <q-icon name="brightness_6" size="19px" color="#ff9800" />
              <span class="row-label">{{ t('settings.display') }}</span>
              <q-icon name="chevron_right" size="18px" color="rgba(255,255,255,0.3)" />
            </button>
            <button class="row nav-row" @click="screen = 'battery'">
              <q-icon name="battery_full" size="19px" color="#4caf50" />
              <span class="row-label">{{ t('settings.battery') }}</span>
              <span class="row-sub">{{ story.battery }}%</span>
              <q-icon name="chevron_right" size="18px" color="rgba(255,255,255,0.3)" />
            </button>
            <div class="row storage-row">
              <q-icon name="storage" size="19px" color="#9c27b0" />
              <span class="row-label">{{ t('settings.storage') }}</span>
              <span class="row-sub">48 Go / 128 Go</span>
            </div>
            <div class="storage-bar"><div class="storage-fill" /></div>
            <div class="row">
              <q-icon name="privacy_tip" size="19px" color="#607d8b" />
              <span class="row-label">{{ t('settings.privacy') }}</span>
            </div>
          </div>

          <div class="section">
            <div class="row">
              <q-icon name="language" size="19px" color="#00bcd4" />
              <span class="row-label">{{ t('settings.language') }}</span>
              <select class="language-select" :value="story.activeLocale" @change="onLocaleChange">
                <option v-for="l in story.availableLocales" :key="l.code" :value="l.code">
                  {{ l.label }}
                </option>
              </select>
            </div>
          </div>

          <div class="section">
            <button class="row nav-row" @click="screen = 'about'">
              <q-icon name="info" size="19px" color="rgba(255,255,255,0.6)" />
              <span class="row-label">{{ t('settings.about') }}</span>
              <q-icon name="chevron_right" size="18px" color="rgba(255,255,255,0.3)" />
            </button>
          </div>

          <div class="section">
            <button class="row nav-row" @click="switchSlot">
              <q-icon name="swap_horiz" size="19px" color="rgba(255,255,255,0.6)" />
              <span class="row-label">{{ t('settings.switchSlotRow') }}</span>
              <q-icon name="chevron_right" size="18px" color="rgba(255,255,255,0.3)" />
            </button>
          </div>

          <div class="section">
            <button class="row danger-row" @click="screen = 'reset'">
              <q-icon name="restart_alt" size="19px" color="#f44336" />
              <span class="row-label danger-label">{{ t('settings.resetRow') }}</span>
              <q-icon name="chevron_right" size="18px" color="rgba(244,67,54,0.4)" />
            </button>
          </div>
        </div>
      </div>

      <div v-else-if="screen === 'display'" key="display" class="list-stack">
        <AppHeader :title="t('settings.display')" @back="screen = 'main'" />
        <div class="subpage">
          <div class="brightness-row">
            <q-icon name="brightness_low" size="18px" color="rgba(255,255,255,0.6)" />
            <input
              v-model.number="brightness"
              type="range"
              min="10"
              max="100"
              class="brightness-slider"
            />
            <q-icon name="brightness_high" size="18px" color="rgba(255,255,255,0.6)" />
          </div>
          <p class="subpage-hint">{{ t('settings.brightnessHint', { value: brightness }) }}</p>
        </div>
      </div>

      <div v-else-if="screen === 'sound'" key="sound" class="list-stack">
        <AppHeader :title="t('settings.sound')" @back="screen = 'main'" />
        <div class="subpage">
          <div class="sound-toggle-row">
            <span class="row-label">{{ t('settings.soundEnabled') }}</span>
            <button
              class="switch"
              :class="{ on: story.soundEnabled }"
              @click="story.setSoundEnabled(!story.soundEnabled)"
            >
              <span class="knob" />
            </button>
          </div>
          <div class="brightness-row">
            <q-icon name="volume_down" size="18px" color="rgba(255,255,255,0.6)" />
            <input
              :value="story.soundVolume"
              type="range"
              min="0"
              max="100"
              class="brightness-slider"
              :disabled="!story.soundEnabled"
              @input="story.setSoundVolume($event.target.valueAsNumber)"
            />
            <q-icon name="volume_up" size="18px" color="rgba(255,255,255,0.6)" />
          </div>
          <p class="subpage-hint">
            {{ t('settings.soundVolumeHint', { value: story.soundVolume }) }}
          </p>
        </div>
      </div>

      <div v-else-if="screen === 'battery'" key="battery" class="list-stack">
        <AppHeader :title="t('settings.battery')" @back="screen = 'main'" />
        <div class="subpage">
          <div class="battery-circle">
            <span>{{ story.battery }}%</span>
          </div>
          <p class="subpage-hint">
            {{ t('settings.batteryHint', { value: estimatedHours }) }}
          </p>
        </div>
      </div>

      <div v-else-if="screen === 'about'" key="about" class="list-stack">
        <AppHeader :title="t('settings.about')" @back="screen = 'main'" />
        <div class="subpage about-list">
          <div class="about-row">
            <span>{{ t('settings.aboutDeviceName') }}</span
            ><span>{{ story.myName }}</span>
          </div>
          <div class="about-row">
            <span>{{ t('settings.aboutModel') }}</span
            ><span>OS 14</span>
          </div>
          <div class="about-row">
            <span>{{ t('settings.aboutOsVersion', { osName }) }}</span
            ><span>1.0.3</span>
          </div>
          <div class="about-row">
            <span>{{ t('settings.aboutSerial') }}</span
            ><span>{{ serial }}</span>
          </div>
          <div class="about-row">
            <span>{{ t('settings.aboutCapacity') }}</span
            ><span>128 Go</span>
          </div>
        </div>
      </div>

      <div v-else key="reset" class="list-stack">
        <AppHeader :title="t('settings.resetTitle')" @back="screen = 'main'" />
        <div class="subpage reset-page">
          <q-icon name="warning" size="40px" color="#f44336" />
          <h2>{{ t('settings.resetConfirmTitle') }}</h2>
          <p>{{ t('settings.resetConfirmBody') }}</p>
          <button class="danger-btn" @click="doReset">{{ t('settings.resetConfirmCta') }}</button>
          <button class="cancel-btn" @click="screen = 'main'">{{ t('common.cancel') }}</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePhoneStore } from '@/engine/stores/phone'
import { useStoryStore } from '@/engine/stores/story'
import AppTitleBar from '@/components/phone/AppTitleBar.vue'
import AppHeader from '@/components/phone/AppHeader.vue'
import AppAvatar from '@/components/phone/AppAvatar.vue'

const phone = usePhoneStore()
const story = useStoryStore()
const { t } = useI18n()

function onLocaleChange(event) {
  story.setLocale(event.target.value)
}

const screen = ref('main') // 'main' | 'display' | 'sound' | 'battery' | 'about' | 'reset'

// purely decorative toggles — flavor only, no narrative meaning (unlike
// sound, which is real — see story.soundEnabled/soundVolume)
const wifiOn = ref(true)
const mobileDataOn = ref(true)
const bluetoothOn = ref(false)
const notifsOn = ref(true)
const brightness = ref(70)

const estimatedHours = computed(() => `${Math.max(1, Math.round(story.battery / 12))} h`)

// game.osName (see GameForm.vue) — fictional phone OS brand name, shown
// here and on BootScreen.vue. Falls back to the engine's default so every
// project saved before this field existed keeps its current look.
const osName = computed(() => story.gameConfig?.osName || 'PhoneOS')

// stable-but-fake serial, same trick as the fake follower counts elsewhere
const serial = computed(() => {
  const seed = story.myName + 'serial'
  let hash = 0
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) % 100000000
  return `LP${String(hash).padStart(8, '0')}`
})

function doReset() {
  story.resetSave()
  phone.requestReboot()
}

// Explicit flush before leaving — makeChoice()/answerCall()/etc. don't
// save() themselves, they "ride along" on whatever checkpoint story.js's
// timeline loop hits next (see that file's own comment); without this, an
// action taken seconds before switching slots could be lost. Doesn't touch
// story.resetSave() — switching slots must never erase THIS slot's
// progress, only "reset phone" does that.
function switchSlot() {
  story.save()
  phone.requestReboot({ toSlotPicker: true })
}
</script>

<style scoped>
.app-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.list-stack {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.screen-swap-enter-active,
.screen-swap-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.22s cubic-bezier(0.34, 1.2, 0.64, 1);
}

.screen-swap-enter-from {
  opacity: 0;
  transform: translateX(14px);
}

.screen-swap-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

.settings-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px 14px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.account-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.06);
  border: none;
  border-radius: 14px;
  padding: 12px 14px;
  cursor: pointer;
  text-align: left;
  transition: transform 0.12s ease;
  flex-shrink: 0;
}

.account-card:active {
  transform: scale(0.98);
}

.account-info {
  flex: 1;
  min-width: 0;
  color: #fff;
}

.account-name {
  font-weight: 700;
  font-size: 15px;
}

.account-sub {
  font-size: 11.5px;
  opacity: 0.55;
}

.section {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  overflow: hidden;
  flex-shrink: 0;
}

.row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  background: none;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding: 11px 14px;
  color: #fff;
  cursor: default;
  text-align: left;
}

.section .row:last-child {
  border-bottom: none;
}

.nav-row,
.danger-row {
  cursor: pointer;
  transition: background 0.12s ease;
}

.nav-row:active,
.danger-row:active {
  background: rgba(255, 255, 255, 0.05);
}

.row-label {
  flex: 1;
  font-size: 14px;
}

.danger-label {
  color: #f44336;
  font-weight: 600;
}

.row-sub {
  font-size: 12.5px;
  opacity: 0.5;
}

.switch {
  width: 42px;
  height: 25px;
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  padding: 2px;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s ease;
}

.switch.on {
  background: #4caf50;
}

.knob {
  display: block;
  width: 21px;
  height: 21px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.15s ease;
}

.switch.on .knob {
  transform: translateX(17px);
}

.language-select {
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 13px;
  padding: 5px 8px;
}

.language-select option {
  color: #111;
}

.storage-row {
  padding-bottom: 4px;
}

.storage-bar {
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 14px 11px;
  overflow: hidden;
}

.storage-fill {
  width: 38%;
  height: 100%;
  background: linear-gradient(90deg, #9c27b0, #f5576c);
  border-radius: 3px;
}

/* --- sub-pages --- */
.subpage {
  flex: 1;
  padding: 28px 22px;
  color: #fff;
  overflow-y: auto;
  overflow-x: hidden;
}

.subpage-hint {
  text-align: center;
  font-size: 13px;
  opacity: 0.6;
  margin-top: 14px;
}

.brightness-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sound-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 22px;
}

.brightness-slider {
  flex: 1;
  accent-color: #ff9800;
}

.battery-circle {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  border: 6px solid #4caf50;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 20px auto 0;
  font-size: 26px;
  font-weight: 800;
}

.about-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.about-row {
  display: flex;
  justify-content: space-between;
  font-size: 13.5px;
  padding: 11px 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.about-row span:first-child {
  opacity: 0.6;
}

.about-row span:last-child {
  font-weight: 600;
}

.reset-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  padding-top: 40px;
}

.reset-page h2 {
  font-size: 18px;
  margin: 4px 0 0;
}

.reset-page p {
  font-size: 13px;
  opacity: 0.65;
  line-height: 1.5;
  margin: 0 0 14px;
}

.danger-btn {
  width: 100%;
  background: #f44336;
  border: none;
  border-radius: 12px;
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  padding: 12px 0;
  cursor: pointer;
  transition: transform 0.12s ease;
}

.danger-btn:active {
  transform: scale(0.97);
}

.cancel-btn {
  width: 100%;
  background: rgba(255, 255, 255, 0.08);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  padding: 12px 0;
  margin-top: 8px;
  cursor: pointer;
  transition: transform 0.12s ease;
}

.cancel-btn:active {
  transform: scale(0.97);
}
</style>
