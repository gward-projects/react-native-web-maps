# Journal des mises à jour de dépendances

**Nature :** historique vivant des revues de versions · **Dernière mise à jour :** 17 octobre 2026.

Ce fichier suit les mêmes règles que le journal de gward-app
(`documentation/journal-mises-a-jour-dependances.md`), dont il reprend le format.

## Règles de tenue

Pour chaque mise à jour qui justifie une revue fonctionnelle ou technique, ajouter une entrée datée
indiquant :

- les packages et le passage de versions concerné ;
- les changements de comportement ou nouvelles API réellement examinés ;
- les évolutions adoptées dans le code ;
- les évolutions non adoptées, avec une raison concrète ;
- les vérifications exécutées et leurs limites, notamment l'absence de test interactif, natif ou
  dans le navigateur.

Chaque correctif annoncé comme un apport doit être rattaché à la version exacte qui le porte, en
comparant les archives npm et les commits amont (voir « Vérifier les changements réels » dans
`documentation/procedures/agents/mettre-a-jour-dependances.md` de gward-app). Une simple montée
sans différence à analyser ne nécessite pas d'entrée.

## 17 octobre 2026 — React Native 0.88, React 19.3, TypeScript 6, supercluster 9 et alignement sur gward-app

| Package | Départ | Arrivée |
| ------- | ------ | ------- |
| Yarn (`packageManager`) | 4.13.0 | 4.18.1 |
| `react` | 19.2.3 | 19.3.0 |
| `react-native` | 0.84.1 | 0.88.0 |
| `@types/react` | 19.2.14 | 19.3.0 |
| `typescript` | 5.9.3 | 6.0.3 |
| `react-dom`, `@types/react-dom` | 19.2.3 | 19.3.0 |
| `react-native-maps` (dev) | 1.27.2 | 1.29.11 |
| `expo-location` | 55.1.2 (`dependencies`) | 58.0.17 (développement ; `peerDependencies` seulement) |
| `supercluster` | 8.0.1 | 9.1.0 |
| `@types/supercluster` | 7.1.3 | retiré (supercluster 9 fournit ses types) |
| `react-native-builder-bob` | 0.40.18 | retiré (aucun build) |

### Changements de code

- supercluster 9 publie ses propres types en exports nommés : `marker-clusterer.tsx` importe
  `PointFeature`, `ClusterFeature`, `ClusterProperties` et `AnyProps` au lieu de l'espace de noms
  `Supercluster`.
- `noImplicitOverride` : `override` sur `render()` de `marker.web.tsx`.
- `react-hooks` a révélé plusieurs bugs, corrigés :
  - `_onRegionChangeComplete` dépendait de `onRegionChange` au lieu de `onRegionChangeComplete` ;
  - la carte mémorisée ne se mettait pas à jour avec ses enfants (marqueurs) et ses callbacks
    gardaient `map = null` ;
  - `useUserLocation` ne retirait jamais l'abonnement `watchPositionAsync` (le nettoyage lisait un
    état encore `undefined`) ; le callback passe par `useEffectEvent` (**React 19.2 minimum**) ;
  - la mesure de taille de `marker.web.tsx` était du code mort (ref jamais attachée), remplacée par
    la constante qui servait de valeur par défaut.
- Deux exceptions justifiées dans `AdvancedMarker.tsx` : création du marqueur Google Maps dans un
  effet, et `className` exclu volontairement des dépendances (scintillement).

- **Dépendances livrées** : `expo-location` était à la fois en `dependencies` (version exacte) et
  en `peerDependencies`, si bien que gward-app installait deux copies (55.1.2 pour le fork, 57.0.21
  pour l'app). Il n'est plus qu'en `peerDependencies` (et en développement pour le typecheck) : le
  fork utilise la version de l'app, alignée sur son SDK Expo. À l'inverse, `@react-google-maps/api`,
  que seul le fork utilise, n'est plus qu'en `dependencies`.

### Alignement sur gward-app

- tsconfig strict commun aux trois forks (`moduleResolution: "bundler"`,
  `customConditions: ["react-native"]`, options strictes de gward-app plus
  `noUncheckedIndexedAccess`, `noImplicitReturns`, `allowUnreachableCode: false`) ;
- ESLint 9.39.5 + `eslint-config-expo` 58.0.4 en configuration TypeScript (`jiti` 2.7.0), avec
  `import/order` et la règle `sort-imports-by-first-name` copiée de gward-app ;
- tests `node:test` + `tsx` 4.23.15 dans `tests/`, `@types/node` 24.19.2 ;
- `yarn check` et pre-commit Husky 9.1.7, installé par `yarn setup-hooks` (pas de `prepare`) ;
- `.yarnrc.yml` réduit à `nodeLinker: node-modules` : les lignes ajoutées par `yarn set version`
  (`enableScripts`, `npmMinimalAgeGate: 0`, `approvedGitRepositories`) désactivaient les nouvelles
  protections de Yarn sans besoin pour le fork.

### Évolutions non adoptées

- **TypeScript 7** : Expo 58 et React Native 0.88 ne le prennent pas encore en charge ; les forks
  restent en 6.0.3, comme gward-app.
- **Babel 8** : n'est plus utilisé par les forks (aucune transformation Babel).
- **ESLint 10** : `eslint-plugin-import`, utilisé par `eslint-config-expo`, ne le prend pas encore
  en charge ; ESLint reste en 9.39.5, comme gward-app.

### Vérifications et limites

- `yarn check` : lint, typecheck et 26 tests passent.
- Ajout des tests de `getBoundByRegion`, `transformRNCameraObject`, des conversions GeoJSON et de
  `mapMouseEventToMapEvent`. `getBoundByRegion` renvoie une valeur douteuse au-delà de ±90° /
  ±180° (`(90 - offset) * -1`) : code amont, non modifié.
- `supercluster` 8.0.1 → 9.1.0, seule dépendance livrée dont la version change : archives npm
  comparées et notes de version lues (v9.0.0, v9.1.0). Réécriture interne (mémoire, vitesse,
  précision des coordonnées), prise en charge des `MultiPoint`, types fournis par le paquet ; seule
  rupture, `maxZoom` plafonné à 30, sans effet ici (`new Supercluster()` garde la valeur par défaut,
  16). gward-app n'utilise pas `MarkerClusterer`.
- **Non fait** : comparaison des archives npm des dépendances de développement, qui ne sont pas
  livrées à gward-app.
- `tsc` de gward-app passe avec les sources de ce fork (anciens types de React Native 0.86).
- **À vérifier dans gward-app (web)** : gward-app n'utilise que la carte (`initialRegion`,
  `onRegionChange`, `onMapReady`, méthodes de la ref), les marqueurs et callouts avec `onPress` et
  l'appui sur la carte ; ni clusters ni position de l'utilisateur.
