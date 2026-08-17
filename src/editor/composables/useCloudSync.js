// Shared cloud-sync state (see docs/cloud-sync-rclone-plan.md) — module-level
// refs, not per-call state, same shape as useAssetLibrary.js. Both the
// toolbar status button (CloudSyncButton.vue) and the management dialog it
// opens need to see the exact same live state (installed/connected/syncing)
// without prop-drilling through EditorPage.vue, and either could trigger a
// refresh the other must reflect.
import { computed, ref } from 'vue'
import { Notify } from 'quasar'
import { useStoryStore } from '@/engine/stores/story'
import { useEditorI18n } from '@/editor/i18n'

const rcloneInstalled = ref(null) // null = not checked yet
const installing = ref(false)
const installProgress = ref({ stage: '', percent: 0 })
const remotes = ref([])
const connecting = ref(null) // providerKey | 'advanced' | null
const syncing = ref(null) // 'push' | 'pull' | null
const jobProgress = ref(null)
// { lastSyncedAt, device } read from the project's own cloudsync.json (see
// cloudSync.js) — travels WITH the pushed/pulled content, not a
// this-machine-only note, so it reflects the real last-sync state even for
// a project just pulled fresh on a machine that never pushed itself.
const syncState = ref(null)

// Push périodique en arrière-plan (retour utilisateur du 2026-08-17) —
// toutes les 5 minutes, silencieux (pas de toast de succès, seulement en
// cas d'erreur). Pas besoin de suivre "y a-t-il eu un vrai changement
// depuis" ici : rclone ne retransfère que ce qui diffère réellement
// (checksum/date), donc un tick "pour rien" coûte quasi rien — plus simple
// et plus sûr que d'accrocher un hook sur chaque point de sauvegarde
// locale (chapitres/contacts/jeu/i18n/seed/assets, une bonne dizaine
// d'endroits dans EditorPage.vue).
const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000
const AUTO_SYNC_KEY = 'stories-engine-cloud-autosync'
function readAutoSyncPref() {
  try {
    return localStorage.getItem(AUTO_SYNC_KEY) === 'true'
  } catch {
    return false
  }
}
const autoSyncEnabled = ref(readAutoSyncPref())
let autoSyncTimer = null

let unsubscribeInstallProgress = null
let pollTimer = null

