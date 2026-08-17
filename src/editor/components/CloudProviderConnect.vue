<template>
  <!-- Un seul compte cloud à la fois (retour utilisateur) — déconnecter
       celui déjà présent est le seul moyen d'en changer, voir
       CloudSyncButton.vue confirmDisconnect. -->
  <div v-if="cloud.atConnectionLimit.value" class="status-row muted">
    <q-icon name="info" size="16px" />
    <span>{{ t('cloudSyncPanel.oneAccountLimit') }}</span>
  </div>

  <div v-else class="connect-row">
    <span class="section-label">{{ t('cloudSyncPanel.connectTitle') }}</span>
    <div class="connect-buttons">
      <q-btn
        outline
        no-caps
        dense
        icon="add"
        :loading="cloud.connecting.value === 'gdrive'"
        :label="t('cloudSyncPanel.connectGdrive')"
        @click="connectQuick('gdrive')"
      />
      <q-btn
        outline
        no-caps
        dense
        icon="add"
        :loading="cloud.connecting.value === 'onedrive'"
        :label="t('cloudSyncPanel.connectOnedrive')"
        @click="connectQuick('onedrive')"
      />
      <q-btn
        outline
        no-caps
        dense
        icon="add"
        :loading="cloud.connecting.value === 'dropbox'"
        :label="t('cloudSyncPanel.connectDropbox')"
        @click="connectQuick('dropbox')"
      />
    </div>
    <q-btn
      flat
      no-caps
      dense
      size="sm"
      color="primary"
      :label="t('cloudSyncPanel.advancedLink')"
      @click="openAdvanced"
    />
  </div>

  <q-dialog v-model="advancedOpen">
    <q-card class="advanced-card">
      <q-card-section>
        <div class="text-subtitle1">{{ t('cloudSyncPanel.advancedDialogTitle') }}</div>
      </q-card-section>
      <q-card-section class="advanced-body">
        <q-select
          dense
          outlined
          use-input
          :label="t('cloudSyncPanel.advancedSearchLabel')"
          :options="filteredProviders"
          option-label="providerLabel"
          v-model="selectedProvider"
          @filter="filterProviders"
          @update:model-value="onSelectProvider"
        />

        <template v-if="selectedProvider">
          <q-input
            dense
            outlined
            :label="t('cloudSyncPanel.advancedNameLabel')"
            v-model="advancedName"
          />
          <q-input
            v-for="opt in providerOptions"
            :key="opt.Name"
            dense
            outlined
            :label="opt.Name"
            :hint="opt.Help"
            v-model="advancedOptions[opt.Name]"
          />
        </template>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat :label="t('common.cancel')" v-close-popup />
        <q-btn
          flat
          color="primary"
          :label="t('cloudSyncPanel.advancedConnectBtn')"
          :disable="!selectedProvider || !advancedName"
          :loading="cloud.connecting.value === 'advanced'"
          @click="connectAdvanced"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useEditorI18n } from '@/editor/i18n'
import { useCloudSync } from '@/editor/composables/useCloudSync'

// Shared between CloudSyncButton.vue (a project is already open —
// connecting a remote also selects it onto that project's
// manifest.cloudSync) and CloudLoadButton.vue (OpenProjectPage.vue, no
// project open yet — `skipSelect` keeps `connect()` from touching
// story.project, which is null there).
const props = defineProps({ skipSelect: { type: Boolean, default: false } })
const emit = defineEmits(['connected'])

const { t } = useEditorI18n()
const cloud = useCloudSync()

async function connectQuick(providerKey) {
  const name = cloud.uniqueRemoteName(providerKey)
  const ok = await cloud.connect({
    connectingKey: providerKey,
    name,
    providerKey,
    skipSelect: props.skipSelect,
  })
  if (ok) emit('connected', name)
}

// Mode avancé — catalogue des 70+ providers rclone, chargé seulement à
// l'ouverture du dialogue.
const advancedOpen = ref(false)
const providers = ref([])
const filteredProviders = ref([])
const selectedProvider = ref(null)
const advancedName = ref('')
const advancedOptions = reactive({})

async function openAdvanced() {
  advancedOpen.value = true
  selectedProvider.value = null
  advancedName.value = ''
  if (!providers.value.length) {
    const raw = await window.storieAPI.cloud.listProviders()
    providers.value = raw.map((p) => ({
      ...p,
      providerLabel: `${p.Description || p.Name} (${p.Name})`,
    }))
  }
  filteredProviders.value = providers.value
}

function filterProviders(val, update) {
  update(() => {
    const needle = val.toLowerCase()
    filteredProviders.value = providers.value.filter((p) =>
      p.providerLabel.toLowerCase().includes(needle),
    )
  })
}

const providerOptions = computed(() => selectedProvider.value?.Options || [])

function onSelectProvider(provider) {
  for (const key of Object.keys(advancedOptions)) delete advancedOptions[key]
  for (const opt of provider?.Options || []) {
    advancedOptions[opt.Name] = opt.Default ?? ''
  }
  advancedName.value = cloud.uniqueRemoteName(String(provider?.Name || '').toLowerCase())
}

async function connectAdvanced() {
  const ok = await cloud.connect({
    connectingKey: 'advanced',
    name: advancedName.value,
    type: selectedProvider.value.Name,
    options: { ...advancedOptions },
    skipSelect: props.skipSelect,
  })
  if (ok) {
    advancedOpen.value = false
    emit('connected', advancedName.value)
  }
}

defineExpose({ closeAdvanced: () => (advancedOpen.value = false) })
</script>

<style scoped>
.status-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
}

.status-row.muted {
  color: var(--color-text-muted);
}

.connect-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.connect-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.section-label {
  font-size: var(--text-sm);
  font-weight: 600;
}

.advanced-card {
  min-width: 420px;
  max-width: 90vw;
}

.advanced-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
</style>
