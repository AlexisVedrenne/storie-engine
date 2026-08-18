# Stories Engine — graphe de chapitres authored (flèches = décisions du moteur)

## Statut : implémenté

Ce doc remplace `docs/routes-and-branching.md` d'une session précédente
(le système "routes", conservé un temps, a été entièrement supprimé — voir
"Ce qui a été supprimé" en bas, pour qu'une future session ne le
réintroduise pas en le retrouvant dans l'historique git).

## Pourquoi ce chantier a changé de forme

Deux refontes précédentes du graphe de chapitres (routes plates + pastille,
puis routes en arborescence + explorateur façon dossiers, puis graphe à
noeuds avec `option.route` décoratif) restaient toutes **auto-déduites** :
les flèches venaient d'une adjacence implicite (`chapterOrder` + tag de
route sur un choix), jamais d'une décision explicite de l'auteur. Retour
utilisateur : "visuellement c'est pas du tout ça" — le besoin était un vrai
flowchart où on pose des noeuds-chapitres et on les relie soi-même par des
flèches pour dire "ce chapitre mène à celui-là".

## Modèle de données

Chapitre (`chapters/<id>.js`) :

```js
export default {
  id: 'chapter1',
  title: '...',
  timeline: [...],
  next: [                    // arêtes sortantes, authored dans le graphe
    { to: 'chapter2', requires: { flags: { erwanPath: true } } },
    { to: 'chapter3', requires: { flags: { momTrust: 1 } } },
  ],
  position: { x: 120, y: 80 }, // position du noeud, persistée
}
```

- Un chapitre n'a plus ni `route`, ni `requires` propre. Une option de choix
  n'a plus de `route` non plus — elle ne fait que ce qu'elle fait déjà
  (`effects`/`then`), typiquement poser un flag.
- `requires` sur une arête réutilise le shape existant partout ailleurs
  (`{flags?, following?}`), évalué par `checkConditions()` (inchangé).
- `entryChapterId` (dans `project.json`) reste le seul champ qui dit où
  l'histoire démarre. `chapterOrder` n'existe plus — aucune notion d'"ordre
  de lecture" globale, le fichier `chapters/` est juste un tas de fichiers.

## Comportement du moteur (`story.js`)

`advance()`, en fin de chapitre, prend la **première arête sortante dont le
`requires` passe**, dans l'ordre de `chapter.next` :

```js
for (const edge of chapter.next || []) {
  if (this.checkConditions(edge.requires)) {
    this.startChapter(edge.to)
    return
  }
}
this.save() // aucune arête ne passe (ou aucune arête) → l'histoire s'arrête ici
```

- Une arête sans `requires` est toujours prise si c'est la seule sortante.
- Un chapitre avec `next` vide (ou dont aucune arête ne passe) est une vraie
  fin — pas de scan de secours, pas de fallback sur un ordre de fichier.
- L'accessibilité d'un chapitre est un **chemin d'arêtes parcouru**, pas une
  propriété du chapitre cible : un chapitre posé dans la branche "B" reste
  inatteignable pour un joueur passé par la branche "A", même si son `next`
  à lui n'a pas de condition — encore faut-il qu'une arête EMPRUNTÉE y mène.
- Le branchement se décide entièrement **en fin de chapitre**, pas au
  moment du choix : une option pose un flag (via `effects`), la décision se
  prend une fois toute la timeline du chapitre jouée.

## UX éditeur (`ChapterGraph.vue`)

- Glisser depuis le côté droit d'un noeud (poignée source) vers le côté
  gauche d'un autre (poignée cible) crée l'arête — pousse `{ to }` dans
  `next` du chapitre source, persiste immédiatement.
- Glisser un noeud le déplace ; sa position (`chapter.position`) est
  persistée au relâchement.
- Cliquer une flèche ouvre un petit dialogue avec le `RequiresBuilder`
  habituel pour lui poser/retirer une condition, plus un bouton pour
  supprimer l'arête.
- Supprimer un chapitre nettoie aussi, sur tous les autres chapitres, toute
  arête qui pointait vers lui (pas de flèche pendante laissée derrière).
- Un chapitre sans `position` encore authored (jamais glissé — vieux
  fichier, ou import) reçoit une position de secours calculée par dagre
  (layout en couches), placée sous les chapitres déjà positionnés pour ne
  jamais les chevaucher. Dès qu'on le glisse une fois, sa position devient
  authored et dagre ne le retouche plus.

## Ce qui a été supprimé

Le système "routes" (routes.js, `chapter.route`, `option.route`,
`RoutePickerField.vue`, `useRouteOptions.js`, `src/engine/routing.js`,
`chapterOrder` dans `project.json`, les IPC `reorderChapters`/`saveRoutes`)
a été entièrement retiré — les arêtes authored remplacent tout ce qu'il
faisait (organisation visuelle ET branchement réel). Un projet plus ancien
qui a encore `route`/`option.route`/`chapter.requires`/`chapterOrder` dans
ses fichiers doit être migré à la main vers `next`/`position` (voir la
migration du fixture démo, commit correspondant, comme référence).

## Limites connues

- Pas de détection de cycle sur `next` — un cycle est juste une histoire qui
  boucle, pas un bug moteur (contrairement à l'ancien arbre `routes.js`, où
  un cycle cassait un parcours récursif). Reste à la charge de l'auteur si
  ce n'est pas voulu.
- La validation (`validateProject.js`) vérifie que chaque `next[].to` existe
  et avertit sur les chapitres inatteignables depuis `entryChapterId`
  (BFS). **Depuis 2026-08-18**, avertit aussi (pas une erreur — aucun des
  deux cas ne PROUVE un vrai bug) : un chapitre dont TOUTES les flèches
  sortantes sont conditionnelles sans aucune de secours (risque de fin
  silencieuse si aucune condition ne passe en jeu), et une flèche dont la
  condition est un doublon exact d'une flèche précédente du même chapitre
  (ne sera jamais empruntée, la première qui correspond gagne). Reste non
  détecté, volontairement : deux conditions différentes mais mutuellement
  exclusives par construction (ex. `flag >= 5` et `flag < 3` côte à côte
  sans troisième branche) — prouver l'exhaustivité logique de conditions
  arbitraires est hors de portée d'un simple linter statique.
