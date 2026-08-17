// Cloud sync — sauvegarde/restauration de projet via rclone (voir
// docs/cloud-sync-rclone-plan.md pour le plan complet et les points non
// encore vérifiés en conditions réelles). Le démon rclone (mode `rcd`)
// tourne en LOCAL UNIQUEMENT — bind 127.0.0.1, port libre choisi par l'OS,
// token d'auth aléatoire régénéré à chaque lancement de l'éditeur — et
// expose une API JSON que ce module pilote. Le renderer ne parle jamais à
// rclone directement : tout passe par les handlers ipcMain ci-dessous,
// comme le reste de l'app (voir project.js/android.js).
//
// `rclone.conf` (où vivent les tokens OAuth des remotes connectés) est
// stocké EN CLAIR sous userData/rclone-toolchain/ — protégé uniquement par
// les permissions du profil OS de l'utilisateur, même modèle de confiance
// que la plupart des credentials stockés par les apps desktop. Un chiffrage
// via `rclone config encryption set` piloté par stdin (même patron que
// `acceptLicenses()` dans androidToolchain.js pour les licences du SDK
// Android) a été tenté puis abandonné : confirmé cassé contre un vrai
// build (le sous-process attend une entrée supplémentaire que le script ne
// fournit pas, `Failed to read line: EOF`) — impossible à déboguer à
// l'aveugle sans accès à un vrai rclone pour itérer. Fiabilité > chiffrage
// pour ce v1 ; à revisiter si besoin (voir docs/cloud-sync-rclone-plan.md).
import { app, ipcMain } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import net from 'node:net'
import os from 'node:os'
import crypto from 'node:crypto'
import spawn from 'cross-spawn'
import { detectRclone, installRclone, getRcloneBin } from './rcloneToolchain.js'

// Fichier de bookkeeping poussé/tiré COMME LE RESTE du projet (pas à part)
// — voyage avec le contenu synchronisé, donc lisible après un pull sur
// n'importe quelle machine, sans dépendre d'un état local qui n'existerait
// que sur la machine ayant fait le dernier push. Jamais chargé par
// project.js (project:load l'ignore, comme tout fichier racine inconnu) ni
// copié dans le jeu exporté (shellAssembly.js ne copie que les fichiers
// projet qu'il connaît explicitement).
const SYNC_STATE_FILE = 'cloudsync.json'

function readSyncState(rootPath) {
  const statePath = path.join(rootPath, SYNC_STATE_FILE)
  if (!fs.existsSync(statePath)) return null
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf-8'))
  } catch {
    return null
  }
}

function writeSyncState(rootPath) {
  const state = { lastSyncedAt: new Date().toISOString(), device: os.hostname() }
  fs.writeFileSync(
    path.join(rootPath, SYNC_STATE_FILE),
    JSON.stringify(state, null, 2) + '\n',
    'utf-8',
  )
  return state
}

export function getRcloneToolchainRoot() {
  return path.join(app.getPath('userData'), 'rclone-toolchain')
}

function getConfigPath() {
  return path.join(getRcloneToolchainRoot(), 'rclone.conf')
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.unref()
    srv.on('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address()
      srv.close(() => resolve(port))
    })
  })
}

// Un seul démon partagé pour toute la session Electron, démarré au premier
// besoin (pas au lancement de l'app), tué proprement à la fermeture (voir
// stopCloudSyncOnQuit, appelé par electron-main.js comme
// stopWebPreviewOnQuit l'est déjà pour le serveur de preview web).
let daemon = null // { process, port, user, pass }
let daemonStarting = null // Promise en cours, évite un double-spawn si deux appels IPC arrivent en même temps.

