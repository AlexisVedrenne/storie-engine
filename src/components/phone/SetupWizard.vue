<template>
  <div class="setup-wizard">
    <transition name="step-swap" mode="out-in">
      <div v-if="step === 'language'" key="language" class="step">
        <div class="step-icon">
          <q-icon name="language" size="30px" color="white" />
        </div>
        <h1>Langue · Language</h1>
        <div class="language-list">
          <button
            v-for="l in SUPPORTED_LOCALES"
            :key="l.code"
            class="language-row"
            @click="chooseLocale(l.code)"
          >
            <span>{{ l.label }}</span>
            <q-icon name="chevron_right" size="18px" color="rgba(255,255,255,0.4)" />
          </button>
        </div>
      </div>

      <div v-else-if="step === 'welcome'" key="welcome" class="step">
        <div class="step-icon">
          <q-icon name="smartphone" size="34px" color="white" />
        </div>
        <h1>{{ t('wizard.welcome.title') }}</h1>
        <p>{{ t('wizard.welcome.subtitle') }}</p>
        <button class="primary-btn" @click="step = 'name'">{{ t('wizard.welcome.cta') }}</button>
      </div>

      <div v-else-if="step === 'name'" key="name" class="step">
        <div class="step-icon">
          <q-icon name="edit" size="32px" color="white" />
        </div>
        <h1>{{ t('wizard.name.title') }}</h1>
        <p>{{ t('wizard.name.subtitle') }}</p>
        <input
          v-model="name"
          class="name-input"
          type="text"
          :placeholder="t('wizard.name.placeholder')"
          maxlength="20"
          @keyup.enter="goName"
        />
        <button class="primary-btn" :disabled="!name.trim()" @click="goName">{{ t('common.continue') }}</button>
      </div>

      <div v-else-if="step === 'sim'" key="sim" class="step">
        <div class="step-icon">
          <q-icon name="sim_card" size="30px" color="white" />
        </div>
        <h1>{{ t('wizard.sim.title') }}</h1>
        <p>{{ t('wizard.sim.subtitle') }}</p>

        <div class="pin-dots">
          <span v-for="i in 4" :key="i" class="pin-dot" :class="{ filled: pin.length >= i }" />
        </div>

        <div class="keypad">
          <button v-for="n in 9" :key="n" class="key" :disabled="simChecking" @click="pressKey(n)">
            {{ n }}
          </button>
          <span class="key key-spacer" />
          <button class="key" :disabled="simChecking" @click="pressKey(0)">0</button>
          <button class="key key-back" :disabled="!pin.length || simChecking" @click="backspace">
            <q-icon name="backspace" size="18px" />
          </button>
        </div>

        <p class="hint">{{ simChecking ? t('wizard.sim.checking') : '&nbsp;' }}</p>
      </div>

      <div v-else-if="step === 'wifi'" key="wifi" class="step">
        <div class="step-icon">
          <q-icon name="wifi" size="30px" color="white" />
        </div>
        <h1>{{ t('wizard.wifi.title') }}</h1>

        <div v-if="wifiState === 'scanning'" class="wifi-status">
          <q-spinner color="white" size="26px" />
          <span>{{ t('wizard.wifi.scanning') }}</span>
        </div>

        <div v-else-if="wifiState === 'list'" class="wifi-list">
          <button class="wifi-row" @click="connectWifi">
            <q-icon name="wifi" size="19px" />
            <span class="wifi-name">{{ wifiSsid }}</span>
            <q-icon name="lock" size="14px" color="rgba(255,255,255,0.45)" />
          </button>
        </div>

        <div v-else-if="wifiState === 'connecting'" class="wifi-status">
          <q-spinner color="white" size="26px" />
          <span>{{ t('wizard.wifi.connectingTo', { ssid: wifiSsid }) }}</span>
        </div>

        <div v-else class="wifi-status connected">
          <q-icon name="check_circle" size="26px" color="#4caf50" />
          <span>{{ t('wizard.wifi.connected') }}</span>
        </div>
      </div>

      <div v-else-if="step === 'account'" key="account" class="step">
        <div class="step-icon">
          <q-icon name="cloud_sync" size="30px" color="white" />
        </div>
        <h1>{{ t('wizard.account.title') }}</h1>

        <div v-if="accountState === 'connecting'" class="wifi-status">
          <q-spinner color="white" size="26px" />
          <span>{{ t('wizard.account.connecting') }}</span>
        </div>

        <div v-else-if="accountState === 'syncing'" class="sync-wrap">
          <p class="sync-label">{{ t('wizard.account.syncing') }}</p>
          <div class="sync-grid">
            <div
              v-for="(a, i) in syncApps"
              :key="a.id"
              class="sync-app"
              :style="{ animationDelay: `${i * 150}ms` }"
            >
              <div class="sync-icon" :style="{ background: a.color }">
                <q-icon :name="a.icon" size="20px" color="white" />
              </div>
              <q-icon
                name="check_circle"
                size="15px"
                color="#4caf50"
                class="sync-check"
                :style="{ animationDelay: `${i * 150 + 450}ms` }"
              />
            </div>
          </div>
        </div>

        <div v-else class="wifi-status connected">
          <q-icon name="check_circle" size="26px" color="#4caf50" />
          <span>{{ t('wizard.account.connected') }}</span>
        </div>
      </div>

      <div v-else-if="step === 'color'" key="color" class="step">
        <div class="step-icon" :style="selectedColor ? { background: selectedColor } : {}">
          <q-icon name="palette" size="30px" color="white" />
        </div>
        <h1>{{ t('wizard.color.title') }}</h1>
        <p>{{ t('wizard.color.subtitle') }}</p>
        <div class="color-grid">
          <button
            v-for="c in colorChoices"
            :key="c"
            class="color-swatch"
            :style="{ background: c }"
            :class="{ selected: selectedColor === c }"
            @click="selectedColor = c"
          >
            <q-icon v-if="selectedColor === c" name="check" size="18px" color="white" />
          </button>
        </div>
        <button class="primary-btn" :disabled="!selectedColor" @click="step = 'done'">{{ t('common.continue') }}</button>
      </div>

      <div v-else key="done" class="step">
        <div class="step-icon" :style="selectedColor ? { background: selectedColor } : {}">
          <q-icon name="check_circle" size="34px" color="white" />
        </div>
        <h1>{{ t('wizard.done.title') }}</h1>
        <p>{{ t('wizard.done.subtitle', { name: name.trim() }) }}</p>
        <button class="primary-btn" @click="finish">{{ t('wizard.done.cta') }}</button>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStoryStore } from '@/engine/stores/story'
