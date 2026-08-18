<template>
  <q-dialog v-model="isOpen">
    <q-card class="settings-card">
      <div class="settings-header">
        <div class="header-title">
          <q-icon name="settings" size="22px" color="primary" />
          <span class="text-subtitle1">{{ t('editorSettings.title') }}</span>
        </div>
        <q-btn dense flat round icon="close" v-close-popup />
      </div>
      <q-separator />

      <div class="settings-body">
        <div class="panel">
          <div class="section-label">
            <q-icon name="translate" size="16px" />
            {{ t('editorSettings.languageLabel') }}
          </div>
          <EditorLangSwitch />
        </div>

        <div class="panel">
          <div class="section-label">
            <q-icon name="cloud_sync" size="16px" />
            {{ t('editorSettings.autosaveLabel') }}
          </div>
          <q-toggle
            dense
            :model-value="autosave"
            :label="t('editorPage.autosaveLabel')"
            color="primary"
            @update:model-value="(v) => emit('update:autosave', v)"
          />
          <q-separator spaced inset />
          <CloudSyncSettings />
        </div>

        <div class="panel">
          <div class="section-label">
            <q-icon name="folder_open" size="16px" />
            {{ t('editorSettings.projectLabel') }}
          </div>
          <q-btn
            dense
            flat
            no-caps
            icon="folder_open"
            :label="t('editorPage.switchProjectTooltip')"
            :disable="building"
            @click="onSwitchProject"
          />
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup>
// Groups the "set once, rarely touched again" editor preferences that used
// to be scattered as individual topbar items (duplicated once more in the
// compact-mode drawer, see EditorPage.vue's topbarCompact split) — one gear
// button + this dialog replaces that with 1 trigger that doesn't need a
// compact-mode variant at all. Cloud sync configuration (2026-08-18 user
// feedback) lives here too now, under the same Sauvegarde section as local
// autosave — CloudSyncSettings.vue is the former CloudSyncButton.vue dialog
// body, extracted; the toolbar CloudSyncButton is now just a one-click
// "force sync now" icon, see its own comment. Deliberately does NOT include
// restart-preview/validate/build/web preview — those stay frequent-use
// toolbar actions, not settings.
import { ref } from 'vue'
import EditorLangSwitch from './EditorLangSwitch.vue'
import CloudSyncSettings from './CloudSyncSettings.vue'
import { useEditorI18n } from '@/editor/i18n'

defineProps({
  autosave: { type: Boolean, required: true },
  building: { type: Boolean, default: false },
})
const emit = defineEmits(['update:autosave', 'switch-project'])

const { t } = useEditorI18n()
const isOpen = ref(false)

function onSwitchProject() {
  isOpen.value = false
  emit('switch-project')
}

defineExpose({ open: () => (isOpen.value = true) })
</script>

<style scoped>
.settings-card {
  width: 480px;
  max-width: 92vw;
}
.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
}
.header-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.settings-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  max-height: 70vh;
  overflow-y: auto;
}
.panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
}
.section-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-accent);
  font-weight: 600;
}
</style>
