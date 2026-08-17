<template>
  <q-btn
    outline
    no-caps
    color="primary"
    icon="cloud_download"
    :label="t('cloudSyncPanel.loadFromCloudBtn')"
    @click="open"
  />

  <q-dialog v-model="dialogOpen">
    <q-card class="cloud-load-card">
      <q-card-section>
        <div class="text-subtitle1">{{ t('cloudSyncPanel.loadDialogTitle') }}</div>
      </q-card-section>

      <q-card-section class="cloud-body">
        <div v-if="cloud.rcloneInstalled.value === null" class="status-row">
          <q-spinner size="18px" color="primary" />
          <span>{{ t('cloudSyncPanel.checking') }}</span>
        </div>

        <div v-else-if="!cloud.rcloneInstalled.value && !cloud.installing.value" class="status-row">
          <q-icon name="cloud_off" color="warning" size="18px" />
          <span>{{ t('cloudSyncPanel.notInstalled') }}</span>
          <q-btn
            outline
            no-caps
            dense
            color="primary"
            :label="t('cloudSyncPanel.installBtn')"
            @click="cloud.doInstallRclone"
          />
        </div>

        <div v-else-if="cloud.installing.value" class="install-block">
          <q-linear-progress
            :value="cloud.installProgress.value.percent"
            color="primary"
            size="8px"
            rounded
          />
          <div class="status-row">
            <span>{{ installStageLabel }}</span>
          </div>
        </div>

        <div v-else-if="downloading" class="install-block">
          <q-linear-progress indeterminate color="primary" size="4px" rounded />
          <div class="status-row">
            <span>{{ t('cloudSyncPanel.downloadingProject') }}</span>
          </div>
          <div v-if="downloadProgress" class="status-row muted">
            <span>{{
              t('cloudSyncPanel.filesTransferred', {
                done: downloadProgress.transfers || 0,
                total: downloadProgress.totalTransfers || 0,
              })
            }}</span>
          </div>
        </div>

        <!-- Étape 2 : projets trouvés dans le remote choisi -->
        <template v-else-if="pickedRemote">
          <div class="status-row">
            <q-btn dense flat round icon="arrow_back" size="sm" @click="backToRemotes" />
            <q-icon name="cloud_done" size="16px" />
            <span class="remote-name">{{ pickedRemote }}</span>
          </div>

          <div v-if="loadingProjects" class="status-row">
            <q-spinner size="16px" color="primary" />
            <span>{{ t('cloudSyncPanel.loadingRemoteProjects') }}</span>
          </div>

          <div v-else-if="!remoteProjects.length" class="status-row muted">
            <q-icon name="info" size="16px" />
            <span>{{ t('cloudSyncPanel.noRemoteProjects') }}</span>
          </div>

          <div v-else class="remote-list">
            <div
              v-for="name in remoteProjects"
              :key="name"
              class="remote-row"
              @click="loadCloudProject(name)"
            >
              <q-icon name="auto_stories" size="16px" />
              <span class="remote-name">{{ name }}</span>
            </div>
          </div>
        </template>

        <!-- Étape 1 : choisir ou connecter un compte -->
        <template v-else>
          <div class="status-row muted">
            <q-icon name="info" size="16px" />
            <span>{{ t('cloudSyncPanel.pickRemoteHint') }}</span>
          </div>

          <div v-if="cloud.remotes.value.length" class="remote-list">
            <div
              v-for="name in cloud.remotes.value"
              :key="name"
              class="remote-row"
              @click="pickRemote(name)"
            >
              <q-icon name="cloud_done" size="16px" />
              <span class="remote-name">{{ name }}</span>
            </div>
          </div>

          <CloudProviderConnect skip-select @connected="pickRemote" />
        </template>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat no-caps :label="t('common.close')" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { Notify } from 'quasar'
import { useEditorI18n } from '@/editor/i18n'
import { useCloudSync } from '@/editor/composables/useCloudSync'
import CloudProviderConnect from '@/editor/components/CloudProviderConnect.vue'