import { SUPPORTED_LOCALES } from '@/engine/i18n/locales'

const story = useStoryStore()
const { t } = useI18n()
const emit = defineEmits(['finish'])

const step = ref('language')
const name = ref('')

// a SSID doesn't have a language, kept as a plain constant rather than a
// translation key
const wifiSsid = 'Freebox-8F3D2'

function chooseLocale(code) {
  story.setLocale(code)
  step.value = 'welcome'
}

// --- fake SIM PIN — any 4 digits are accepted, purely for atmosphere ------
const pin = ref('')
const simChecking = ref(false)

function pressKey(n) {
  if (simChecking.value || pin.value.length >= 4) return
  pin.value += String(n)
  if (pin.value.length === 4) {
    simChecking.value = true
    setTimeout(() => {
      step.value = 'wifi'
    }, 700)
  }
}

function backspace() {
  if (simChecking.value) return
  pin.value = pin.value.slice(0, -1)
}

// --- fake Wi-Fi connect ----------------------------------------------------
const wifiState = ref('scanning') // 'scanning' | 'list' | 'connecting' | 'connected'

watch(step, val => {
  if (val === 'wifi') {
    wifiState.value = 'scanning'
    setTimeout(() => (wifiState.value = 'list'), 900)
  } else if (val === 'account') {
    accountState.value = 'connecting'
    setTimeout(() => {
      accountState.value = 'syncing'
      setTimeout(() => {
        accountState.value = 'done'
        setTimeout(() => (step.value = 'color'), 700)
      }, 1400)
    }, 900)
  }
})

function connectWifi() {
  wifiState.value = 'connecting'
  setTimeout(() => {
    wifiState.value = 'connected'
    setTimeout(() => (step.value = 'account'), 700)
  }, 900)
}

// --- fake account sync — justifies the phone already having contacts/apps --
const accountState = ref('connecting') // 'connecting' | 'syncing' | 'done'
const syncApps = [
  { id: 'messages', icon: 'sms', color: '#4caf50' },
  { id: 'social', icon: 'photo_camera', color: 'linear-gradient(135deg,#f093fb,#f5576c)' },
  { id: 'gallery', icon: 'image', color: 'linear-gradient(135deg,#ffb300,#f4511e,#8e24aa,#1e88e5)' },
  { id: 'calls', icon: 'call', color: '#8bc34a' }
]

// --- accent color ----------------------------------------------------------
const colorChoices = ['#9c27b0', '#3f51b5', '#4caf50', '#f44336', '#ff9800', '#00bcd4']
const selectedColor = ref('')