export function useCloudSync() {
  const story = useStoryStore()
  const { t } = useEditorI18n()

  const selectedRemote = computed(() => story.project?.manifest?.cloudSync?.remote || '')

  function slugify(str) {
    return (
      String(str || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'projet'
    )
  }
  const remotePath = computed(
    () =>
      story.project?.manifest?.cloudSync?.remotePath ||
      `stories-engine/${slugify(story.project?.manifest?.name)}`,
  )

  // Single glance status for the toolbar button — the dialog reads the same
  // finer-grained refs (installing/installProgress/syncing/jobProgress) for
  // its own detailed display.
  const status = computed(() => {
    if (rcloneInstalled.value === null) return 'checking'
    if (installing.value) return 'installing'
    if (!rcloneInstalled.value) return 'not-installed'
    if (syncing.value) return 'syncing'
    if (!selectedRemote.value) return 'not-connected'
    return 'ready'
  })

  // Un seul compte cloud à la fois (retour utilisateur du 2026-08-17) —
  // CloudProviderConnect.vue se base là-dessus pour masquer les boutons de
  // connexion tant qu'un remote existe déjà. Contrainte UI uniquement, pas
  // appliquée côté main process (pas un vrai boundary de sécurité, juste une
  // préférence de simplicité pour un usage mono-compte).
  const atConnectionLimit = computed(() => remotes.value.length >= 1)

  async function checkRclone() {
    const res = await window.storieAPI.cloud.checkRclone()
    rcloneInstalled.value = res.installed
    if (res.installed) loadRemotes()
  }

  async function doInstallRclone() {
    installing.value = true
    installProgress.value = { stage: '', percent: 0 }
    unsubscribeInstallProgress = window.storieAPI.cloud.onInstallProgress((progress) => {
      installProgress.value = progress
    })
    try {
      await window.storieAPI.cloud.installRclone()
      rcloneInstalled.value = true
      await loadRemotes()
    } catch (err) {
      Notify.create({ type: 'negative', message: err.message || String(err) })
    } finally {
      installing.value = false
      unsubscribeInstallProgress?.()
      unsubscribeInstallProgress = null
    }
  }

  async function loadRemotes() {
    remotes.value = await window.storieAPI.cloud.listRemotes()
  }

  // La cible cloud du projet vit dans project.json (manifest.cloudSync), pas
  // dans game.js — même patron d'écriture immédiate que entryChapterId dans
  // GameForm.vue (project:saveManifest, pas le flux autosave/dirty générique
  // de EditorPage.vue).
  function ensureCloudSyncField() {
    if (!story.project.manifest) story.project.manifest = {}
    if (!story.project.manifest.cloudSync) story.project.manifest.cloudSync = {}
    return story.project.manifest.cloudSync
  }
  async function saveManifestNow() {
    await window.storieAPI.saveManifest({
      rootPath: story.project.rootPath,
      manifest: JSON.parse(JSON.stringify(story.project.manifest)),
    })
  }

  async function selectRemote(name) {
    ensureCloudSyncField().remote = name
    await saveManifestNow()
  }

  function setRemotePath(value) {
    ensureCloudSyncField().remotePath = value
    saveManifestNow()
  }

  function uniqueRemoteName(base) {
    if (!remotes.value.includes(base)) return base
    let n = 2
    while (remotes.value.includes(`${base}-${n}`)) n++
    return `${base}-${n}`
  }

  // Shared by the 3 quick-connect buttons AND the advanced form (see
  // CloudProviderConnect.vue) — same IPC call either way, only
  // `providerKey` vs `type`/`options` differ (see cloudSync.js's own
  // QUICK_PROVIDERS table). `skipSelect` is for CloudLoadButton.vue
  // (OpenProjectPage.vue, no project open yet — story.project is null,
  // there's nothing to write manifest.cloudSync onto).
  async function connect({ connectingKey, name, providerKey, type, options, skipSelect = false }) {
    connecting.value = connectingKey
    try {
      await window.storieAPI.cloud.connectProvider({ name, providerKey, type, options })
      await loadRemotes()
      if (!skipSelect) await selectRemote(name)
      Notify.create({ type: 'positive', message: t('cloudSyncPanel.remoteConnected') })
      return true
    } catch (err) {
      Notify.create({ type: 'negative', message: err.message || t('cloudSyncPanel.connectError') })
      return false
    } finally {
      connecting.value = null
    }
  }

  // Projets trouvés sous PROJECTS_ROOT sur ce remote (voir cloudSync.js) —
  // alimente "Charger depuis le cloud". Thin wrapper, pas d'état partagé
  // ici : la liste n'a de sens que pour le remote actuellement affiché dans
  // CloudLoadButton.vue, gardée en état local là-bas.
  async function listRemoteProjects(remote) {
    return window.storieAPI.cloud.listRemoteProjects({ remote })
  }

  async function disconnectRemote(name) {
    await window.storieAPI.cloud.disconnectRemote({ name })
    if (selectedRemote.value === name) {
      ensureCloudSyncField().remote = undefined
      await saveManifestNow()
    }
    await loadRemotes()
  }

  // Supprime le dossier distant du projet courant (pas juste la connexion
  // rclone) — choix explicite de l'utilisateur au moment de déconnecter
  // (voir CloudSyncButton.vue confirmDisconnect), jamais un effet de bord
  // automatique.
  async function purgeRemotePath() {
    await window.storieAPI.cloud.purgePath({
      remote: selectedRemote.value,
      remotePath: remotePath.value,
    })
  }

  async function loadSyncState() {
    if (!story.project?.rootPath) {
      syncState.value = null
      return
    }
    syncState.value = await window.storieAPI.cloud.readSyncState({
      rootPath: story.project.rootPath,
    })
  }

  function stopPolling() {
    if (pollTimer) clearInterval(pollTimer)
    pollTimer = null
  }

  // `silent` : pas de toast de succès (utilisé par le push automatique en
  // arrière-plan — un toast toutes les 5 minutes serait vite pénible). Les
  // erreurs restent TOUJOURS remontées, silencieux ou pas : un push auto
  // qui échoue en boucle sans jamais le dire serait pire qu'un toast en
  // trop.
  function pollJob(jobid, { onSuccess, silent = false } = {}) {
    stopPolling()
    pollTimer = setInterval(async () => {
      try {
        const { status: jobStatus, stats } = await window.storieAPI.cloud.jobStatus({ jobid })
        jobProgress.value = stats
        if (jobStatus.finished) {
          stopPolling()
          syncing.value = null
          jobProgress.value = null
          if (jobStatus.success) {
            if (!silent)
              Notify.create({ type: 'positive', message: t('cloudSyncPanel.syncSuccess') })
            onSuccess?.()
          } else {
            Notify.create({
              type: 'negative',
              message: jobStatus.error || t('cloudSyncPanel.syncError'),
            })
          }
        }
      } catch (err) {
        stopPolling()
        syncing.value = null
        Notify.create({ type: 'negative', message: err.message || t('cloudSyncPanel.syncError') })
      }
    }, 700)
  }

  async function runSync(direction, { silent = false } = {}) {
    syncing.value = direction
    jobProgress.value = null
    try {
      const payload = {
        rootPath: story.project.rootPath,
        remote: selectedRemote.value,
        remotePath: remotePath.value,
      }
      if (direction === 'push') {
        // cloudsync.json est réécrit et inclus dans CE push avant même que
        // le transfert démarre (voir cloudSync.js) — l'état affiché peut
        // donc être mis à jour tout de suite, pas besoin d'attendre la fin
        // du job pour ça.
        const res = await window.storieAPI.cloud.push(payload)
        syncState.value = res.state
        pollJob(res.jobid, { silent })
      } else {
        // Pull : cloudsync.json local ne reflète le contenu distant qu'une
        // fois le transfert terminé — relu après coup (onSuccess), pas
        // deviné à l'avance.
        const res = await window.storieAPI.cloud.pull(payload)
        pollJob(res.jobid, { onSuccess: loadSyncState, silent })
      }
    } catch (err) {
      syncing.value = null
      Notify.create({ type: 'negative', message: err.message || t('cloudSyncPanel.syncError') })
    }
  }

  // Timer partagé (un seul pour toute la session éditeur, peu importe
  // combien de fois useCloudSync() est appelé) — démarré/arrêté par
  // CloudSyncButton.vue sur son propre cycle de vie (monté tant qu'un
  // projet est ouvert dans EditorPage.vue), pas par l'ouverture/fermeture
  // du dialogue.
  function startAutoSync() {
    if (autoSyncTimer) return
    autoSyncTimer = setInterval(() => {
      if (
        autoSyncEnabled.value &&
        rcloneInstalled.value &&
        selectedRemote.value &&
        !syncing.value &&
        story.project?.rootPath
      ) {
        runSync('push', { silent: true })
      }
    }, AUTO_SYNC_INTERVAL_MS)
  }

  function stopAutoSync() {
    if (autoSyncTimer) clearInterval(autoSyncTimer)
    autoSyncTimer = null
  }

  function setAutoSyncEnabled(value) {
    autoSyncEnabled.value = value
    try {
      localStorage.setItem(AUTO_SYNC_KEY, String(value))
    } catch {
      // stockage indisponible — préférence non persistée, reste active
      // pour cette session.
    }
    if (value) {
      // Activer déclenche tout de suite un premier push silencieux (pas
      // besoin d'attendre jusqu'à 5 minutes pour la première sauvegarde),
      // puis repart sur l'intervalle normal.
      if (selectedRemote.value && !syncing.value) runSync('push', { silent: true })
      startAutoSync()
    } else {
      stopAutoSync()
    }
  }

  return {
    rcloneInstalled,
    installing,
    installProgress,
    remotes,
    connecting,
    syncing,
    jobProgress,
    syncState,
    autoSyncEnabled,
    selectedRemote,
    remotePath,
    status,
    atConnectionLimit,
    checkRclone,
    doInstallRclone,
    loadRemotes,
    connect,
    listRemoteProjects,
    disconnectRemote,
    purgeRemotePath,
    loadSyncState,
    selectRemote,
    setRemotePath,
    uniqueRemoteName,
    runSync,
    stopPolling,
    startAutoSync,
    stopAutoSync,
    setAutoSyncEnabled,
  }
}