// Emits (rootPath, data) — same shape OpenProjectPage.vue's own
// openProject()/createProject() already produce from window.storieAPI —
// the parent page does the actual enterProject() navigation, this
// component stays decoupled from router/story specifics.
const emit = defineEmits(['loaded'])

const { t } = useEditorI18n()
const cloud = useCloudSync()

const dialogOpen = ref(false)
const pickedRemote = ref('')
const remoteProjects = ref([])
const loadingProjects = ref(false)
const downloading = ref(false)
const downloadProgress = ref(null)

const INSTALL_STAGE_KEYS = {
  'rclone-download': 'cloudSyncPanel.installStageDownload',
  'rclone-extract': 'cloudSyncPanel.installStageExtract',
}
const installStageLabel = computed(() => {
  const key = INSTALL_STAGE_KEYS[cloud.installProgress.value.stage]
  return key ? t(key) : t('cloudSyncPanel.installing')
})

function open() {
  dialogOpen.value = true
  pickedRemote.value = ''
  remoteProjects.value = []
  downloading.value = false
  downloadProgress.value = null
  if (cloud.rcloneInstalled.value === null) cloud.checkRclone()
  else if (cloud.rcloneInstalled.value) cloud.loadRemotes()
}

async function pickRemote(name) {
  pickedRemote.value = name
  loadingProjects.value = true
  remoteProjects.value = []
  try {
    remoteProjects.value = await cloud.listRemoteProjects(name)
  } catch (err) {
    Notify.create({ type: 'negative', message: err.message || String(err) })
  } finally {
    loadingProjects.value = false
  }
}

function backToRemotes() {
  pickedRemote.value = ''
  remoteProjects.value = []
}

// Racine conventionnelle des projets poussés — doit rester cohérente avec
// PROJECTS_ROOT dans cloudSync.js et le remotePath par défaut de
// useCloudSync.js.
const PROJECTS_ROOT = 'stories-engine'

let downloadTimer = null
function pollDownload(jobid) {
  return new Promise((resolve, reject) => {
    downloadTimer = setInterval(async () => {
      try {
        const { status, stats } = await window.storieAPI.cloud.jobStatus({ jobid })
        downloadProgress.value = stats
        if (status.finished) {
          clearInterval(downloadTimer)
          downloadTimer = null
          if (status.success) resolve()
          else reject(new Error(status.error || t('cloudSyncPanel.syncError')))
        }
      } catch (err) {
        clearInterval(downloadTimer)
        downloadTimer = null
        reject(err)
      }
    }, 700)
  })
}

// Choisir un dossier parent local (même dialogue que "Nouveau projet" — pas
// d'emplacement par défaut imposé), réserver un dossier collision-checked
// dedans, pull, puis charger + ouvrir comme un projet normal.
async function loadCloudProject(name) {
  downloading.value = true
  downloadProgress.value = null
  try {
    const parentPath = await window.storieAPI.selectNewProjectLocation()
    if (!parentPath) return
    const rootPath = await window.storieAPI.reserveNewFolder({ parentPath, name })
    const remotePath = `${PROJECTS_ROOT}/${name}`
    const res = await window.storieAPI.cloud.pull({
      rootPath,
      remote: pickedRemote.value,
      remotePath,
    })
    await pollDownload(res.jobid)

    const data = await window.storieAPI.loadProject(rootPath)
    data.manifest = data.manifest || {}
    data.manifest.cloudSync = { remote: pickedRemote.value, remotePath }
    await window.storieAPI.saveManifest({ rootPath, manifest: data.manifest })

    dialogOpen.value = false
    emit('loaded', rootPath, data)
  } catch (err) {
    Notify.create({ type: 'negative', message: err.message || String(err) })
  } finally {
    downloading.value = false
  }
}

onBeforeUnmount(() => {
  if (downloadTimer) clearInterval(downloadTimer)
})
</script>

<style scoped>
.cloud-load-card {
  min-width: 380px;
  max-width: 90vw;
}

.cloud-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.status-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
}

.status-row.muted {
  color: var(--color-text-muted);
}

.install-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.remote-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.remote-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
}

.remote-name {
  flex: 1;
  min-width: 0;
  font-size: var(--text-sm);
  font-weight: 600;
}
</style>
