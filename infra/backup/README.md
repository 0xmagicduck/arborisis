# Sauvegardes PostgreSQL — déploiement

Le script est dans [`apps/backup`](../../apps/backup) — voir sa docstring et
[plan/04-infra-infomaniak.md §4.5](../../plan/04-infra-infomaniak.md#45-sauvegardes)
et [plan/10 §10.4](../../plan/10-securite-confidentialite-conformite.md#104-sauvegardes-et-continuité)
pour le contexte (RPO 24h, rétention 30 jours glissants + 12 mensuelles).

**Testé en conditions réelles** le 2026-08-20 (voir journal `plan/TASKS.md`,
Phase 5) : dump réel → chiffrement GPG → dépôt sur le container Object
Storage Infomaniak `arborisis-storage` réel (pas MinIO) → téléchargement →
déchiffrement → restauration dans une base PostgreSQL/PostGIS fraîche →
comptage de lignes comparé à la source, identique. Un piège rencontré :
`pg_dump`/`pg_restore` Homebrew installent par défaut la dernière version
majeure (18.x à l'écriture) — dumper avec un client plus récent que le
serveur cible (16.x) émet des directives que le serveur ne reconnaît pas
(`unrecognized configuration parameter "transaction_timeout"`), corrigé en
utilisant `postgresql@16` (voir `plan/MEMORY.md`).

## Câblé dans `infra/docker-compose.yml` depuis la Phase 6

Service `backup` (profil `tools`, ne tourne pas en continu — voir la note
dans `infra/docker-compose.yml`) construit depuis `apps/backup` via
`infra/docker/Dockerfile` (cible `backup`, mêmes principes de build que
`api`/`worker`). Reste à poser côté hôte : un timer systemd (pas un cron dans
le conteneur — plus simple à superviser/journaliser via `journalctl`) :

```ini
# /etc/systemd/system/arborisis-backup.service
[Unit]
Description=Sauvegarde nocturne PostgreSQL Arborisis

[Service]
Type=oneshot
WorkingDirectory=/opt/arborisis
EnvironmentFile=/opt/arborisis/.env
ExecStart=/usr/bin/docker compose --profile tools run --rm backup
```

```ini
# /etc/systemd/system/arborisis-backup.timer
[Unit]
Description=Déclenche arborisis-backup.service chaque nuit

[Timer]
OnCalendar=*-*-* 03:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

`systemctl enable --now arborisis-backup.timer`. `Persistent=true` rattrape
une sauvegarde manquée si la VM était éteinte à l'heure prévue (cohérent avec
un RPO de 24h, pas besoin d'une précision à la minute).

## Test de restauration trimestriel

Voir la docstring de `apps/backup/src/restore.ts` — exige explicitement
`RESTORE_TARGET_DATABASE_URL` (jamais `DATABASE_URL` directement, refusé par
le script si les deux sont identiques). Cibler une base vide dédiée au test
(ex. une base `arborisis_restore_drill` sur la même instance, ou un
environnement de test séparé), jamais la base de production elle-même.

```bash
createdb arborisis_restore_drill   # une fois
psql -d arborisis_restore_drill -c "CREATE EXTENSION IF NOT EXISTS postgis;"
RESTORE_TARGET_DATABASE_URL=postgres://.../arborisis_restore_drill \
  pnpm --filter @arborisis/backup restore
```

Le script affiche les comptages de lignes des tables principales après
restauration — comparer à la base source pour confirmer l'intégrité (pas
seulement "la commande n'a pas planté").
