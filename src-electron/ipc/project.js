// Project loading pipeline for the editor's Phase 1 read-only preview (see
// docs/editor-plan-phase1.md). Runs entirely in the main process: opens a
// folder dialog, dynamically imports every .js file in a project folder
// (chapters, contacts, threads, game, seed, i18n dictionaries) and assembles
// a plain, IPC-clonable ProjectData object for the renderer's
// story.loadProject(data) action.
import { ipcMain, dialog } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import * as prettier from 'prettier/standalone'
import babelPlugin from 'prettier/plugins/babel'
import estreePlugin from 'prettier/plugins/estree'
// Pure, dependency-free (no Vue/Electron/browser API) — safe to reuse
// straight from the main process for scaffolding a new project's initial
// files, same as the renderer reuses it for saving edits.
import {
  serializeChapter,
  serializeContacts,
  serializeThreads,
  serializeGame,
  serializeI18nBucket,
} from '../../src/project/serializeChapter.js'
import { scanCustomApps } from './customApps.js'

// Read by electron-main.js's `storie-asset://` protocol handler so it knows
// which project's assets/ folder to resolve relative paths against.
let currentAssetsRoot = null

export function getCurrentAssetsRoot() {
  return currentAssetsRoot
}

// Cache-busting query param defeats Node's ESM module cache — re-opening the
// same project after an on-disk edit (without restarting Electron) must
// reflect the change, not the stale cached module.
async function importFresh(absPath) {
  const url = pathToFileURL(absPath).href + '?t=' + Date.now()
  return import(url)
}

async function loadDefaultOr(absPath, fallback) {
  if (!fs.existsSync(absPath)) return fallback
  const mod = await importFresh(absPath)
  return mod.default ?? fallback
}

async function scanChapters(dir, baseDir = dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...(await scanChapters(full, baseDir)))
    } else if (entry.name.endsWith('.js')) {
      const mod = await importFresh(full)
      out.push({
        ...(mod.default ?? mod),
        __sourceFile: path.relative(baseDir, full).replace(/\\/g, '/'),
      })
    }
  }
  return out
}

async function loadI18n(rootDir) {
  const i18nDir = path.join(rootDir, 'i18n')
  const out = {}
  if (!fs.existsSync(i18nDir)) return out
  for (const localeDir of fs.readdirSync(i18nDir, { withFileTypes: true })) {
    if (!localeDir.isDirectory()) continue
    out[localeDir.name] = {}
    const bucketDir = path.join(i18nDir, localeDir.name)
    for (const file of fs.readdirSync(bucketDir)) {
      if (!file.endsWith('.js')) continue
      const bucket = path.basename(file, '.js')
      out[localeDir.name][bucket] = await loadDefaultOr(path.join(bucketDir, file), {})
    }
  }
  return out
}

async function loadProjectFromDisk(rootPath) {
  const manifestPath = path.join(rootPath, 'project.json')
  // project.json is plain JSON, not a JS module — read + JSON.parse
  // directly, never importFresh() (no import-attribute ceremony needed for
  // one manifest file).
  const manifest = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    : { name: path.basename(rootPath) }

  const chaptersDir = path.join(rootPath, 'chapters')
  const chapters = fs.existsSync(chaptersDir) ? await scanChapters(chaptersDir) : []

  const contacts = await loadDefaultOr(path.join(rootPath, 'contacts.js'), [])
  const threads = await loadDefaultOr(path.join(rootPath, 'threads.js'), [])
  const gameConfig = await loadDefaultOr(path.join(rootPath, 'game.js'), {
    title: manifest.name || '',
  })

  const seedDir = path.join(rootPath, 'seed')
  const seed = {
    messages: await loadDefaultOr(path.join(seedDir, 'messages.js'), {}),
    dms: await loadDefaultOr(path.join(seedDir, 'dms.js'), {}),
    posts: await loadDefaultOr(path.join(seedDir, 'posts.js'), []),
    reels: await loadDefaultOr(path.join(seedDir, 'reels.js'), []),
    photos: await loadDefaultOr(path.join(seedDir, 'photos.js'), []),
  }

  const i18nDict = await loadI18n(rootPath)

  const appsDir = path.join(rootPath, 'apps')
  const customApps = scanCustomApps(appsDir)

  currentAssetsRoot = path.join(rootPath, 'assets')

  const projectData = {
    rootPath,
    manifest,
    chapters,
    contacts,
    threads,
    gameConfig,
    seed,
    i18n: i18nDict,
    assetsRoot: 'assets',
    customApps,
  }

  // Defensive: guarantees the blob is actually IPC-clonable (plain data, no
  // functions/Map/class instances a project file might have accidentally
  // exported) and doubles as an implicit assertion that the "chapters stay
  // pure data" convention (see docs/editor-plan-phase1.md decision #1) held.
  return JSON.parse(JSON.stringify(projectData))
}

