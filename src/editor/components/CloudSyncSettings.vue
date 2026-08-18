<template>
  <div class="cloud-body">
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
      <q-linear-progress :value="cloud.installProgress.value.percent" color="primary" size="8px" rounded />
      <div class="status-row">
        <span>{{ installStageLabel }}</span>
      </div>
    </div>

    <template v-else>
      <CloudProviderConnect />

      <div v-if="cloud.remotes.value.length" class="remote-list">
        <div
          v-for="name in cloud.remotes.value"
          :key="name"
          class="remote-row"
          :class="{ active: name === cloud.selectedRemote.value }"
          @click="cloud.selectRemote(name)"
        >
          <q-icon name="cloud_done" size="16px" />
          <span class="remote-name">{{ name }}</span>
          <q-btn
            dense
            flat
            round
            icon="link_off"
            size="sm"
            color="negative"
            @click.stop="confirmDisconnect(name)"
          >
            <q-tooltip>{{ t('cloudSyncPanel.disconnectTooltip') }}</q-tooltip>
          </q-btn>
        </div>
      </div>

      <div v-if="!cloud.selectedRemote.value" class="status-row muted">
        <q-icon name="info" size="16px" />
        <span>{{ t('cloudSyncPanel.noRemote') }}</span>
      </div>

      <template v-else>
        <q-input
          dense
          outlined
          :model-value="cloud.remotePath.value"
          :label="t('cloudSyncPanel.remotePathLabel')"
          @update:model-value="cloud.setRemotePath"
        />

        <div class="status-row muted">
          <q-icon name="history" size="16px" />
          <span>{{ syncStateLabel }}</span>
        </div>

        <q-toggle
          dense
          :model-value="cloud.autoSyncEnabled.value"
          :label="t('cloudSyncPanel.autoSyncLabel')"
          color="primary"
          @update:model-value="cloud.setAutoSyncEnabled"
        />

        <div class="sync-actions">
          <q-btn
            color="primary"
            no-caps
            dense
            icon="cloud_upload"
            :loading="cloud.syncing.value === 'push'"
            :disable="!!cloud.syncing.value"
            :label="t('cloudSyncPanel.pushBtn')"
            @click="cloud.runSync('push')"
          />
          <q-btn
            outline
            no-caps
            dense
            icon="cloud_download"
            :loading="cloud.syncing.value === 'pull'"
            :disable="!!cloud.syncing.value"
            :label="t('cloudSyncPanel.pullBtn')"
            @click="confirmPull"
          />
        </div>

        <div v-if="cloud.syncing.value" class="install-block">
          <q-linear-progress indeterminate color="primary" size="4px" rounded />
          <div class="status-row">
            <span>{{
              cloud.syncing.value === 'push'
                ? t('cloudSyncPanel.syncingPush')
                : t('cloudSyncPanel.syncingPull')
            }}</span>
          </div>
          <div v-if="cloud.jobProgress.value" class="status-row muted">
            <span>{{
              t('cloudSyncPanel.filesTransferred', {
                done: cloud.jobProgress.value.transfers || 0,
                total: cloud.jobProgress.value.totalTransfers || 0,
              })
            }}</span>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
// Body-only extraction of what used to be CloudSyncButton.vue's own dialog
// content — that component is now just a toolbar "force sync now" icon
// (see its own comment), the full connect/configure/push/pull panel lives
// here instead, embedded inside EditorSettingsDialog.vue's Sauvegarde
// section. useCloudSync() is a module-level singleton (see that file's own
// comment), so this and the toolbar button both read/drive the exact same
// live state — no duplication, just two different views into it.
import { computed, onMounted } from 'vue'
import { Dialog, Notify } from 'quasar'
import { useEditorI18n } from '@/editor/i18n'
import { useCloudSync } from '@/editor/composables/useCloudSync'
import CloudProviderConnect from '@/editor/components/CloudProviderConnect.vue'

const { t } = useEditorI18n()
const cloud = useCloudSync()

onMounted(() => {
  if (cloud.rcloneInstalled.value === null) cloud.checkRclone()
  cloud.loadSyncState()
})

const syncStateLabel = computed(() => {
  const state = cloud.syncState.value
  if (!state?.lastSyncedAt) return t('cloudSyncPanel.neverSynced')
  return t('cloudSyncPanel.lastSyncedAt', {
    date: new Date(state.lastSyncedAt).toLocaleString(),
    device: state.device || '?',
  })
})

const INSTALL_STAGE_KEYS = {
  'rclone-download': 'cloudSyncPanel.installStageDownload',
  'rclone-extract': 'cloudSyncPanel.installStageExtract',
}
const installStageLabel = computed(() => {
  const key = INSTALL_STAGE_KEYS[cloud.installProgress.value.stage]
  return key ? t(key) : t('cloudSyncPanel.installing')
})

// Two cascading dialogs (2026-08-17 user feedback) — confirm the
// disconnect itself first, THEN — only if confirmed — ask separately
// whether data already pushed to that account should also be deleted or
// left in place. Disconnecting never deletes anything remote by default.
function confirmDisconnect(name) {
  Dialog.create({
    title: t('cloudSyncPanel.disconnectConfirmTitle', { name }),
    message: t('cloudSyncPanel.disconnectConfirmBody'),
    cancel: true,
    persistent: true,
    color: 'negative',
  }).onOk(() => {
    Dialog.create({
      title: t('cloudSyncPanel.purgeConfirmTitle'),
      message: t('cloudSyncPanel.purgeConfirmBody', { path: cloud.remotePath.value }),
      ok: t('cloudSyncPanel.purgeDelete'),
      cancel: t('cloudSyncPanel.purgeKeep'),
      persistent: true,
      color: 'negative',
    })
      .onOk(() => finishDisconnect(name, true))
      .onCancel(() => finishDisconnect(name, false))
  })
}

async function finishDisconnect(name, purge) {
  try {
    if (purge) await cloud.purgeRemotePath()
    await cloud.disconnectRemote(name)
    Notify.create({ type: 'positive', message: t('cloudSyncPanel.remoteDisconnected') })
  } catch (err) {
    Notify.create({ type: 'negative', message: err.message || String(err) })
  }
}

function confirmPull() {
  Dialog.create({
    title: t('cloudSyncPanel.pullConfirmTitle'),
    message: t('cloudSyncPanel.pullConfirmBody'),
    cancel: true,
    persistent: true,
    color: 'negative',
  }).onOk(() => cloud.runSync('pull'))
}
</script>

<style scoped>
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

.remote-row.active {
  border-color: var(--color-accent);
  background: var(--color-bg);
}

.remote-name {
  flex: 1;
  min-width: 0;
  font-size: var(--text-sm);
  font-weight: 600;
}

.sync-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
</style>
