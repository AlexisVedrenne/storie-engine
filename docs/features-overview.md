# Storie Engine — inventaire des fonctionnalités

Éditeur + moteur pour créer des jeux narratifs où le joueur vit l'histoire à
travers un faux smartphone (SMS, réseau social façon Instagram, appels,
galerie, réglages), exportables en `.exe` Windows autonome.

Snapshot établi par exploration du code le 2026-07-29 — à mettre à jour si
une fonctionnalité majeure change de forme.

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
  ailleurs, voir §2) — un chapitre teste ses flèches sortantes dans l'ordre
  et prend la première dont la condition passe. Zéro flèche sortante = fin
  (badge "FIN", bordure en pointillés).
- Position des nœuds sans position explicite : layout automatique (dagre)
  isolé, pour ne jamais gêner un placement manuel déjà fait ailleurs.
- Point d'entrée (`entryChapterId`) fixé à la création du projet — pas
  encore d'UI pour le changer après coup.
- "Prévisualiser depuis ce chapitre" sur chaque nœud : lance l'aperçu direct
  à cet endroit (remplit un joueur/couleur/langue factices si besoin).

### 10 types d'entrées de timeline
Chaque type a son propre formulaire d'édition, avec sélecteur type
icône+description :

| Type | Ce qui se passe pour le joueur |
|---|---|
| `message` | SMS reçu — délai de frappe proportionnel au texte, badge non-lu + notif (sauf conversation déjà ouverte), son, image jointe possible |
| `dm` | Comme `message` mais dans un thread Pixly ; envoyé instantanément si `from: 'me'` |
| `post` | Publication Pixly (n'importe quel contact ou `me`), instantané, pas de notif |
| `reel` | Reel Pixly (média + légende + musique) |
| `story` | Story Pixly (média ou emoji sur fond coloré) |
| `photo` | Photo reçue → atterrit dans la Galerie (et devient matière première pour les posts du joueur) |
| `choice` | Prompt + options (chacune avec ses propres `requires`/`effects`/`then`) ; bloque la timeline jusqu'au choix ; le texte choisi part comme réponse du joueur |
| `call` | Appel entrant scripté (répliques ligne par ligne), sonnerie, bloque jusqu'à décroché/raccroché/refusé |
| `timeskip` | Ellipse narrative : verrouille le téléphone, fondu au noir, avance heure/date/batterie, bloquant ou non (`blocking: false` = l'histoire continue derrière l'écran verrouillé) |
| `effect` | Entrée invisible qui ne fait qu'appliquer des effets (flags, état du téléphone…) |

Toute entrée (et toute option de choix) peut porter un `requires` optionnel —
si la condition échoue, l'entrée est silencieusement sautée.

---

## 2. Conditions & Effets

### Conditions (`RequiresBuilder`, réutilisé sur flèches/entrées/options)
- **Flags** : vrai/faux, exactement N, au moins N, au plus N, entre N et M.
  Autocomplete sur tous les flags déjà utilisés dans le projet, ou saisie
  libre pour en créer un nouveau.
- **Abonnement Pixly** : le joueur suit / ne suit pas tel contact en ce
  moment (signal vivant, pas une valeur stockée).
- Pas de condition de date/heure, pas de hasard, pas de "déjà vu" — que ça.
  Toutes les conditions d'un même `requires` sont en ET.

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

---

## 3. Le téléphone du joueur — 5 apps + coquille

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
  empilées, bannière time-skip.
- Accueil : fond d'écran perso ou dégradé animé, widgets (météo, calendrier
  réel, pas, musique factice), grille 5 apps avec badges non-lus.
- Dérive "vivante" : toutes les ~3 messages, l'horloge avance d'1 min ;
  toutes les ~5, la batterie perd 2% — sauf si un effet vient de fixer
  ces valeurs explicitement.

---

## 4. i18n / localisation
- Langues d'interface intégrées : français (défaut) + anglais. Le contenu
  narratif peut avoir des dictionnaires pour n'importe quel code de langue
  en plus.
- Le français est toujours la source canonique ; chaque traduction est un
  dictionnaire `{texte français: traduction}` par langue × "bucket"
  (commun, ou par chapitre).
- Éditeur de traduction : recherche, masquer déjà traduit, regroupement par
  origine pour le bucket commun, détection des clés orphelines (traductions
  qui ne correspondent plus à rien), bouton emoji sur chaque champ.
- Changement de langue en jeu : à tout moment depuis Réglages, sans reset.
  Fallback gracieux vers le français si non traduit.

## 5. Assets & sons
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

## 6. Validation avant build
- Intégrité des références (contacts/threads introuvables → erreur précise
  avec localisation).
- `entryChapterId` et tous les `next[].to` doivent pointer vers un vrai
  chapitre (erreur sinon).
- Accessibilité : BFS depuis le chapitre d'entrée, chapitre jamais atteint
  = avertissement.
- Fichiers d'assets manquants sur disque = erreur.
- Erreurs bloquent le build ; avertissements demandent confirmation.

## 7. Build / export
- Assemblage d'un shell temporaire : template `game-shell` + copie fraîche
  du moteur de l'éditeur (jamais de duplication manuelle) + données du
  projet + assets → `pnpm install` + `quasar build -m electron`.
- Icône `.exe` personnalisable (`.ico` recommandé), nom/version du build
  pris du projet.
- **Dialogue de version** à chaque build (aucun/patch/mineure/majeure),
  écrit immédiatement dans `project.json`.
- Sortie copiée vers un dossier choisi par l'auteur, nettoyage du dossier
  temporaire avec retry (verrous Windows transitoires).
- **Sauvegarde locale** dans le jeu exporté : `save.json` dans
  `%APPDATA%/<nom du jeu>/`, tout l'état persiste sauf le transitoire
  (choix en cours, notifs, appel en attente…).

## 8. Autres
- **Sélecteur d'emoji** : bouton sur quasiment tous les champs de texte
  libre de l'éditeur — onglets par catégorie, récents, recherche par
  mot-clé insensible aux accents, insertion à la position du curseur.
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
  non-sauvegardé, "relancer l'aperçu".
