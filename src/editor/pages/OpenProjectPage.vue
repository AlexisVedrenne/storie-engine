<template>
  <q-page class="open-project-page flex flex-center">
    <div class="panel">
      <q-icon name="auto_stories" size="40px" class="brand-icon" />
      <h1 class="title">Storie Engine</h1>
      <p class="subtitle">Éditeur du moteur narratif</p>

      <q-banner v-if="!hasStorieApi" class="bg-negative text-white banner">
        window.storieAPI est indisponible — lance l'app en mode Electron
        (<code>pnpm run dev:electron</code>), pas dans un simple navigateur.
      </q-banner>

      <q-banner v-if="error" class="bg-negative text-white banner">
        {{ error }}
      </q-banner>

      <q-btn
        unelevated
        no-caps
        color="primary"
        :loading="loading"
        :disable="!hasStorieApi"
        label="Ouvrir un projet"
        icon="folder_open"
        @click="openProject"
      />
    </div>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useStoryStore } from '@/engine/stores/story'

const router = useRouter()
const story = useStoryStore()
const loading = ref(false)
const error = ref('')

const hasStorieApi = typeof window !== 'undefined' && !!window.storieAPI

async function openProject() {
  error.value = ''
  loading.value = true
  try {
    const folder = await window.storieAPI.selectProjectFolder()
    if (!folder) return
    const data = await window.storieAPI.loadProject(folder)
    // synchronous, before navigation — same ordering guarantee as NTR's
    // story.init() before mounting PhoneShell (see docs/editor-plan-phase1.md).
    story.loadProject(data)
    router.push({ name: 'editor' })
  } catch (err) {
    console.error('[storie-engine] failed to load project', err)
    error.value = `Échec du chargement du projet : ${err.message || err}`
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.open-project-page {
  height: 100vh;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-ui);
}

.panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  max-width: 480px;
  text-align: center;
  padding: var(--space-6);
}

.brand-icon {
  color: var(--color-accent);
}

.title {
  font-size: 28px;
  font-weight: 700;
  margin: 0;
}

.subtitle {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--text-base);
}

.banner {
  border-radius: var(--radius-md);
}
</style>
