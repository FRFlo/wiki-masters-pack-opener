# Wiki Masters Discord Bot

Bot Discord réécrit en **Bun + SQLite**, avec des commandes slash et une
automatisation HTTP de Wiki Masters. La base est persistée dans un volume Docker.

## Configuration

Copier `.env.example` vers `.env`, puis renseigner :

- `DISCORD_TOKEN`
- `DISCORD_CLIENT_ID`
- `DISCORD_GUILD_ID` (optionnel ; les commandes globales fonctionnent aussi en message privé)

Le cookie Wiki Masters est fourni ensuite par `/compte connecter`. La réponse
est éphémère et le cookie est stocké dans SQLite pour l’utilisateur Discord.
Plusieurs cookies peuvent être enregistrés sous des noms différents ;
`/account select` choisit le compte utilisé par les commandes suivantes.

## Commandes disponibles

- `/guide` (sections `demarrage`, `packs`, `marche`, `collection`, `automatisation`)
- `/compte connecter`, `/compte lister`, `/compte statut`, `/compte supprimer`
- `/account list`, `/account select`
- `/pack ouvrir`, `/pack auto`
- `/pack bonus`
- `/marche scan`, `/marche mes-ventes`, `/marche miser`, `/marche mot-cle`, `/marche mots-cles`
- `/vente lancer`, `/vente configurer`
- `/collection chercher`, `/collection doublons`, `/collection stats`, `/collection taguer`
- `/cote`, `/succes`, `/guilde`, `/souhaits`

Les champs d’identifiants, de tags et de noms de pages proposent un
autocomplete local. Le catalogue est synchronisé périodiquement par compte
dans SQLite (cartes, enchères récentes et tags) ; les mots-clés sont lus
directement depuis SQLite. La fréquence est réglable avec
`CATALOG_SYNC_INTERVAL_MS`.

- `/stats`
- `/planning`

Le scheduler exécute les modules activés avec des horaires séparés (`pack`,
`market`, `trash`). Le fuseau par défaut est Europe/Paris.

## Tests

```sh
bun test
```

Les tests d’intégration en lecture seule utilisent le cookie local `cookie` :

```sh
RUN_LIVE_TESTS=1 bun test tests/live.test.ts
```

Ils vérifient la balance, le marketplace et la collection sans effectuer
d’action d’achat, d’enchère ou de vente.

## Docker

```sh
cp .env.example .env
docker compose up -d --build
docker compose logs -f
```

SQLite est monté dans `/data/wiki-masters.sqlite`. Le workflow
`.github/workflows/docker.yml` construit et publie l’image sur GHCR à chaque
push sur `main` ou tag `v*`.

## Limite HTTP-only

Les endpoints utilisés sont `/api/packs/open`, `/api/marketplace`,
`/api/my-collection`, `/api/wikibidous`, `/api/trades` et les endpoints
Supabase nécessaires aux tags. Wiki Masters a historiquement refusé certaines
mises en vente via `POST /api/marketplace` alors qu’un clic dans l’interface
fonctionnait. Ce bot n’utilise volontairement aucun navigateur : les erreurs
HTTP sont journalisées et les ventes sont retentées au cycle suivant.
