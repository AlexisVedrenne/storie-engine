# Stories Engine — inventaire des fonctionnalités

Éditeur + moteur pour créer des jeux narratifs où le joueur vit l'histoire à
travers un faux smartphone (SMS, réseau social façon Instagram, appels,
galerie, réglages), exportables en `.exe` Windows autonome.

Snapshot établi par exploration du code le 2026-07-29, mis à jour le
2026-07-31 (catalogue de flags, libellés/duplication sur le graphe de
chapitres, drag/groupement des entrées de timeline, traduction anglais de
l'éditeur), puis le 2026-08-18 (apps modulaires + système d'événements,
Interactions, Apps custom, app Journal, refonte Email, 3 nouveaux types
d'entrée, message supprimable, id de chapitre stable, aperçu web LAN,
sauvegarde cloud rclone) — à mettre à jour si une fonctionnalité majeure
change de forme.

---

## 1. L'éditeur — structure du projet

### Graphe de chapitres

- Chapitres = nœuds déplaçables sur un canvas (Vue Flow), reliés par des
  flèches **authored** (`chapter.next[].to`) — glisser depuis le port droit
  d'un chapitre vers le port gauche d'un autre crée le lien. Rien n'est
  déduit automatiquement.
- **Clic droit sur le canvas** → crée un nouveau chapitre pile sous la
  souris, sans dialogue ni navigation dedans.
- Chaque flèche peut porter une **condition** (mêmes règles que partout
  ailleurs, voir §2) et un **libellé optionnel** (affiché à la place de la
  condition sur le graphe ; vide = comportement inchangé) — un chapitre
  teste ses flèches sortantes dans l'ordre et prend la première dont la
  condition passe. Zéro flèche sortante = fin (badge "FIN", bordure en
  pointillés).
- **Dupliquer un chapitre** (bouton sur chaque nœud) : copie profonde
  (timeline + flèches sortantes avec conditions/libellés), position
  décalée, ouvre direct dessus.
- Position des nœuds sans position explicite : layout automatique (dagre)
  isolé, pour ne jamais gêner un placement manuel déjà fait ailleurs.
- Point d'entrée (`entryChapterId`) : sélecteur dédié dans l'onglet Jeu
  (`GameForm.vue`) — n'est plus figé à la création du projet.
- **Renommer le titre d'un chapitre régénère son id** (slug dérivé du
  titre) et met à jour en cascade toutes les références : `next[].to` des
  autres chapitres, le bucket i18n du chapitre, `entryChapterId` si c'était
  le chapitre de départ.
- "Prévisualiser depuis ce chapitre" sur chaque nœud : lance l'aperçu direct
  à cet endroit (remplit un joueur/couleur/langue factices si besoin).

### 14 types d'entrées de timeline

Chaque type a son propre formulaire d'édition, avec sélecteur type
icône+description :

