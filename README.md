# Wiki Masters — pack opener

Petit worker Docker qui appelle périodiquement `POST /api/packs/open`.

## Configuration

L’API répond `401 Non autorisé` sans session. `COOKIE` doit donc contenir le
cookie HTTP de session actif, par exemple `session=...` (sans le préfixe
`Cookie:`). La requête POST est envoyée sans payload ni corps.

## Lancement

```sh
cp .env.example .env
# renseigner COOKIE dans .env
docker compose up -d --build
docker compose logs -f
```

`INTERVAL` accepte `ms`, `s`, `m`, `h` et `d` (`1h` par défaut). Le premier
appel est effectué immédiatement, puis à chaque intervalle. Les réponses sont
journalisées en JSON avec leur statut HTTP; le cookie n’est jamais affiché.

> Utilisez uniquement une session et des packs que vous êtes autorisé à
> ouvrir, et respectez les règles de Wiki Masters et les limites de l’API.
