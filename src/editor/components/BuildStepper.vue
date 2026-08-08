<template>
  <q-dialog v-model="isOpen" persistent no-esc-dismiss no-backdrop-dismiss>
    <q-card class="build-card">
      <q-stepper v-model="step" flat animated color="primary" class="build-stepper">
        <q-step name="version" :title="t('buildStepper.stepVersionTitle')" icon="tag" :done="step !== 'version'">
          <div class="step-hint">
            {{ t('editorPage.versionDialogMessage', { version: currentVersion }) }}
          </div>
          <q-option-group
            v-model="bumpType"
            :options="versionOptions"
            color="primary"
            class="version-options"
          />
          <q-stepper-navigation class="stepper-nav-row">
            <q-btn color="primary" no-caps :label="t('buildStepper.continue')" @click="step = 'distribution'" />
            <q-btn flat no-caps color="grey" :label="t('common.cancel')" @click="close" />
          </q-stepper-navigation>
        </q-step>

        <q-step
          name="distribution"
          :title="t('buildStepper.stepDistributionTitle')"
          icon="dns"
          :done="step === 'build'"
        >
          <q-option-group v-model="targetIds" type="checkbox" :options="targetOptions" color="primary" />

          <div v-if="targetIds.includes('android')" class="android-toolchain-block">
            <div v-if="toolchainState === 'checking'" class="toolchain-row">
              <q-spinner size="18px" color="primary" />
              <span>{{ t('buildStepper.toolchainChecking') }}</span>
            </div>
            <div v-else-if="toolchainState === 'ready'" class="toolchain-row toolchain-ready">
              <q-icon name="check_circle" color="positive" size="18px" />
              <span>{{ t('buildStepper.toolchainReady') }}</span>
            </div>
            <div v-else-if="toolchainState === 'installing'" class="toolchain-install">
              <q-linear-progress
                :value="toolchainProgress.percent"
                color="primary"
                size="8px"
                rounded
              />
              <div class="toolchain-row">
                <span>{{ toolchainStageLabel }}</span>
              </div>
            </div>
            <div v-else class="toolchain-install">
              <div class="toolchain-row">
                <q-icon name="download" color="warning" size="18px" />
                <span>{{ t('buildStepper.toolchainMissing') }}</span>
              </div>
              <q-btn
                outline
                no-caps
                dense
                color="primary"
                :label="t('editorPage.androidToolchainInstallOk')"
                @click="installToolchain"
              />
            </div>
          </div>

          <q-stepper-navigation class="stepper-nav-row">
            <q-btn
              color="primary"
              no-caps
              :label="t('buildStepper.startBuild')"
              :disable="!canStartBuild"
              @click="startBuild"
            />
            <q-btn flat no-caps :label="t('buildStepper.back')" @click="step = 'version'" />
            <q-btn flat no-caps color="grey" :label="t('common.cancel')" @click="close" />
          </q-stepper-navigation>
        </q-step>

        <q-step name="build" :title="t('buildStepper.stepBuildTitle')" icon="rocket_launch">
          <div v-if="buildCancelled" class="step-hint">{{ t('buildStepper.buildCancelled') }}</div>
          <q-list v-else bordered separator class="build-progress-list">
            <q-item v-for="entry in buildProgressList" :key="entry.id">
              <q-item-section avatar>
                <q-spinner v-if="entry.status === 'building'" color="primary" size="22px" />
                <q-icon
                  v-else-if="entry.status === 'success'"
                  name="check_circle"
                  color="positive"
                  size="22px"
                />
                <q-icon v-else-if="entry.status === 'error'" name="error" color="negative" size="22px" />
                <q-icon v-else name="schedule" color="grey" size="22px" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ entry.label }}</q-item-label>
                <q-item-label v-if="entry.status === 'building'" caption class="stage-text">
                  {{ entry.stage || t('buildStepper.buildingGeneric') }}
                </q-item-label>
                <q-linear-progress
                  v-if="entry.status === 'building'"
                  indeterminate
                  color="primary"
                  size="4px"
                  class="stage-progress"
                />
                <q-item-label v-if="entry.status === 'success'" caption class="out-path">
                  {{ entry.outDir }}
                </q-item-label>
                <q-item-label v-else-if="entry.status === 'error'" caption class="error-text">
                  {{ entry.message }}
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>

          <q-stepper-navigation>
            <q-btn
              color="primary"
              no-caps
              :label="t('common.close')"
              :disable="buildRunning"
              @click="close"
            />
          </q-stepper-navigation>
        </q-step>
      </q-stepper>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useStoryStore } from '@/engine/stores/story'
import { useEditorI18n } from '@/editor/i18n'
import { Notify } from 'quasar'

const { t } = useEditorI18n()
const story = useStoryStore()

const isOpen = ref(false)
const step = ref('version')

const bumpType = ref('patch')
const versionOptions = computed(() => [
  { label: t('editorPage.versionNone'), value: 'none' },
  { label: t('editorPage.versionPatch'), value: 'patch' },
  { label: t('editorPage.versionMinor'), value: 'minor' },
  { label: t('editorPage.versionMajor'), value: 'major' },
])
const currentVersion = computed(() => story.project.manifest?.version || '1.0.0')

// Keep ids in sync with ALL_TARGETS in src-electron/ipc/build.js.
const targetIds = ref(['win32-x64'])
const targetOptions = computed(() => [
  { label: t('editorPage.buildTargetWin'), value: 'win32-x64' },
  { label: t('editorPage.buildTargetMacIntel'), value: 'darwin-x64' },
  { label: t('editorPage.buildTargetMacArm'), value: 'darwin-arm64' },
  { label: t('editorPage.buildTargetLinux'), value: 'linux-x64' },
  { label: t('buildStepper.buildTargetAndroid'), value: 'android' },
])

