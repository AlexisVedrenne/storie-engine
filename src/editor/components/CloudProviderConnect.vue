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

          <!-- Un provider OAuth (Drive/OneDrive/Dropbox/...) choisi ICI
               plutôt que via son bouton rapide a 0 option requise — rclone
               gère l'auth lui-même — donc ce bloc reste vide et le
               formulaire est aussi simple que le bouton rapide (retour
               utilisateur : avant ce fix, TOUTES les options du schéma
               s'affichaient sans distinction requis/optionnel). -->
          <div v-for="opt in requiredOptions" :key="opt.Name" class="option-field">
            <q-toggle
              v-if="opt.Type === 'bool'"
              dense
              :model-value="!!advancedOptions[opt.Name]"
              :label="opt.Name"
              color="primary"
              @update:model-value="(v) => (advancedOptions[opt.Name] = v)"
            />
            <q-input v-else dense outlined :label="opt.Name" v-model="advancedOptions[opt.Name]" />
            <!-- Aide rclone en bloc à part, pas le :hint de Quasar — ce
                 slot est prévu pour une ligne courte ; en mode dense un
                 paragraphe entier (fréquent chez rclone) déborde
                 visuellement sur le champ suivant au lieu de rester
                 contenu dans sa propre hauteur. -->
            <p v-if="opt.Help" class="option-help">{{ opt.Help }}</p>
          </div>

          <q-expansion-item
            v-if="optionalOptions.length"
            dense
            :label="t('cloudSyncPanel.advancedMoreOptions', { count: optionalOptions.length })"
            class="optional-options"
          >
            <div v-for="opt in optionalOptions" :key="opt.Name" class="option-field">
              <q-toggle
                v-if="opt.Type === 'bool'"
                dense
                :model-value="!!advancedOptions[opt.Name]"
                :label="opt.Name"
                color="primary"
                @update:model-value="(v) => (advancedOptions[opt.Name] = v)"
              />
              <q-input v-else dense outlined :label="opt.Name" v-model="advancedOptions[opt.Name]" />
              <p v-if="opt.Help" class="option-help">{{ opt.Help }}</p>
            </div>
          </q-expansion-item>
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
// `Required` per rclone's own option schema (config/providers) — not
// verified against a live rclone response in this environment (same
// caveat as everywhere else cloud-sync touches a real remote, see
// docs/cloud-sync-rclone-plan.md), but it's a stable, documented part of
// rclone's option struct. An OAuth-capable provider (Drive/OneDrive/
// Dropbox/...) has zero required options — rclone's own browser-based auth
// fills in the token — so requiredOptions is empty for those regardless of
// how many optional/advanced knobs the provider exposes.
const requiredOptions = computed(() => providerOptions.value.filter((o) => o.Required))
const optionalOptions = computed(() => providerOptions.value.filter((o) => !o.Required))

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
  width: 520px;
  max-width: 90vw;
}

.advanced-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-height: 70vh;
  overflow-y: auto;
}

/* Many rclone providers (especially local filesystem) expose 20+ advanced
   options, most with a full sentence of help text — a border between each
   makes it scannable instead of one continuous wall, and the field/help
   pair sits in its own flex column so long help text never overlaps the
   next option (the bug this whole block replaced). */
.option-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--color-border);
}
.option-field:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.option-help {
  margin: 0;
  font-size: var(--text-xs);
  line-height: 1.5;
  color: var(--color-text-muted);
  white-space: normal;
}

.optional-options {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.optional-options :deep(.q-item) {
  padding: var(--space-2) var(--space-3);
}
.optional-options .option-field {
  padding: 0 var(--space-3) var(--space-3);
}
.optional-options .option-field:last-child {
  padding-bottom: var(--space-3);
}
</style>