function goName() {
  if (!name.value.trim()) return
  step.value = 'sim'
}

function finish() {
  story.setPlayerName(name.value)
  story.setPlayerColor(selectedColor.value)
  emit('finish')
}
</script>

<style scoped>
.setup-wizard {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 28px;
  background: linear-gradient(180deg, #1f1a3a 0%, #0d0d17 100%);
  color: #fff;
  text-align: center;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.step-icon {
  width: 68px;
  height: 68px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
  background: linear-gradient(135deg, #7b5cff, #f5576c);
  box-shadow: 0 0 30px rgba(123, 92, 255, 0.35);
  animation: step-icon-in 0.4s cubic-bezier(0.34, 1.4, 0.64, 1) both;
}

@keyframes step-icon-in {
  from {
    opacity: 0;
    transform: scale(0.6);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

h1 {
  font-size: 21px;
  font-weight: 800;
  margin: 0;
}

p {
  font-size: 13.5px;
  opacity: 0.7;
  line-height: 1.4;
  margin: 0 0 12px;
}

.hint {
  min-height: 16px;
  font-size: 12px;
  opacity: 0.55;
  margin: 4px 0 0;
}

.name-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 12px 14px;
  color: #fff;
  font-size: 16px;
  text-align: center;
  outline: none;
  margin-bottom: 8px;
}

.name-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.primary-btn {
  width: 100%;
  background: linear-gradient(135deg, #7b5cff, #f5576c);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  padding: 12px 0;
  margin-top: 6px;
  cursor: pointer;
  transition:
    transform 0.12s ease,
    opacity 0.15s ease;
}

.primary-btn:active {
  transform: scale(0.97);
}

.primary-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

/* --- SIM PIN keypad --- */
.pin-dots {
  display: flex;
  gap: 12px;
  margin: 4px 0 18px;
}

.pin-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.4);
  transition:
    background 0.15s ease,
    transform 0.15s ease;
}

.pin-dot.filled {
  background: #fff;
  transform: scale(1.1);
}

.keypad {
  display: grid;
  grid-template-columns: repeat(3, 56px);
  gap: 12px;
  justify-content: center;
}

.key {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  border: none;
  color: #fff;
  font-size: 20px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s ease, background 0.15s ease;
}

.key:active:not(:disabled) {
  transform: scale(0.92);
  background: rgba(255, 255, 255, 0.16);
}

.key:disabled {
  opacity: 0.35;
  cursor: default;
}

.key-spacer {
  background: none;
}

.key-back {
  background: none;
  color: rgba(255, 255, 255, 0.7);
}

/* --- language picker --- */
.language-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.language-row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 14px 16px;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.12s ease;
}

.language-row:active {
  transform: scale(0.97);
}

/* --- Wi-Fi --- */
.wifi-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  opacity: 0.8;
  padding: 10px 0;
}

.wifi-status.connected {
  opacity: 1;
  font-weight: 600;
}

.wifi-list {
  width: 100%;
}

.wifi-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 12px 14px;
  color: #fff;
  cursor: pointer;
  transition: transform 0.12s ease;
}

.wifi-row:active {
  transform: scale(0.97);
}

.wifi-name {
  flex: 1;
  text-align: left;
  font-size: 14px;
}

/* --- account sync --- */
.sync-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 6px 0;
}

.sync-label {
  font-size: 12.5px;
  opacity: 0.7;
  margin: 0;
}

.sync-grid {
  display: flex;
  gap: 16px;
}

.sync-app {
  position: relative;
  animation: sync-in 0.35s cubic-bezier(0.34, 1.4, 0.64, 1) both;
}

@keyframes sync-in {
  from {
    opacity: 0;
    transform: scale(0.6);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.sync-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sync-check {
  position: absolute;
  bottom: -4px;
  right: -4px;
  background: #12101c;
  border-radius: 50%;
  opacity: 0;
  animation: sync-check-in 0.3s ease both;
}

@keyframes sync-check-in {
  from {
    opacity: 0;
    transform: scale(0.4);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* --- color picker --- */
.color-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  width: 100%;
  margin-bottom: 8px;
}

.color-swatch {
  aspect-ratio: 1;
  border-radius: 14px;
  border: 2px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.12s ease;
}

.color-swatch:active {
  transform: scale(0.92);
}

.color-swatch.selected {
  border-color: #fff;
}

.step-swap-enter-active,
.step-swap-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.26s cubic-bezier(0.34, 1.2, 0.64, 1);
}

.step-swap-enter-from {
  opacity: 0;
  transform: translateX(16px);
}

.step-swap-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}
</style>
