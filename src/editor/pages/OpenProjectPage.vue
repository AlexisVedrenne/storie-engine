<template>
  <q-page class="open-project-page flex flex-center">
    <div v-if="reopening" class="panel">
      <q-spinner color="primary" size="32px" />
      <p class="subtitle">Réouverture du dernier projet…</p>
    </div>

    <div v-else class="panel">
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

      <div class="actions">
        <q-btn
          unelevated
          no-caps
          color="primary"
          :loading="loading === 'open'"
          :disable="!hasStorieApi || !!loading"
          label="Ouvrir un projet"
          icon="folder_open"
          @click="openProject"
        />
        <q-btn
          outline
          no-caps
          color="primary"
          :loading="loading === 'create'"
          :disable="!hasStorieApi || !!loading"
          label="Nouveau projet"
          icon="add"
          @click="newProjectDialog = true"
        />
      </div>
    </div>

    <q-dialog v-model="newProjectDialog">
      <q-card class="new-project-card">
        <q-card-section>
          <div class="text-subtitle1">Nouveau projet</div>
          <q-input dense outlined ref="newNameInputRef" autofocus label="Nom du projet" v-model="newName" class="q-mt-sm" @keyup.enter="createProject">
            <template #append>
              <EmojiPickerBtn @pick="(e) => (newName = insertEmojiAtCaret(newNameInputRef, newName, e))" />
            </template>
          </q-input>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn flat label="Créer" color="primary" :disable="!newName.trim()" @click="createProject" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useStoryStore } from '@/engine/stores/story'
import EmojiPickerBtn from '@/components/shared/EmojiPickerBtn.vue'
import { insertEmojiAtCaret } from '@/components/shared/emojiInsert'

// Shared with EditorPage.vue's "Changer de projet" (clears this key) — a
// deliberate exit shouldn't be silently undone by auto-reopening the same
// project on the next launch.
const LAST_PROJECT_KEY = 'storie-engine-last-project'

const router = useRouter()
const story = useStoryStore()
const loading = ref('') // '' | 'open' | 'create'
const error = ref('')
const reopening = ref(false)
const newProjectDialog = ref(false)
const newName = ref('')
const newNameInputRef = ref(null)

const hasStorieApi = typeof window !== 'undefined' && !!window.storieAPI

async function enterProject(rootPath, data) {
  localStorage.setItem(LAST_PROJECT_KEY, rootPath)
  // synchronous, before navigation — same ordering guarantee as NTR's
  // story.init() before mounting PhoneShell (see docs/editor-plan-phase1.md).
  story.loadProject(data)
  router.push({ name: 'editor' })
}

onMounted(async () => {
  if (!hasStorieApi) return
  const last = localStorage.getItem(LAST_PROJECT_KEY)
  if (!last) return
  reopening.value = true
  try {
    const data = await window.storieAPI.loadProject(last)
    await enterProject(last, data)
  } catch (err) {
    console.warn('[storie-engine] failed to reopen last project', err)
    localStorage.removeItem(LAST_PROJECT_KEY)
  } finally {
    reopening.value = false
  }
})

async function openProject() {
  error.value = ''
  loading.value = 'open'
  try {
    const folder = await window.storieAPI.selectProjectFolder()
    if (!folder) return
    const data = await window.storieAPI.loadProject(folder)
    await enterProject(folder, data)
  } catch (err) {
    console.error('[storie-engine] failed to load project', err)
    error.value = `Échec du chargement du projet : ${err.message || err}`
  } finally {
    loading.value = ''
  }
}

async function createProject() {
  const name = newName.value.trim()
  if (!name) return
  error.value = ''
  loading.value = 'create'
  try {
    const parentPath = await window.storieAPI.selectNewProjectLocation()
    if (!parentPath) return
    const rootPath = await window.storieAPI.createProject({ parentPath, name })
    const data = await window.storieAPI.loadProject(rootPath)
    await enterProject(rootPath, data)
  } catch (err) {
    console.error('[storie-engine] failed to create project', err)
    error.value = `Échec de la création du projet : ${err.message || err}`
  } finally {
    loading.value = ''
    newName.value = ''
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

.actions {
  display: flex;
  gap: var(--space-3);
}

.new-project-card {
  min-width: 320px;
  background: var(--color-surface);
  color: var(--color-text);
}
</style>
