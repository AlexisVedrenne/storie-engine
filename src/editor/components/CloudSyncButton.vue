<template>
  <q-btn
    dense
    flat
    round
    :icon="statusIcon"
    :color="statusColor"
    class="btn-ghost"
    :disable="cloud.status.value !== 'ready'"
    :loading="cloud.syncing.value === 'push'"
    @click="cloud.runSync('push')"
  >
    <q-tooltip>{{ statusTooltip }}</q-tooltip>
  </q-btn>
</template>

<script setup>
// Toolbar footprint reduced to "just force a push now" (2026-08-18 user
// feedback) — connecting an account, auto-sync, pull, and everything else
// now lives in EditorSettingsDialog's Sauvegarde section (see
// CloudSyncSettings.vue, the extracted former dialog body). This button
// stays a plain icon: disabled with an explanatory tooltip until a remote
// is actually connected there, otherwise a one-click push, reusing the
// exact same push path (cloud.runSync('push')) CloudSyncSettings.vue's own
// button calls — one code path, not two.
//
// Still the component that owns the background auto-sync timer's
// lifecycle: unlike the settings dialog (unmounted while closed, per
// QDialog's default lazy rendering), this button stays mounted for as
// long as a project is open in EditorPage.vue, same as before.
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useEditorI18n } from '@/editor/i18n'
import { useCloudSync } from '@/editor/composables/useCloudSync'

const { t } = useEditorI18n()
const cloud = useCloudSync()

const STATUS_ICON = {
  checking: 'cloud',
  installing: 'cloud_sync',
  'not-installed': 'cloud_off',
  syncing: 'cloud_sync',
  'not-connected': 'cloud_queue',
  ready: 'cloud_done',
}
const STATUS_COLOR = {
  checking: 'grey',
  installing: 'primary',
  'not-installed': 'grey',
  syncing: 'primary',
  'not-connected': 'grey',
  ready: 'positive',
}
const STATUS_TOOLTIP_KEY = {
  checking: 'cloudSyncPanel.checking',
  installing: 'cloudSyncPanel.installing',
  'not-installed': 'cloudSyncPanel.configureInSettings',
  syncing: 'cloudSyncPanel.syncingPush',
  'not-connected': 'cloudSyncPanel.configureInSettings',
  ready: 'cloudSyncPanel.forceSyncTooltip',
}
const statusIcon = computed(() => STATUS_ICON[cloud.status.value])
const statusColor = computed(() => STATUS_COLOR[cloud.status.value])
const statusTooltip = computed(() => t(STATUS_TOOLTIP_KEY[cloud.status.value]))

// Timer vit tant que ce bouton est monté — c-à-d tant qu'un projet est
// ouvert — pas tant qu'un dialogue est ouvert (il n'y en a plus ici).
// Reprend la préférence persistée (localStorage) d'une session précédente.
onMounted(() => {
  if (cloud.autoSyncEnabled.value) cloud.startAutoSync()
})

onBeforeUnmount(() => {
  cloud.stopPolling()
  cloud.stopAutoSync()
})
</script>
