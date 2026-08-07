# Stories Engine — personnalisation jeu/téléphone (Phase 5)

## Statut : implémentée, en attente de vérification manuelle Electron (voir plus bas)

## Contexte

Dernier point de backlog confirmé après la Phase 4 (a-e) : l'icône du build
du jeu exporté. L'investiguer a fait remonter 3 autres demandes de
personnalisation que l'utilisateur voulait regrouper dans le même chantier :
fond d'écran du téléphone, couleur d'interface, et sons d'interface
personnalisables. Aucun des 4 n'existait avant cette phase, au-delà d'un
simple champ `title` sur `game.js`.

Décisions actées :

- Couleur d'interface = **reskin complet** (migration de tout usage à rôle
  d'accent réel vers une variable partagée), pas juste boutons/toggles.
- Sons = **remplacement des 15 sons d'interface fixes existants**
  (notif/clic/sonnerie), pas un système de musique de fond/narrative
  (confirmé : rien n'existe pour ça, hors scope explicitement).
- Les 4 paramètres vivent dans l'onglet **Jeu** existant (suggestion de
  l'utilisateur) — `game.js`/`gameConfig` est un objet libre de schéma
  (aucune validation nulle part dans le pipeline load/save), donc les
  nouveaux champs ne cassent rien.

## Ce qui a été construit

- **Icône du build** — `src-electron/ipc/build.js` copie le fichier source (`game.icon`) vers `src-electron/electron-assets/icons/icon.<ext>` dans le shell assemblé — ce dossier n'existait pas du tout dans `templates/game-shell/`, donc l'`.exe` empaquetté récupérait silencieusement l'icône Electron par défaut. Un vrai `.ico` est nécessaire sous Windows pour l'icône du fichier `.exe` lui-même (pas de dépendance de conversion PNG→ICO ajoutée) ; un `.png` donne quand même l'icône de la fenêtre pendant l'exécution (`BrowserWindow`).
- **Fond d'écran** — `LockScreen.vue`/`HomeScreen.vue` affichent `game.wallpaper` à la place du dégradé+mesh par défaut, avec un voile de lisibilité par-dessus l'image. Chaque écran garde son propre petit ajout (le dégradé/mesh était déjà dupliqué entre les deux, pas mutualisé — choix cohérent de ne pas introduire une abstraction pour 2 fichiers).
- **Couleur d'interface** — nouvelle variable CSS `--phone-accent`, posée sur la racine de `PhoneShell.vue` et qui descend à tous les descendants. Les 4 endroits qui codaient en dur l'accent actuel (`#4c8bf5`) référencent maintenant la variable (avec ce même hex en repli). Volontairement pas touché : couleur batterie faible (statut, pas thème), couleurs des icônes d'app (branding par app), sélecteur de couleur du joueur (système narratif différent).
- **Sons** — `game.sounds` (map optionnelle par clé). `src/engine/utils/sound.js`'s `getAudio()` met désormais en cache par **URL résolue**, pas juste par nom — modifier un son dans l'onglet Jeu prend effet au prochain déclenchement sans code de réinitialisation séparé.
- `src/editor/components/GameForm.vue` — passe de 1 champ à 5 sections (`.panel`) : Titre, Icône du build, Fond d'écran, Couleur d'interface (repris du pattern pastille+hex de `ContactForm.vue`), Sons (15 lignes `AssetField`).
- **Testé en Node standalone** : logique de copie d'icône vérifiée contre un projet scratch (y compris le cas « pas d'icône définie » → no-op) ; résolution des sons personnalisés + règle de reconstruction du cache uniquement sur changement d'URL, vérifiées comme fonctions pures.

## Non vérifié (bloqué dans ce bac à sable, comme toutes les phases précédentes)

Pas d'affichage Electron possible ici. Tout ce qui touche le rendu visuel réel et le build packagé reste à vérifier via `pnpm run dev:electron`.

## Vérification manuelle à faire

1. Définir une couleur d'accent dans l'onglet Jeu → confirmer qu'elle se reflète en direct dans les 4 surfaces migrées, et que tout ce qui est hors scope (batterie, icônes d'app, sélecteur de couleur joueur) reste inchangé.
2. Définir un fond d'écran → confirmer qu'il s'affiche sur l'écran de verrouillage et l'accueil, mesh masqué ; le vider → confirmer le retour exact au rendu par défaut d'avant cette phase.
3. Remplacer un son (ex. `system-notification`) par un fichier audio du projet → déclencher une notification dans l'aperçu → confirmer que le nouveau son joue, pas le son par défaut.
4. Définir une icône de build (un vrai `.ico`, éventuellement un `.png` aussi) → Build → confirmer que l'`.exe` exporté affiche l'icône personnalisée dans l'Explorateur (`.ico`) et l'icône de la fenêtre en cours d'exécution (`.png`).
5. Laisser les 4 champs vides sur un projet qui en a déjà un (ex. le fixture) → confirmer zéro changement visuel/comportemental par rapport à avant cette phase.

## Feuille de route restante

Rien de plus n'a été demandé explicitement. Restent en attente (pas de Phase 6 définie) :

- Migration opportuniste des 10 formulaires d'entrée vers `useContactOptions()` — **fait** (voir commit `4709bd4`, hors scope de ce doc car réalisé juste avant la Phase 5).
- Système de musique de fond/narrative — explicitement hors scope de cette phase, à discuter si besoin plus tard.
- Extension future du catalogue `SUPPORTED_LOCALES` (langues d'interface du moteur) — chantier moteur séparé, mentionné dans `docs/phase4-plan.md`.