// Couche HTTP pure, sans effet de bord sur l'état module — prend le
// démon cible en paramètre explicite plutôt que de lire la variable
// ambiante `daemon`, pour que waitForDaemonReady() (appelé PENDANT le
// démarrage, où des échecs de connexion sont normaux/attendus tant que
// rclone n'a pas fini de binder son port) puisse retenter sans déclencher
// le nettoyage "démon mort" ci-dessous dans rcCall().
async function rawRcCall(target, method, body) {
  const auth = Buffer.from(`${target.user}:${target.pass}`).toString('base64')
  const res = await fetch(`http://127.0.0.1:${target.port}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let json
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(`Réponse rclone invalide pour ${method}: ${text.slice(0, 500)}`)
  }
  if (!res.ok) {
    throw new Error(json.error || `Appel rclone ${method} échoué (${res.status})`)
  }
  return json
}

async function rcCall(method, body = {}) {
  if (!daemon) throw new Error('Démon rclone non démarré.')
  try {
    return await rawRcCall(daemon, method, body)
  } catch (err) {
    // fetch() lève un TypeError (pas un Error classique) spécifiquement
    // pour un échec réseau (connexion refusée/reset) — à distinguer d'une
    // vraie réponse rclone en erreur (déjà un Error propre venu de
    // rawRcCall ci-dessus, pas un TypeError). Le process a probablement
    // crashé ou s'est bloqué entre deux appels (voir le commentaire sur
    // stdio:'ignore' dans startDaemon — c'était la cause la plus probable
    // observée), pas juste CETTE requête qui a un problème isolé. On
    // l'oublie plutôt que de garder une référence morte : le prochain
    // ensureDaemonStarted() (appelé par chaque handler cloud:* avant son
    // propre rcCall) le relancera tout seul — il suffit de réessayer
    // l'action, pas besoin de rouvrir l'éditeur.
    if (err instanceof TypeError) {
      daemon = null
      throw new Error(
        `Le démon rclone ne répond plus (${err.message}) — réessaie, il va redémarrer automatiquement.`,
      )
    }
    throw err
  }
}

async function waitForDaemonReady(target, timeoutMs = 8000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      await rawRcCall(target, 'core/pid', {})
      return
    } catch {
      await new Promise((r) => setTimeout(r, 150))
    }
  }
  throw new Error('Le démon rclone ne répond pas.')
}

async function startDaemon() {
  const toolchainRoot = getRcloneToolchainRoot()
  if (!detectRclone(toolchainRoot)) {
    throw new Error(
      'rclone n’est pas installé — installe-le depuis le panneau Cloud avant de continuer.',
    )
  }

  const port = await getFreePort()
  const user = 'stories-engine'
  const pass = crypto.randomBytes(24).toString('hex')
  const configPath = getConfigPath()
  fs.mkdirSync(path.dirname(configPath), { recursive: true })

  const proc = spawn(
    getRcloneBin(toolchainRoot),
    [
      'rcd',
      `--rc-addr=127.0.0.1:${port}`,
      `--rc-user=${user}`,
      `--rc-pass=${pass}`,
      `--config=${configPath}`,
    ],
    // 'ignore' on all 3, not 'pipe' — this is a LONG-RUNNING daemon (the
    // whole editor session), not a short one-shot command. rclone logs
    // every RC request to stdout/stderr; a 'pipe' stream nobody ever reads
    // fills up its OS buffer (~64KB on Windows) after enough requests, and
    // the child then BLOCKS on write — which looks like the daemon has
    // silently died (fetch failed / connection reset) even though the
    // process is still technically alive. Confirmed against a real report:
    // worked for the first several actions in a session, broke once more
    // RC calls had accumulated. We never read this daemon's own
    // stdout/stderr for anything (errors come back in the RC JSON response
    // body) — 'ignore' is correct here, not a workaround.
    { stdio: 'ignore' },
  )
  proc.on('exit', () => {
    if (daemon?.process === proc) daemon = null
  })

  daemon = { process: proc, port, user, pass }
  await waitForDaemonReady(daemon)
  return daemon
}

async function ensureDaemonStarted() {
  if (daemon) return daemon
  if (!daemonStarting) {
    daemonStarting = startDaemon().finally(() => {
      daemonStarting = null
    })
  }
  return daemonStarting
}

export function stopCloudSyncOnQuit() {
  if (daemon?.process && !daemon.process.killed) {
    daemon.process.kill()
  }
  daemon = null
}

// Les 3 providers "un clic" du panneau Cloud (voir docs/cloud-sync-rclone-plan.md
// §UI) — juste le nom de provider rclone exact derrière chaque bouton,
// aucune option supplémentaire (rclone gère l'OAuth lui-même : ouverture du
// navigateur système, attente du callback). Le mode avancé passe `type`
// directement (voir cloud:connectProvider ci-dessous) plutôt que de passer
// par cette table.
const QUICK_PROVIDERS = {
  gdrive: 'drive',
  onedrive: 'onedrive',
  dropbox: 'dropbox',
}

// Racine conventionnelle sous laquelle un projet est poussé par défaut (voir
// useCloudSync.js `remotePath`) — la seule racine que cloud:listRemoteProjects
// explore. Un projet poussé sous un `remotePath` personnalisé n'apparaîtra
// pas dans "Charger depuis le cloud" (limitation connue, voir
// docs/cloud-sync-rclone-plan.md).
const PROJECTS_ROOT = 'stories-engine'

export function registerCloudSyncHandlers(mainWindow) {
  ipcMain.handle('cloud:checkRclone', async () => {
    return { installed: detectRclone(getRcloneToolchainRoot()) }
  })

  ipcMain.handle('cloud:installRclone', async () => {
    await installRclone(getRcloneToolchainRoot(), (progress) => {
      mainWindow.webContents.send('cloud:installProgress', progress)
    })
    return { installed: true }
  })

  // Catalogue complet des 70+ providers rclone (id/nom/description/schéma
  // d'options) — alimente le mode avancé "Autre fournisseur" du panneau
  // Cloud. Pas de cache ici : rclone répond en quelques ms, et ce catalogue
  // ne change qu'avec la version de rclone elle-même.
  ipcMain.handle('cloud:listProviders', async () => {
    await ensureDaemonStarted()
    const res = await rcCall('config/providers')
    return res.providers || []
  })

  ipcMain.handle('cloud:listRemotes', async () => {
    await ensureDaemonStarted()
    const res = await rcCall('config/listremotes')
    return res.remotes || []
  })

  // Liste les sous-dossiers de PROJECTS_ROOT sur ce remote — alimente
  // "Charger depuis le cloud" (OpenProjectPage.vue, avant tout projet
  // ouvert, donc rien à lire dans story.project ici). Rien poussé encore
  // depuis ce compte = dossier racine absent côté distant, traité comme
  // une liste vide plutôt qu'une erreur (le message d'erreur exact rclone
  // renvoie pour "dossier introuvable" n'a pas pu être vérifié contre un
  // vrai remote dans cet environnement — le filtre ci-dessous est une
  // heuristique, voir docs/cloud-sync-rclone-plan.md).
  ipcMain.handle('cloud:listRemoteProjects', async (_evt, { remote }) => {
    await ensureDaemonStarted()
    try {
      const res = await rcCall('operations/list', {
        fs: `${remote}:`,
        remote: PROJECTS_ROOT,
        opt: { recurse: false },
      })
      return (res.list || []).filter((item) => item.IsDir).map((item) => item.Name)
    } catch (err) {
      const message = err.message || ''
      if (/not found|doesn.t exist|404/i.test(message)) return []
      throw err
    }
  })

  // `providerKey` sélectionne un des 3 boutons rapides (options vides,
  // rclone gère tout l'OAuth). `type`/`options` viennent du formulaire
  // dynamique du mode avancé sinon — même appel, même chemin de code des
  // deux côtés (voir docs/cloud-sync-rclone-plan.md étape 7).
  ipcMain.handle('cloud:connectProvider', async (_evt, { name, providerKey, type, options }) => {
    await ensureDaemonStarted()
    const resolvedType = providerKey ? QUICK_PROVIDERS[providerKey] : type
    if (!resolvedType) throw new Error('Fournisseur cloud inconnu.')
    return rcCall('config/create', { name, type: resolvedType, parameters: options || {} })
  })

  ipcMain.handle('cloud:disconnectRemote', async (_evt, { name }) => {
    await ensureDaemonStarted()
    return rcCall('config/delete', { name })
  })

  // Supprime tout le dossier distant d'un projet (`operations/purge`,
  // récursif) — utilisé quand l'utilisateur choisit "tout supprimer" au
  // moment de déconnecter un compte, PAS un effet de bord automatique de
  // la déconnexion elle-même (voir CloudSyncButton.vue confirmDisconnect).
  ipcMain.handle('cloud:purgePath', async (_evt, { remote, remotePath }) => {
    await ensureDaemonStarted()
    return rcCall('operations/purge', { fs: `${remote}:`, remote: remotePath })
  })

  ipcMain.handle('cloud:readSyncState', async (_evt, { rootPath }) => {
    return readSyncState(rootPath)
  })

  // Push (local -> distant). `sync/sync` (pas `sync/copy`) — un fichier
  // supprimé localement doit aussi disparaître côté cloud, pas juste les
  // ajouts/modifs (retour utilisateur du 2026-08-17). rclone ne retransfère
  // déjà que les fichiers changés/nouveaux de lui-même (diff par
  // checksum/date), `sync` n'ajoute que la suppression des fichiers en trop
  // côté destination par rapport à `copy`. `cloudsync.json` est réécrit
  // AVANT le sync (donc inclus dans CE push) — c'est lui qui porte l'état
  // "dernière synchro", lisible par n'importe quelle machine après un pull
  // puisqu'il fait partie du contenu synchronisé, pas juste de
  // `project.json` local à cette machine. `_async: true` renvoie
  // immédiatement un `jobid` à poller via cloud:jobStatus plutôt que de
  // bloquer le handler IPC jusqu'à la fin du transfert.
  ipcMain.handle('cloud:push', async (_evt, { rootPath, remote, remotePath }) => {
    await ensureDaemonStarted()
    const state = writeSyncState(rootPath)
    const res = await rcCall('sync/sync', {
      srcFs: rootPath,
      dstFs: `${remote}:${remotePath}`,
      _async: true,
    })
    return { ...res, state }
  })

  // Pull (distant -> local), même raisonnement `sync/sync` que push — un
  // fichier supprimé côté cloud doit aussi disparaître en local. Le
  // renderer DOIT avoir affiché et fait confirmer l'avertissement
  // d'écrasement avant d'appeler ce canal — rien ne le garantit côté main
  // process, même split de responsabilité que les autres actions
  // destructives de ce projet (voir deleteChapter dans project.js).
  ipcMain.handle('cloud:pull', async (_evt, { rootPath, remote, remotePath }) => {
    await ensureDaemonStarted()
    return rcCall('sync/sync', { srcFs: `${remote}:${remotePath}`, dstFs: rootPath, _async: true })
  })

  ipcMain.handle('cloud:jobStatus', async (_evt, { jobid }) => {
    await ensureDaemonStarted()
    const [status, stats] = await Promise.all([
      rcCall('job/status', { jobid }),
      rcCall('core/stats', { group: `job/${jobid}` }),
    ])
    return { status, stats }
  })
}