| Type           | Ce qui se passe pour le joueur                                                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `message`      | SMS reçu — délai de frappe proportionnel au texte, badge non-lu + notif (sauf conversation déjà ouverte), son, image jointe possible, `deleteAfter` optionnel (voir plus bas)   |
| `dm`           | Comme `message` mais dans un thread Pixly ; envoyé instantanément si `from: 'me'` ; même `deleteAfter` optionnel                                                                |
| `post`         | Publication Pixly (n'importe quel contact ou `me`), instantané, pas de notif                                                                                                     |
| `reel`         | Reel Pixly (média + légende + musique)                                                                                                                                            |
| `story`        | Story Pixly (média ou emoji sur fond coloré)                                                                                                                                      |
| `photo`        | Photo reçue → atterrit dans la Galerie (et devient matière première pour les posts du joueur)                                                                                    |
| `choice`       | Prompt + options (chacune avec ses propres `requires`/`effects`/`then`) ; bloque la timeline jusqu'au choix ; le texte choisi part comme réponse du joueur                       |
| `call`         | Appel entrant scripté (répliques ligne par ligne), sonnerie, bloque jusqu'à décroché/raccroché/refusé                                                                            |
| `timeskip`     | Ellipse narrative : verrouille le téléphone, fondu au noir, avance heure/date/batterie, bloquant ou non ; peut aussi atterrir direct sur une app+conversation (voir §3)          |
| `effect`       | Entrée invisible qui ne fait qu'appliquer des effets (flags, état du téléphone…)                                                                                                  |
| `hallucination`| Fausse conversation non-interactive + glitch visuel (vfx) — le joueur regarde seulement, jamais d'écriture dans un vrai thread                                                   |
| `fakeTyping`   | Bulle "en train d'écrire" (SMS ou DM) réelle, sans message qui suit — juste pour l'inquiétude/le suspense                                                                         |
| `pause`        | Silence pur, contrôlé par l'auteur (`duration`), rien ne se passe à l'écran                                                                                                       |
| `interaction`  | Déclenche un geste téléphone authored (voir §3 Interactions) — bloquant ou parallèle selon `entry.blocking`                                                                       |

Plus, injectées dynamiquement par le système d'apps custom (§5) : `appDm`
(message dans une conversation d'app custom) et un `choice` scopé à une app
via son champ `app`.

**Message supprimable** — `entry.deleteAfter` (ms) sur `message`/`dm` : la
bulle se transforme en placeholder « message supprimé » une fois affichée le
temps donné, tap dessus pour révéler/masquer le texte original (jamais côté
`from: 'me'`).

Toute entrée (et toute option de choix) peut porter un `requires` optionnel —
si la condition échoue, l'entrée est silencieusement sautée.

Entrées réordonnables par glisser-déposer (ligne d'insertion visible en
temps réel) en plus des boutons monter/descendre. Regroupables en accordion
(sélection multiple d'entrées adjacentes → "Grouper") pour la lisibilité
d'une longue timeline — pure métadonnée d'auteur (`entry.group`), le moteur
l'ignore, la timeline reste strictement plate à l'exécution.

---

## 2. Conditions & Effets

### Conditions (`RequiresBuilder`, réutilisé sur flèches/entrées/options/blocs d'app)

- **Flags** : vrai/faux, exactement N, au moins N, au plus N, entre N et M.
  Autocomplete sur tous les flags déjà utilisés dans le projet, ou saisie
  libre pour en créer un nouveau.
- **Abonnement Pixly** : le joueur suit / ne suit pas tel contact en ce
  moment (signal vivant, pas une valeur stockée).
- **Flag collection** (voir plus bas) : taille de la collection (exactement/
  au moins/au plus/entre) et/ou présence d'une clé — les deux cochables
  ensemble sur une même ligne, pas un mode exclusif.
- Pas de condition de date/heure, pas de hasard, pas de "déjà vu" — que ça.
  Toutes les conditions d'un même `requires` sont en ET.

**Catalogue de flags** (dialogue accessible depuis l'édition d'un
chapitre, bouton drapeau) : liste tous les flags du projet avec libellé
optionnel, type (booléen/numérique/collection), nombre d'usages et
emplacements (dépliables). Pour un flag numérique, affiche le min/max
réellement atteignable en jouant l'histoire (vraie traversée du graphe de
chapitres + branches de choix, pas juste les deltas tapés un par un) —
signale aussi les flags lus par une condition mais jamais modifiés par un
effet nulle part (bug d'auteur probable). Libellés orphelins (flag
renommé/supprimé) supprimables individuellement ou en masse.

### Effets (`EffectsBuilder`)

- **Flags** : additionner/soustraire un nombre (cumulatif), ou fixer
  vrai/faux (idempotent — pas cumulatif).
- **Widget météo** (ville, température, condition, emoji, légende),
  **widget pas** (compteur + objectif), **batterie** (valeur directe),
  **réseau** (barres signal + wifi), **horloge/date** (fixer / relâcher
  vers l'heure réelle) — tous purement décoratifs pour donner vie à
  l'écran d'accueil, indépendamment configurables.
- **Deltas sociaux Pixly** : followers/following d'un contact.
- **Nouveaux followers** : un ou plusieurs contacts se mettent à suivre le
  compte du joueur (notif + son dédiés). Pas d'effet "unfollow" côté
  auteur — seul le joueur peut se désabonner lui-même.
- **Flag collection** : ajouter/retirer un élément clé→valeur (texte ou
  nombre) d'une collection — voir plus bas.

### Flags collection — 3ᵉ type de flag (clé → valeur, pas juste un nombre)

Pour des besoins type historique/relevé de compte/inventaire : un flag
« collection » est un objet `{clé: valeur}` (`story.flagCollections`),
séparé des flags numériques classiques (qui restent lisibles/écrivables
partout ailleurs sous forme de nombre — rien de mélangé). Deux opérations
seulement (`add`/`remove`), deux types de valeur (texte/nombre) — pas un
moteur de script libre. Clé auto-générée si non renseignée à l'ajout (cas
courant pour un historique qui s'empile). Alimentable depuis n'importe où
où `effects` marche déjà (entrée, option de choix, interaction, event,
bouton d'app custom). Affichable via le bloc `list` d'une app custom (§5),
qui peut lire soit les contacts du projet soit une collection.

---

## 3. Interactions — gestes téléphone authored par l'auteur

Moments narratifs où le joueur interagit physiquement avec le téléphone
(brancher un câble, essuyer la poussière, taper un code) — pas des
mini-jeux pré-codés, un vocabulaire de gestes génériques que l'auteur
compose lui-même dans un nouvel onglet **Interactions**.

- **7 primitives de step** (bornées, pas de canevas libre) : `tap`, `hold`,
  `swipe`, `drag`, `wipe`, `code` (clavier numérique), `wait` (délai pur).
  Chaque step porte texte/icône/image et un délai limite optionnel.
- **Zones** : grille 3×3 + `anywhere`, même picker en édition et en jeu.
- **Bloquant ou parallèle**, au choix par entrée `interaction` — bloquant
  fonctionne comme `choice`/`call` (met la timeline en pause) ; parallèle
  laisse la timeline continuer, le résultat (gagné/perdu) ne remonte que
  via des branches `onWin`/`onLose` dédiées (mêmes `effects`/`then` qu'une
  option de choix).
- Une entrée référence une interaction par id (créée une fois, réutilisable
  à plusieurs endroits de l'histoire).

---

## 4. Apps custom — créateur d'applications no-code

Créer une nouvelle app téléphone (comme Messages/Pixly/Journal) sans coder
de composant Vue — un catalogue de **blocs visuels bornés**, éditables dans
un nouvel onglet **Apps**, avec aperçu téléphone live (chaque modif de bloc
s'affiche immédiatement, sans bouton ni rechargement).

### Catalogue de blocs

`header`, `text`, `image`, `avatar`, `row` (icône+label+chevron), `card`
(conteneur avec fond visuel), `layout` (conteneur flex sans fond, ligne ou
colonne), `badge`, `divider`, `button`, `tabs` (change l'écran actif de
l'app), `list` (répète un sous-arbre de blocs — voir plus bas),
`conversations` (module de chat complet — voir plus bas).

- **Drag & drop** entre conteneurs (pas juste réordonner sur place),
  dupliquer un bloc, presets pré-assemblés (en-tête profil, ligne de
  stats…), fond d'écran par écran, styles étendus (couleurs, rayon,
  espacement) sur les blocs existants.
- **Condition d'affichage par bloc** (`requires`, mêmes règles que §2) —
  un bloc dont la condition échoue est absent, pas juste masqué en CSS.
- **Interpolation de variables** dans le texte : `{flag:clé}`, tokens fixes
  (`{playerName}`, `{battery}`, `{steps}`, `{stepsGoal}`, `{weather}`), plus
  `{item:...}` à l'intérieur d'un bloc `list` (nom/pseudo/followers/couleur
  du contact, ou clé/valeur d'un item de collection). Bouton "Variable" à
  côté de chaque champ concerné, même contrat que le sélecteur d'emoji.
- **Bloc `list`** : répète un template de blocs une fois par contact
  (filtrable "seulement les suivis") ou par élément d'une collection de
  flag — première brique vraiment dynamique (nombre de rendus variable).
- **Bloc `conversations`** : vrai module de chat (liste de discussions +
  fil + réponses par choix), réutilise entièrement le moteur DM Pixly natif
  (thread 1:1/groupe défini dans l'onglet Groupes, historique isolé par
  app). Entrée timeline `appDm` + `choice` scopé à une app pour scripter
  les réponses reçues dans une conversation d'app custom.
- **Bouton `button`** : deux actions possibles — appliquer des effets, ou
  naviguer vers un autre écran de l'app (rien pour l'instant qui déclenche
  une entrée de timeline précise).
- **Icon picker** (icônes Material) sur tous les champs icône du projet,
  pas seulement les apps custom.
- **Traduction** : le texte des blocs passe par le même bucket i18n
  "commun" que les noms/bios de contacts.

### Stockage et export

Une app = un fichier `apps/<id>.json` — JSON pur (pas exécuté), pensé pour
être exporté/partagé en `.zip` (données + assets référencés) et importé
dans un autre projet (assets renommés sous `assets/imported/<id>/`, id
dé-collidé si besoin).

### `timeskip` → atterrir direct sur une app (+ conversation)

Une entrée `timeskip` peut désigner une app d'atterrissage (`landApp`, une
app codée en dur ou custom) et, si l'app le permet, une conversation
précise à ouvrir (`landThread`) — l'écran verrouillé est alors
**entièrement sauté**, le joueur atterrit directement dessus, déjà
déverrouillé, prévenu par un toast plutôt que le bandeau habituel du lock
screen.

---

## 5. Apps modulaires & système d'événements

### Catalogue d'apps activable

Chaque app (historique ou custom) est togglable par projet dans l'onglet
Jeu (`game.disabledApps`) — une app désactivée disparaît de l'accueil et
du menu "Ajouter une entrée" ; les entrées déjà présentes qui la
référencent sont sautées silencieusement à l'exécution (jamais supprimées
du fichier). Les apps historiques et custom vivent dans le même registre
fusionné.

### Nouveaux types d'entrée en plug-in

Un contributeur peut ajouter un type d'entrée de timeline scriptable sans
toucher au moteur central (contrat fixe : type/app/icône/label/aide/
formulaire/entrée par défaut/traitement/extraction de texte/références).
L'app **Email** (§6) en est la preuve : construite uniquement via ce
contrat.

### Événements (`game.events`)

Réactions déclenchées par une action du joueur plutôt que par une entrée de
timeline classique — même trio condition/effets/timeline (`RequiresBuilder`/
`EffectsBuilder`/`TimelineEditor`, réutilisés tels quels) qu'une option de
choix, éditable dans l'onglet **Events**.

- **Triggers** groupés par app dans le menu d'ajout ("Commun" en premier,
  puis un groupe par app) : `app.opened`/`app.closed` (avec seuil de délai
  minimum), `photo.viewed`, `post.liked` (par auteur), `contact.followed`,
  `profile.opened`, `conversation.opened`, plus les triggers propres à une
  app plug-in.
- Chaque event peut avoir plusieurs filtres de correspondance combinés (ET),
  un titre optionnel pour s'y retrouver dans la liste.
- Une réaction d'event bloquante (choix/appel) et un choix/appel déjà en
  attente sur la timeline principale peuvent coexister sans s'écraser (file
  d'attente interne) — limite connue : garder les réactions d'event non
  bloquantes reste le cas le mieux supporté.

---

## 6. Le téléphone du joueur — 7 apps + coquille

### Messages (SMS)

Liste de conversations (recherche, non-lus), thread avec bulles
gauche/droite, images jointes, animation "en train d'écrire". Pas de champ
de saisie libre — le joueur ne "parle" que via les choix scriptés.

### Pixly (réseau social façon Instagram)

- **Fil** : posts des contacts suivis + les siens, like/commentaire
  fonctionnels (partage/enregistrer décoratifs).
- **Stories** : anneaux vu/pas-vu, viewer plein écran avec barres de
  progression auto-avance.
- **Découvrir** : recherche de contacts + grille décorative sans effet
  narratif.
- **Reels** : scroll vertical plein écran, mêmes mécaniques like/commentaire.
- **Créer un post** : wizard en 5 étapes (choix photo depuis la Galerie du
  joueur → crop décoratif → filtre parmi 5 → réglages luminosité/contraste/
  saturation → légende) — seule façon pour le joueur de publier du contenu.
- **Profil** : stats (followers/following/posts), bio, suivre/ne plus
  suivre, grille mixant posts + photos envoyées par ce contact.
- **Commentaires** : liste en lecture seule (ajout désactivé).
- **DM** : boîte séparée des SMS, 1:1 (implicite, sans entrée `threads.js`)
  ou groupe.
- **Suivre** : bascule joueur, ne filtre que le Fil (pas le profil).
- **Likes** : identique posts/reels, persisté, son + animation cœur.

### Galerie

Grille 3 colonnes en lecture seule de toutes les photos reçues, viewer
plein écran. Pas de prise de photo — uniquement réception. Ce pool nourrit
le wizard "Créer un post".

### Appels

Onglets Récents (log, manqué/répondu) / Contacts (uniquement ceux ayant
déjà envoyé un vrai SMS). Le joueur ne peut jamais appeler lui-même — appel
toujours entrant, déclenché par une entrée `call`. Écran d'appel entrant
avec vibration du téléphone + sonnerie en boucle. Une fois décroché :
script ligne par ligne, tap pour avancer.

### Email (app plug-in — refonte)

Boîte de réception à plat, façon Gmail (pas un thread par expéditeur comme
au premier jet). L'expéditeur est du **texte libre** (`fromEmail`/
`fromName`), plus rattaché à un contact du projet — un email peut venir de
n'importe qui, y compris quelqu'un qui n'existe nulle part ailleurs dans le
projet.

### Journal (app native — nouvelle)

Deux onglets :

- **Progression** : rail vertical façon timeline des chapitres traversés,
  position actuelle marquée, point d'embranchement affiché dès qu'un
  chapitre a plusieurs arêtes sortantes possibles ("chemin(s) non
  exploré(s)"), fin de branche signalée si atteinte.
- **Flags** : liste des flags qui ont un libellé auteur (`game.flags[key].label`)
  — booléens affichés "débloqué", numériques affichés avec leur valeur.
  Flags sans libellé jamais montrés (mécanisme interne, pas pour le joueur).

### Réglages

- **Fonctionnel** : son (on/off + volume), langue, batterie (réelle, pilotable
  par effet), réinitialiser le téléphone (efface toute la progression, garde
  le projet chargé, relance boot + wizard).
- **Décoratif** : wifi/données/bluetooth/notifs/luminosité, stockage
  factice, à propos (modèle/OS/n° série faux mais stables).

### Coquille du téléphone

- Cadre 9:18, mode `large` pour l'aperçu plein écran de l'éditeur.
- Séquence de démarrage : Boot → Setup Wizard (langue → bienvenue → nom →
  faux code PIN → faux wifi → faux sync des comptes → couleur d'accent →
  fin) → écran verrouillé.
- Écran verrouillé : titre du jeu en filigrane, heure/date, notifs
  empilées, bannière time-skip — sauté entièrement si l'entrée `timeskip`
  a un `landApp` (§4).
- Accueil : fond d'écran perso ou dégradé animé, widgets (météo, calendrier
  réel, pas, musique factice), grille des apps activées avec badges
  non-lus.
- Dérive "vivante" : toutes les ~3 messages, l'horloge avance d'1 min ;
  toutes les ~5, la batterie perd 2% — sauf si un effet vient de fixer
  ces valeurs explicitement.

---

## 7. i18n / localisation

Deux systèmes i18n distincts et indépendants — changer l'un ne change
jamais l'autre.

### Langue du jeu (contenu narratif + chrome du téléphone)

- Langues d'interface intégrées : français (défaut) + anglais. Le contenu
  narratif peut avoir des dictionnaires pour n'importe quel code de langue
  en plus.
- Le français est toujours la source canonique ; chaque traduction est un
  dictionnaire `{texte français: traduction}` par langue × "bucket"
  (commun, ou par chapitre — le texte des blocs d'app custom vit dans le
  bucket commun, comme les noms de contacts).
- Éditeur de traduction : recherche, masquer déjà traduit, regroupement par
  origine pour le bucket commun, détection des clés orphelines (traductions
  qui ne correspondent plus à rien), bouton emoji sur chaque champ.
- Changement de langue en jeu : à tout moment depuis Réglages, sans reset.
  Fallback gracieux vers le français si non traduit.

### Langue de l'éditeur lui-même (français + anglais)

- Système séparé (`src/editor/i18n/`) pour les labels/tooltips/dialogues de
  l'éditeur — switcher FR/EN dans le topbar, persisté, sans effet sur la
  langue du jeu testé dans l'aperçu.
- Jamais copié dans le jeu exporté (dossier `src/editor/`, exclu du build) —
  toutes les ~8700 lignes de composants éditeur traduites, dictionnaires
  fr-FR/en-US vérifiés à parité exacte.
- Les labels de triggers (`triggers.js`) et de types d'entrée plug-in (une
  app tierce comme Email) sont aussi traduisibles via une couche de
  surcharge (`sharedOverrides.js`) qui ne touche pas ces fichiers
  eux-mêmes (ils sont partagés avec le jeu exporté) — dictionnaire en
  priorité, texte d'origine en repli sinon.

## 8. Assets & sons

- Tout dans `assets/`, référencé par chemin relatif. Import (copie externe)
  ou parcourir (réutiliser existant) avec aperçu (image / lecteur audio
  inline).
- Suggestion automatique de sous-dossier par contact (`images/<id>/`).
- Arborescence + grille façon explorateur de fichiers, badge
  utilisé/orphelin, suppression restreinte aux fichiers orphelins
  (confirmation irréversible).
- **15 sons** nommés fixes (réception SMS, envoi SMS, réception DM, envoi
  social, sonnerie, décroché, raccroché, like, nouveau follower, tap story,
  partage post, boot, déverrouillage, notification, batterie faible) —
  chacun overridable par projet, sinon son par défaut du moteur.

## 9. Validation avant build

- Intégrité des références (contacts/threads introuvables → erreur précise
  avec localisation).
- `entryChapterId` et tous les `next[].to` doivent pointer vers un vrai
  chapitre (erreur sinon).
- Accessibilité : BFS depuis le chapitre d'entrée, chapitre jamais atteint
  = avertissement.
- Chapitre dont toutes les flèches sortantes sont conditionnelles sans
  aucune de secours (risque de fin silencieuse) = avertissement. Flèche
  dont la condition est un doublon exact d'une flèche précédente du même
  chapitre (ne sera jamais empruntée) = avertissement.
- Fichiers d'assets manquants sur disque = erreur.
- Erreurs bloquent le build ; avertissements demandent confirmation.

## 10. Build / export

- Assemblage d'un shell temporaire : template `game-shell` + copie fraîche
  du moteur de l'éditeur (jamais de duplication manuelle) + données du
  projet + assets → `pnpm install` + `quasar build -m electron` (desktop)
  et/ou export Android (voir plus bas).
- Icône `.exe` personnalisable (`.ico` recommandé), nom/version du build
  pris du projet.
- **Assistant de build en 3 étapes** : version (aucun/patch/mineure/
  majeure, écrit immédiatement dans `project.json`) → cibles de
  distribution (desktop et/ou Android, cases à cocher) → progression.
- **Export Android** (APK) : toolchain JDK/SDK téléchargée à la demande
  (barre de progression dédiée, une fois par machine, même patron que
  rclone pour le cloud sync), scaffold Capacitor, packagée depuis le même
  projet — pas un second pipeline à maintenir.
- Sortie copiée vers un dossier choisi par l'auteur, nettoyage du dossier
  temporaire avec retry (verrous Windows transitoires).
- **Sauvegarde locale** dans le jeu exporté : `save.json` dans
  `%APPDATA%/<nom du jeu>/`, tout l'état persiste sauf le transitoire
  (choix en cours, notifs, appel en attente…).

## 11. Aperçu web (téléphone réel sur le même Wi-Fi)

Sert le projet ouvert comme une vraie page web sur le réseau local — même
assemblage de shell temporaire que le build, mais `quasar dev` (serveur
persistant) au lieu de `quasar build` (export figé) : un téléphone sur le
même Wi-Fi ouvre l'URL dans son navigateur, test tactile bien plus honnête
que la fenêtre desktop Electron. Un seul aperçu web actif à la fois —
en démarrer un nouveau arrête silencieusement l'ancien ; fermer le
dialogue dédié arrête toujours le serveur. Aucune dépendance externe
requise sur la machine (Node/pnpm vendorés avec l'éditeur).

## 12. Sauvegarde cloud (rclone)

Pousser/restaurer un projet entier (chapitres, contacts, assets, apps…)
vers un espace cloud personnel de l'auteur — pas un service maison, pas de
SDK par fournisseur : **rclone** comme unique couche d'intégration (70+
fournisseurs, dont Google Drive/OneDrive/Dropbox en un clic, OAuth géré par
rclone lui-même), piloté en local via son démon HTTP/JSON.

- Push/pull manuels explicites (pas de synchro automatique bidirectionnelle
  en continu), plus un toggle optionnel de sauvegarde auto silencieuse
  toutes les 5 minutes.
- Un seul compte connecté à la fois ; déconnexion en 2 temps (déconnecter,
  puis choisir séparément si les données distantes doivent être purgées).
- État de dernière synchro partagé entre machines (`cloudsync.json`, écrit
  dans le projet à chaque push) — utile pour reprendre un projet sur un
  autre poste.
- **Charger un projet depuis le cloud** directement depuis l'écran
  d'accueil (avant tout projet ouvert) : connecter un compte, lister les
  projets déjà poussés, en télécharger un vers un nouveau dossier local.
- Outil réservé à l'éditeur — jamais copié dans le jeu exporté.

## 13. Autres

- **Sélecteur d'emoji** : bouton sur quasiment tous les champs de texte
  libre de l'éditeur — onglets par catégorie, récents, recherche par
  mot-clé insensible aux accents, insertion à la position du curseur.
- **Sélecteur d'icône** (Material) : même contrat sur tous les champs
  d'icône du projet (blocs d'app, interactions, icône d'app custom…).
- **Modèle de contact** : id, nom, couleur, bio Pixly, avatar
  Messages/Appels séparé de l'avatar Pixly, `hasSocial` (exclure du
  réseau social), pseudo, followers/following de départ,
  `followedByDefault`.
- **Modèle de thread** : seuls les threads de groupe ont besoin d'une
  entrée explicite ; `me` toujours participant, non retirable.
- **Contenu "seed"** : 5 buckets (messages, dms, posts, reels, photos)
  injectés une fois en début de partie (offset "il y a N jours"),
  contournant complètement notifs/dérive d'horloge — c'est du passif.
- **UX éditeur** : aperçu plein écran, autosave, Ctrl/Cmd+S, indicateur
  non-sauvegardé, "relancer l'aperçu", historique undo/redo global
  (Ctrl+Z/Ctrl+Maj+Z, traverse tous les onglets, navigue automatiquement
  vers la ressource concernée).
- **Recherche globale** (Ctrl+K) : cherche un mot-clé à travers tout le
  projet — titres/texte de chapitre, contacts, groupes, apps custom
  (label + texte des blocs), events, interactions, flags (clé ou libellé).
  Clic sur un résultat navigue vers la bonne ressource ; granularité =
  chapitre/app/liste entière, pas une entrée précise à l'intérieur (limite
  assumée, cohérente avec la portée de la navigation existante). Cherche
  uniquement le texte source français, pas les traductions par langue.