// Phase 2 — write-back helpers (editing, see docs/phase2-plan.md).

function readManifest(rootPath) {
  const manifestPath = path.join(rootPath, 'project.json')
  return fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    : { name: path.basename(rootPath) }
}

function writeManifest(rootPath, manifest) {
  fs.writeFileSync(
    path.join(rootPath, 'project.json'),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf-8',
  )
}

// Renderer only builds a syntactically-valid JS literal (see
// src/project/serializeChapter.js) — Prettier applies the project's actual
// style (.prettierrc.json) right before it touches disk, here in main.
async function formatJs(source) {
  return prettier.format(source, {
    parser: 'babel',
    plugins: [babelPlugin, estreePlugin],
    semi: false,
    singleQuote: true,
    printWidth: 100,
  })
}

// Exported for reuse by customApps.js (same id -> filename convention).
export function slugify(id) {
  return (
    String(id)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'chapter'
  )
}

export function registerProjectHandlers(mainWindow) {
  ipcMain.handle('project:selectFolder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Ouvrir un projet',
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('project:load', async (_evt, rootPath) => {
    return loadProjectFromDisk(rootPath)
  })

  // manifest.entryChapterId (which chapter startIfNeeded() opens on boot,
  // see engine/stores/story.js) is the only manifest field the editor ever
  // writes back — everything else (name/version) is set at creation or by
  // the build pipeline. Used by GameForm.vue's entry-chapter picker and by
  // EditorPage.vue's renameChapterIfNeeded (keeps it pointed at the right
  // chapter across an id change).
  ipcMain.handle('project:saveManifest', async (_evt, { rootPath, manifest }) => {
    writeManifest(rootPath, manifest)
    return true
  })

  // Writes an already-serialized chapter (see serializeChapter.js) to its
  // source file, formatted with Prettier right before hitting disk.
  ipcMain.handle('project:saveChapter', async (_evt, { rootPath, sourceFile, source }) => {
    const formatted = await formatJs(source)
    const dest = path.join(rootPath, 'chapters', sourceFile)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.writeFileSync(dest, formatted, 'utf-8')
    return true
  })

  // Creates a new (empty) chapter file. `source` is the already-serialized
  // `export default {...}` for `{ id, title, timeline: [], next: [],
  // position }`, built renderer-side with the same serializeChapter() used
  // for saves.
  ipcMain.handle('project:createChapter', async (_evt, { rootPath, id, source }) => {
    const manifest = readManifest(rootPath)
    const sourceFile = `${slugify(id)}.js`
    const dest = path.join(rootPath, 'chapters', sourceFile)
    if (fs.existsSync(dest)) {
      throw new Error(`Un chapitre existe déjà pour ce nom de fichier : ${sourceFile}`)
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.writeFileSync(dest, await formatJs(source), 'utf-8')

    return { manifest, sourceFile }
  })

  // Renaming a chapter's title regenerates its id renderer-side (see
  // EditorPage.vue's renameChapterIfNeeded) — this handler follows that id
  // on disk: moves chapters/<oldId>.js to chapters/<newId>.js (same
  // create-vs-collide check as project:createChapter) and, since a chapter's
  // i18n strings live in a bucket file named after its id (see
  // extractTranslatableStrings.js/I18nBucketEditor.vue), renames that
  // bucket alongside it in every locale that has one — otherwise existing
  // translations would silently orphan under the old id. Updating other
  // chapters' `next[].to` that pointed at the old id is the renderer's job
  // (same split as deleteChapter below), each via its own saveChapter call.
  ipcMain.handle(
    'project:renameChapter',
    async (_evt, { rootPath, oldId, newId, oldSourceFile, source }) => {
      const newSourceFile = `${slugify(newId)}.js`
      const oldDest = path.join(rootPath, 'chapters', oldSourceFile)
      const newDest = path.join(rootPath, 'chapters', newSourceFile)
      if (newDest !== oldDest && fs.existsSync(newDest)) {
        throw new Error(`Un chapitre existe déjà pour ce nom de fichier : ${newSourceFile}`)
      }
      fs.mkdirSync(path.dirname(newDest), { recursive: true })
      fs.writeFileSync(newDest, await formatJs(source), 'utf-8')
      if (newDest !== oldDest && fs.existsSync(oldDest)) fs.unlinkSync(oldDest)

      const i18nDir = path.join(rootPath, 'i18n')
      if (fs.existsSync(i18nDir)) {
        for (const localeDir of fs.readdirSync(i18nDir, { withFileTypes: true })) {
          if (!localeDir.isDirectory()) continue
          const oldBucket = path.join(i18nDir, localeDir.name, `${oldId}.js`)
          const newBucket = path.join(i18nDir, localeDir.name, `${newId}.js`)
          if (fs.existsSync(oldBucket) && !fs.existsSync(newBucket)) {
            fs.renameSync(oldBucket, newBucket)
          }
        }
      }

      return { sourceFile: newSourceFile }
    },
  )

  // Deletion confirmation is the renderer's job (a q-dialog before this is
  // ever called) — this handler just does the actual file removal. Any
  // dangling `next` edge left pointing at this chapter on other chapters is
  // cleaned up renderer-side (see ChapterGraph.vue's confirmDelete), each
  // via its own project:saveChapter call.
  ipcMain.handle('project:deleteChapter', async (_evt, { rootPath, sourceFile }) => {
    const target = path.join(rootPath, 'chapters', sourceFile)
    if (fs.existsSync(target)) fs.unlinkSync(target)
    return true
  })

  // contacts.js / threads.js / game.js are flat single files (no per-item
  // file, no manifest bookkeeping) — add/remove is in-memory array mutation
  // renderer-side, always followed by a full overwrite here.
  ipcMain.handle('project:saveContacts', async (_evt, { rootPath, source }) => {
    fs.writeFileSync(path.join(rootPath, 'contacts.js'), await formatJs(source), 'utf-8')
    return true
  })

  ipcMain.handle('project:saveThreads', async (_evt, { rootPath, source }) => {
    fs.writeFileSync(path.join(rootPath, 'threads.js'), await formatJs(source), 'utf-8')
    return true
  })

  ipcMain.handle('project:saveGame', async (_evt, { rootPath, source }) => {
    fs.writeFileSync(path.join(rootPath, 'game.js'), await formatJs(source), 'utf-8')
    return true
  })

  ipcMain.handle('project:saveI18nBucket', async (_evt, { rootPath, locale, bucket, source }) => {
    const localeDir = path.join(rootPath, 'i18n', locale)
    fs.mkdirSync(localeDir, { recursive: true })
    fs.writeFileSync(path.join(localeDir, `${bucket}.js`), await formatJs(source), 'utf-8')
    return true
  })

  const SEED_BUCKETS = new Set(['messages', 'dms', 'posts', 'reels', 'photos'])
  ipcMain.handle('project:saveSeedBucket', async (_evt, { rootPath, bucket, source }) => {
    if (!SEED_BUCKETS.has(bucket)) {
      throw new Error(`Bucket seed inconnu : ${bucket}`)
    }
    const seedDir = path.join(rootPath, 'seed')
    fs.mkdirSync(seedDir, { recursive: true })
    fs.writeFileSync(path.join(seedDir, `${bucket}.js`), await formatJs(source), 'utf-8')
    return true
  })

  // Locale codes are folder names, not slugify()'d ids — BCP-47 casing
  // (en-US, not en-us) is meaningful convention here, so this only rejects
  // path-unsafe characters rather than lowercasing/hyphenating like
  // slugify() does for chapter ids.
  ipcMain.handle('project:createLocale', async (_evt, { rootPath, locale }) => {
    const trimmed = String(locale).trim()
    if (!trimmed || !/^[A-Za-z0-9_-]+$/.test(trimmed)) {
      throw new Error('Code de langue invalide (lettres, chiffres, - et _ uniquement).')
    }
    const localeDir = path.join(rootPath, 'i18n', trimmed)
    fs.mkdirSync(localeDir, { recursive: true })
    const commonPath = path.join(localeDir, 'common.js')
    if (!fs.existsSync(commonPath)) {
      fs.writeFileSync(commonPath, await formatJs(serializeI18nBucket({})), 'utf-8')
    }
    return trimmed
  })

  // Irreversible — wipes every bucket file translated for that locale.
  // The renderer (LocaleList.vue) is what actually guards this behind a
  // confirmation dialog; same split as every other destructive handler
  // here (deleteChapter, resetSave client-side) not re-confirming itself.
  ipcMain.handle('project:deleteLocale', async (_evt, { rootPath, locale }) => {
    const trimmed = String(locale).trim()
    if (!trimmed || !/^[A-Za-z0-9_-]+$/.test(trimmed)) {
      throw new Error('Code de langue invalide.')
    }
    const localeDir = path.join(rootPath, 'i18n', trimmed)
    if (fs.existsSync(localeDir)) fs.rmSync(localeDir, { recursive: true, force: true })
    return true
  })

  // Reserves an EMPTY folder at parentPath/slugify(name) — used by the
  // "Charger depuis le cloud" flow (see cloudSync.js's cloud:pull) to get a
  // collision-checked destination to pull INTO, without scaffolding any
  // starter content the way project:createProject does (the cloud pull
  // itself is what populates it). Same collision guard as createProject.
  ipcMain.handle('project:reserveNewFolder', async (_evt, { parentPath, name }) => {
    const rootPath = path.join(parentPath, slugify(name))
    if (fs.existsSync(rootPath)) {
      throw new Error(`Un dossier existe déjà à cet emplacement : ${slugify(name)}`)
    }
    fs.mkdirSync(rootPath, { recursive: true })
    return rootPath
  })

  // Picks a PARENT folder to create the new project's own folder inside —
  // separate title/intent from project:selectFolder (which opens an
  // existing project root directly).
  ipcMain.handle('project:selectNewProjectLocation', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Choisir où créer le projet',
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // Scaffolds a minimal new project: project.json + one starter chapter +
  // contacts.js (with the required 'me' contact, see myColor/findContact in
  // engine/stores/story.js) + empty threads.js + game.js. Reuses the same
  // serializers the editor uses for saving, so the on-disk format matches
  // exactly what a hand-edited/editor-saved project would produce.
  ipcMain.handle('project:createProject', async (_evt, { parentPath, name }) => {
    const rootPath = path.join(parentPath, slugify(name))
    if (fs.existsSync(rootPath)) {
      throw new Error(`Le dossier "${slugify(name)}" existe déjà à cet endroit.`)
    }
    fs.mkdirSync(path.join(rootPath, 'chapters'), { recursive: true })
    fs.mkdirSync(path.join(rootPath, 'assets'), { recursive: true })
    fs.mkdirSync(path.join(rootPath, 'apps'), { recursive: true })

    writeManifest(rootPath, { name, entryChapterId: 'chapter1', version: '1.0.0' })

    const chapter = {
      id: 'chapter1',
      title: 'Chapitre 1',
      timeline: [],
      next: [],
      position: { x: 0, y: 0 },
    }
    fs.writeFileSync(
      path.join(rootPath, 'chapters', 'chapter1.js'),
      await formatJs(serializeChapter(chapter)),
      'utf-8',
    )
    fs.writeFileSync(
      path.join(rootPath, 'contacts.js'),
      await formatJs(serializeContacts([{ id: 'me', name: 'Moi', color: '#4c8bf5' }])),
      'utf-8',
    )
    fs.writeFileSync(
      path.join(rootPath, 'threads.js'),
      await formatJs(serializeThreads([])),
      'utf-8',
    )
    fs.writeFileSync(
      path.join(rootPath, 'game.js'),
      await formatJs(serializeGame({ title: name })),
      'utf-8',
    )

    return rootPath
  })

  // Opens a file picker rooted at the project's assets/ folder, returns a
  // path relative to it (what image/media fields store) — rejects a pick
  // made outside assets/ rather than silently writing an unusable path.
  ipcMain.handle('project:pickAsset', async (_evt, { rootPath, accept }) => {
    const assetsRoot = path.join(rootPath, 'assets')
    fs.mkdirSync(assetsRoot, { recursive: true })
    const isAudio = accept === 'audio'
    const isVideo = accept === 'video'
    const result = await dialog.showOpenDialog(mainWindow, {
      title: isAudio
        ? 'Choisir un fichier audio'
        : isVideo
          ? 'Choisir une vidéo'
          : 'Choisir une image',
      defaultPath: assetsRoot,
      properties: ['openFile'],
      filters: isAudio
        ? [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'm4a'] }]
        : isVideo
          ? [{ name: 'Vidéo', extensions: ['mp4', 'webm', 'mov'] }]
          : [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'] }],
    })
    if (result.canceled || !result.filePaths[0]) return null
    const picked = result.filePaths[0]
    const rel = path.relative(assetsRoot, picked)
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new Error(
        isAudio
          ? "Le fichier choisi doit être à l'intérieur du dossier assets/ du projet."
          : isVideo
            ? "La vidéo choisie doit être à l'intérieur du dossier assets/ du projet."
            : "L'image choisie doit être à l'intérieur du dossier assets/ du projet.",
      )
    }
    return rel.replace(/\\/g, '/')
  })

  // Unlike pickAsset, the source dialog is NOT restricted to assets/ — this
  // is the actual "import" path: pick a file from anywhere on disk, copy it
  // into the project's assets/ (optionally under a suggested subfolder,
  // e.g. "images/<contact-id>" — see AssetField.vue), collision-safe.
  ipcMain.handle('project:importAsset', async (_evt, { rootPath, suggestedFolder, accept }) => {
    // 'images' (default, used by AssetField.vue's typed narrative fields —
    // avatar/post image/etc.) keeps the original single-filter behavior.
    // 'audio' (sound overrides, a `music` entry's track) restricts to audio
    // extensions the same way. 'any' (used by the Assets tab's general
    // import) offers a médias preset plus an explicit "all files" entry —
    // the OS dialog lets the user switch between filter entries, so this
    // isn't a hard restriction, just a convenient default.
    const filters =
      accept === 'any'
        ? [
            {
              name: 'Médias',
              extensions: [
                'png',
                'jpg',
                'jpeg',
                'gif',
                'svg',
                'webp',
                'mp3',
                'wav',
                'ogg',
                'm4a',
                'mp4',
                'webm',
                'mov',
              ],
            },
            { name: 'Tous les fichiers', extensions: ['*'] },
          ]
        : accept === 'audio'
          ? [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'm4a'] }]
          : accept === 'video'
            ? [{ name: 'Vidéo', extensions: ['mp4', 'webm', 'mov'] }]
            : [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'] }]
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Importer un fichier',
      properties: ['openFile'],
      filters,
    })
    if (result.canceled || !result.filePaths[0]) return null
    const picked = result.filePaths[0]

    const assetsRoot = path.join(rootPath, 'assets')
    const destDir = path.join(assetsRoot, suggestedFolder || '')
    fs.mkdirSync(destDir, { recursive: true })

    const ext = path.extname(picked)
    const stem = path.basename(picked, ext)
    let destPath = path.join(destDir, `${stem}${ext}`)
    let n = 2
    while (fs.existsSync(destPath)) {
      destPath = path.join(destDir, `${stem}-${n}${ext}`)
      n += 1
    }

    fs.copyFileSync(picked, destPath)
    return path.relative(assetsRoot, destPath).replace(/\\/g, '/')
  })

  // Recursive listing of assets/ as assets/-relative forward-slash paths —
  // files (the "what actually exists on disk" side of the used/orphan
  // comparison in the Assets tab; collectAssetPaths in
  // src/project/validateProject.js is the "used" side) AND folders (every
  // directory encountered, pushed before recursing into it so ancestors are
  // always present even when empty — needed for the folder tree, since a
  // freshly-created empty folder has no file to imply its existence).
  ipcMain.handle('project:listAssetFiles', async (_evt, { rootPath, assetsRoot }) => {
    const root = path.join(rootPath, assetsRoot)
    const files = []
    const folders = []
    function walk(dir) {
      if (!fs.existsSync(dir)) return
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        const rel = path.relative(root, full).replace(/\\/g, '/')
        if (entry.isDirectory()) {
          folders.push(rel)
          walk(full)
        } else {
          files.push(rel)
        }
      }
    }
    walk(root)
    return { files, folders }
  })

  // Lets the user create an (initially empty) subfolder ahead of importing
  // anything into it — same anti-traversal validation as the other
  // relative-path asset handlers.
  ipcMain.handle(
    'project:createAssetFolder',
    async (_evt, { rootPath, assetsRoot, folderPath }) => {
      const root = path.join(rootPath, assetsRoot)
      const rel = path.normalize(folderPath)
      if (rel.startsWith('..') || path.isAbsolute(rel)) {
        throw new Error('Chemin de dossier invalide.')
      }
      fs.mkdirSync(path.join(root, rel), { recursive: true })
      return true
    },
  )

  // Same anti-traversal validation as pickAsset — only ever called on a
  // path the renderer already confirmed is an orphan (see AssetsPanel.vue),
  // but the main process re-validates rather than trusting the renderer.
  ipcMain.handle('project:deleteAsset', async (_evt, { rootPath, assetsRoot, path: relPath }) => {
    const root = path.join(rootPath, assetsRoot)
    const rel = path.normalize(relPath)
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new Error("Chemin d'asset invalide.")
    }
    const target = path.join(root, rel)
    if (fs.existsSync(target)) fs.unlinkSync(target)
    return true
  })

  // Renderer has no fs access — project:checkAssets does the existence
  // check main-process-side for the "Valider le projet" feature, returning
  // just the subset of relative paths that don't exist on disk (the
  // renderer already has the referencing-location labels for each).
  ipcMain.handle('project:checkAssets', async (_evt, { rootPath, assetsRoot, paths }) => {
    return paths.filter((p) => !fs.existsSync(path.join(rootPath, assetsRoot, p)))
  })
}
