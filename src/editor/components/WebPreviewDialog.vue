<template>
  <q-dialog v-model="isOpen" persistent no-esc-dismiss no-backdrop-dismiss>
    <q-card class="preview-card">
      <q-card-section v-if="state === 'loading'" class="state-block">
        <q-spinner size="42px" color="primary" />
        <div class="state-title">{{ t('webPreviewDialog.loading') }}</div>
      </q-card-section>

      <q-card-section v-else-if="state === 'ready'" class="state-block">
        <q-icon name="smartphone" size="34px" color="primary" />
        <div class="state-title">{{ t('webPreviewDialog.readyTitle') }}</div>
        <div class="state-hint">{{ t('webPreviewDialog.readyHint') }}</div>
        <div class="url-box">{{ url }}</div>
        <div class="firewall-hint">
          <q-icon name="info" size="14px" />
          {{ t('webPreviewDialog.firewallHint') }}
        </div>
      </q-card-section>

      <q-card-section v-else class="state-block">
        <q-icon name="error" size="34px" color="negative" />
        <div class="state-title">{{ t('webPreviewDialog.errorTitle') }}</div>
        <pre class="error-output">{{ errorMessage }}</pre>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat no-caps color="negative" :label="t('webPreviewDialog.stop')" @click="stop" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { useEditorI18n } from '@/editor/i18n'

const { t } = useEditorI18n()
const props = defineProps({ rootPath: { type: String, required: true } })

const isOpen = ref(false)
const state = ref('loading') // 'loading' | 'ready' | 'error'
const url = ref('')
const errorMessage = ref('')

// Only entry point — EditorPage.vue's toolbar button calls this. Every
// exit (Stop button, or an error) goes back through window.storieAPI so
// the main process never keeps a server running with no dialog left
// pointing at it.
async function open() {
  isOpen.value = true
  state.value = 'loading'
  url.value = ''
  errorMessage.value = ''
  try {
    const result = await window.storieAPI.startWebPreview({ rootPath: props.rootPath })
    // The dialog may have already been stopped (Stop clicked mid-loading)
    // by the time this resolves — don't resurrect it as "ready".
    if (!isOpen.value) return
    url.value = result.url
    state.value = 'ready'
  } catch (err) {
    if (!isOpen.value) return
    errorMessage.value = err.message || String(err)
    state.value = 'error'
  }
}

async function stop() {
  isOpen.value = false
  try {
    await window.storieAPI.stopWebPreview()
  } catch {
    // best-effort — dialog closes regardless, see stopWebPreviewOnQuit's
    // own comment for the "orphaned process" case this can't fully cover
  }
}

defineExpose({ open })
</script>

<style scoped>
.preview-card {
  min-width: 380px;
  background: var(--color-surface);
  color: var(--color-text);
}

.state-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-2);
  padding: var(--space-6) var(--space-4);
}

.state-title {
  font-size: var(--text-lg);
  font-weight: 700;
}

.state-hint {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.url-box {
  margin-top: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-accent-tint);
  color: var(--color-accent);
  font-family: var(--font-mono);
  font-size: var(--text-lg);
  font-weight: 700;
  user-select: all;
}

.error-output {
  margin: var(--space-2) 0 0;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-surface-hover);
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-align: left;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 240px;
  overflow-y: auto;
  width: 100%;
  max-width: 360px;
}

.firewall-hint {
  margin-top: var(--space-2);
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  max-width: 320px;
}
</style>
