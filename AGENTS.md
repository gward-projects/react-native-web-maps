# Instructions pour les agents

Ce dépôt est le fork Gward de
[`react-native-web-maps`](https://github.com/teovillanueva/react-native-web-maps) (implémentation
web, sur Google Maps, de l'API `react-native-maps`), réécrit sur
[`@vis.gl/react-google-maps`](https://github.com/visgl/react-google-maps) au lieu de
`@react-google-maps/api`. Il est maintenu sur
`gward-projects/react-native-web-maps` ; le dépôt d'origine n'est pas déclaré comme remote (`git
remote add upstream <url>` pour fusionner ses changements).

## Rôle et consommateur

Le seul consommateur est **gward-app**, qui installe ce fork depuis Git (commit épinglé dans son
`package.json`) et ne l'importe qu'à travers un module réservé au web.

Le point d'entrée (`main`) est `src/index.web.tsx` : `yarn typecheck` de gward-app compile donc les
sources de ce fork avec le tsconfig de l'app. Le fork n'est chargé que par l'export web. Un fork qui
passe ses propres contrôles doit donc aussi passer ceux de l'app.

## Règle principale

Appliquer les pratiques de gward-app : conventions, tsconfig, lint, tests et vérification. En cas de
doute, regarder comment gward-app fait et faire de même.

- **TypeScript partout** : pas de JavaScript lorsqu'il est simplement évitable, fichiers de
  configuration compris (`eslint.config.ts`).
- Les options du tsconfig sont communes aux trois forks (`react-native-country-codes-picker`,
  `react-native-date-picker`, `react-native-web-maps`), seuls les `types` diffèrent : options
  strictes de gward-app, plus `noUncheckedIndexedAccess`, `noImplicitReturns` et
  `allowUnreachableCode: false`. Les modifier dans les trois forks à la fois.
- Le code de la bibliothèque s'exécute sous React Native : le `tsconfig.json` racine ne charge pas
  les types Node, si bien qu'une API Node (`process`, `Buffer`…) y est refusée. Les tests et les
  scripts de contrôle, exécutés par Node, ont leur propre tsconfig (`tests/tsconfig.json`,
  `tools/checks/tsconfig.json`) qui étend le premier et ajoute `node` ; `yarn typecheck` vérifie
  les trois.
- Le champ `files` de `package.json` limite le paquet installé par gward-app au code de la
  bibliothèque : l'étendre lors de l'ajout d'un dossier de sources.
- Dépendances de développement : seulement celles qui servent, sans doublon dans le lockfile
  (`yarn dedupe --check` doit passer). Yarn les installe aussi lorsque gward-app installe le fork
  depuis Git.
- Versions : les forks suivent les dernières versions publiées (gward-app est mis à jour ensuite),
  sauf TypeScript, qui reste en 6.x tant qu'Expo et React Native ne prennent pas en charge
  TypeScript 7.
- Le code doit aussi compiler avec la version de React Native de gward-app, qui peut être en
  retard sur celle des forks : avant d'épingler un nouveau commit dans gward-app, vérifier
  `yarn typecheck` de l'app avec ce commit installé. Les forks comme l'app utilisent les types
  stricts de React Native (`types_generated`, par défaut depuis la 0.87).
- Ne pas profiter d'une tâche pour refactoriser ce qui n'est pas demandé ; chaque écart avec
  l'amont rend les fusions depuis l'amont plus difficiles.

## Commandes

| Commande | Usage |
| -------- | ----- |
| `yarn check` | garde complète, lancée par le pre-commit : lint et typecheck en parallèle, puis tests |
| `yarn lint` | ESLint bloquant (`--max-warnings=0`) |
| `yarn typecheck` | TypeScript bloquant |
| `yarn test` | suites `node:test` de `tests/` (`tools/checks/test.ts`) |
| `yarn setup-hooks` | installe le hook Husky : **à lancer une fois après chaque clone** |

Il n'y a volontairement pas de script `prepare` : pour une dépendance Git, Yarn exécute `prepare`
dans le fork à chaque installation de gward-app.

## Tests

Les tests vivent dans `tests/` et reflètent l'arborescence des sources (`src/`) : un fichier source
couvert a un seul fichier de test miroir, suffixé `.test.ts`. Ils s'exécutent avec `node --import
tsx --test`, sans bibliothèque de mock. Le lanceur échoue si `tests/` est absent ou vide.

Toute modification de code impose de passer en revue les tests des fichiers touchés : en ajouter, en
corriger ou en supprimer, comme dans
gward-app.

Hors d'atteinte en l'état : les composants (`src/components/`) et `src/hooks/use-user-location.tsx`
(rendu React, `google.maps` et `expo-location`), ainsi que `createMarkerPressEvent` qui exige le
global `google`. `toGoogleMouseEvent` est testé avec un faux `google.maps.LatLng`.

## Fichiers copiés de gward-app

Ces fichiers sont des copies d'outils de gward-app : quand l'original change, mettre à jour les
trois forks. La correspondance avec les originaux est tenue dans gward-app (vérification des
écarts entre dépôts).

- `tools/eslint/sortImportsByFirstName.ts` (convertie en TypeScript) et son test ;
- `tools/checks/staticChecks.ts` et son test ;
- `tools/checks/check.ts` et `tools/checks/test.ts`, réduits à ce qu'un fork contrôle ;
- `.husky/pre-commit` ;
- les règles d'`eslint.config.ts`, sans les restrictions d'imports propres à l'app.

`eslint.config.ts` ajoute un `pathGroups` qui range les paquets `react-native*` parmi les
bibliothèques : la configuration Expo les ignore lors de la résolution, ce qui classait leurs
imports de types avec les modules du projet.

## Écarts avec l'amont

- outillage de gward-app ajouté : lint, tests `node:test`, `yarn check`, pre-commit, Dependabot,
  documentation agents (`AGENTS.md`, `JOURNAL.md`) ; champ `files` limité au code de la
  bibliothèque ;
- TypeScript strict (tsconfig commun aux forks) ; supercluster 9 fournit ses propres types
  (`@types/supercluster` retiré) ;
- `docs/` (site Docusaurus), `babel.config.js`, `tsconfig.build.json` et
  `react-native-builder-bob` ont été supprimés ;
- dépendances des hooks corrigées (voir le journal du 17 octobre 2026) ;
- **`@vis.gl/react-google-maps`** remplace `@react-google-maps/api` (journal du 18 octobre 2026) :
  `APIProvider` et `Map` dans `map-view.tsx`, `useMap` dans les marqueurs et callouts, composants
  `AdvancedMarker`, `InfoWindow`, `Polygon`, `Polyline` et `Circle` de vis.gl. La copie locale
  d'`AdvancedMarker` a été supprimée : `marker.web.tsx` centre le contenu personnalisé sur la
  position (`anchorLeft`/`anchorTop` à `-50%`), garde l'épingle par défaut ancrée par le bas, et
  rend les `Callout` à côté du marqueur. vis.gl n'ayant pas d'`OverlayView`,
  `overlay-view.tsx` en fournit un, utilisé par les callouts `tooltip`. La heatmap, jamais exportée
  et reposant sur une couche dépréciée par Google, a été retirée ;
- la carte est **non contrôlée** (`defaultCenter`, `defaultZoom`…) : un rendu ne la déplace jamais.
  Un centre contrôlé, recalculé à chaque rendu, annulait un déplacement à la souris commencé par le
  même appui. Ne pas repasser de props de caméra contrôlées à `Map` ; la déplacer depuis le code
  passe par les méthodes de la ref (`animateToRegion`, etc.) ;
- `Polygon` appelle `onPress`, que l'amont calculait sans l'appeler ;
- `@types/google.maps` et `@types/react-dom` sont des dépendances livrées : gward-app compile les
  sources du fork (dont `callout.tsx` et `overlay-view.tsx`), et le point d'entrée web référence
  les types `google.maps`.

## Dépendances

Une montée de versions qui demande d'examiner des différences se consigne dans
[`JOURNAL.md`](./JOURNAL.md), selon la méthode de gward-app.

Dependabot (`.github/dependabot.yml`) vérifie une fois par mois, sur la branche par défaut. Ses PR
ne servent que de **veille** : elles signalent qu'une version est sortie, la montée se fait à la
main. Ne pas proposer de les fusionner, de les fermer ni de les rebaser. Le groupe
`security-updates` laisse passer les versions majeures volontairement.

## Commits et poussées

Ne créer un commit ou pousser que sur demande explicite du propriétaire. Après un commit poussé,
gward-app doit être mis à jour pour pointer vers le nouveau commit.

## Vérification avant de conclure

1. relire le diff et vérifier qu'il reste limité à la demande ;
2. exécuter `yarn check` ;
3. mettre à jour `AGENTS.md` ou `JOURNAL.md` si le changement les invalide ;
4. signaler toute vérification non exécutée (appareil, navigateur, build natif) et sa raison.