// 'unknown' | 'checking' | 'ready' | 'missing' | 'installing'
const toolchainState = ref('unknown')
const toolchainProgress = ref({ stage: '', percent: 0 })
const androidStageLabels = {
  'jdk-download': 'androidStageJdkDownload',
  'jdk-extract': 'androidStageJdkExtract',
  'sdk-download': 'androidStageSdkDownload',
  'sdk-extract': 'androidStageSdkExtract',
  'sdk-licenses': 'androidStageSdkLicenses',
  'sdk-packages': 'androidStageSdkPackages',
  done: 'androidStageDone',
}
const toolchainStageLabel = computed(() => {
  const key = androidStageLabels[toolchainProgress.value.stage] || toolchainProgress.value.stage
  return t(`editorPage.${key}`, { percent: Math.round(toolchainProgress.value.percent * 100) })
})

async function checkToolchainIfNeeded() {
  if (!targetIds.value.includes('android') || toolchainState.value !== 'unknown') return
  toolchainState.value = 'checking'
  const { jdkOk, sdkOk } = await window.storieAPI.checkAndroidToolchain()
  toolchainState.value = jdkOk && sdkOk ? 'ready' : 'missing'
}

async function installToolchain() {
  toolchainState.value = 'installing'
  toolchainProgress.value = { stage: 'jdk-download', percent: 0 }
  const unsubscribe = window.storieAPI.onAndroidInstallProgress((p) => {
    toolchainProgress.value = p
  })
  try {
    await window.storieAPI.installAndroidToolchain()
    toolchainState.value = 'ready'
  } catch (err) {
    toolchainState.value = 'missing'
    Notify.create({ type: 'negative', message: err.message || String(err), timeout: 8000 })
  } finally {
    unsubscribe()
  }
}

const canStartBuild = computed(() => {
  if (!targetIds.value.length) return false
  if (targetIds.value.includes('android') && toolchainState.value !== 'ready') return false
  return true
})

// { [id]: { label, status: 'pending'|'building'|'success'|'error', outDir?, message? } }
const buildProgress = ref({})
const buildProgressList = computed(() => Object.values(buildProgress.value))
const buildRunning = ref(false)
const buildCancelled = ref(false)

async function startBuild() {
  step.value = 'build'
  buildCancelled.value = false
  buildProgress.value = Object.fromEntries(
    targetOptions.value
      .filter((o) => targetIds.value.includes(o.value))
      .map((o) => [o.value, { label: o.label, status: 'pending' }]),
  )
  buildRunning.value = true

  const unsubscribe = window.storieAPI.onBuildProgress((p) => {
    buildProgress.value = {
      ...buildProgress.value,
      [p.id]: { label: buildProgress.value[p.id]?.label || p.label, ...p },
    }
  })
  try {
    const result = await window.storieAPI.buildAll({
      rootPath: story.project.rootPath,
      bumpType: bumpType.value,
      // Spread — targetIds.value is a Vue-reactive array (q-option-group's
      // v-model), and Electron IPC's structured clone rejects Vue Proxies
      // (same class of bug as GameForm.vue/EditorPage.vue's manifest save,
      // see their own comments). Spreading into a plain array of primitive
      // strings is enough here (no nested objects to deep-clone).
      targetIds: [...targetIds.value],
    })
    if (!result) {
      // Native "choose destination" dialog was cancelled.
      buildCancelled.value = true
      return
    }
    story.project.manifest = result.manifest
  } catch (err) {
    Notify.create({ type: 'negative', message: err.message || String(err), timeout: 8000 })
    buildCancelled.value = true
  } finally {
    unsubscribe()
    buildRunning.value = false
  }
}

function reset() {
  step.value = 'version'
  bumpType.value = 'patch'
  targetIds.value = ['win32-x64']
  toolchainState.value = 'unknown'
  buildProgress.value = {}
  buildCancelled.value = false
}

function open() {
  reset()
  isOpen.value = true
}

function close() {
  isOpen.value = false
}

// android checkbox toggled inside step "distribution" — check the
// toolchain the moment it's ticked, not eagerly on open() (most builds
// never touch Android, no reason to hit disk/IPC for it every time).
watch(targetIds, checkToolchainIfNeeded)

defineExpose({ open })
</script>

<style scoped>
.build-card {
  min-width: 560px;
  max-width: 680px;
  background: var(--color-surface);
  color: var(--color-text);
}

.build-stepper {
  background: transparent;
}

.stepper-nav-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.step-hint {
  color: var(--color-text-muted);
  font-size: var(--text-sm, 13px);
  margin-bottom: var(--space-2);
}

.version-options {
  margin-top: var(--space-2);
}

.android-toolchain-block {
  margin-top: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-surface-hover);
}

.toolchain-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm, 13px);
}

.toolchain-ready {
  color: var(--color-text);
}

.toolchain-install {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.build-progress-list {
  border-radius: var(--radius-md);
  background: var(--color-surface-hover);
}

.stage-text {
  color: var(--color-text-muted);
}

.stage-progress {
  margin-top: var(--space-1);
  max-width: 320px;
}

.out-path {
  font-family: var(--font-mono);
  word-break: break-all;
}

.error-text {
  color: var(--color-negative, #e57373);
  white-space: pre-wrap;
}
</style>
