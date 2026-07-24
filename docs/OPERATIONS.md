# NovoraScans operations

All maintenance commands load the root `.env`. Destructive storage cleanup is
never the default.

## Storage audit and manifest

Dry-run database/storage consistency audit:

```bash
corepack pnpm maintenance:storage
```

Write a private JSON manifest containing storage key, byte size, SHA-256, MIME
type, and owning database relation:

```bash
corepack pnpm maintenance:storage -- --manifest=artifacts/storage-manifest.json
```

`--apply` only removes `.tmp` files older than 24 hours. It does not delete
reported orphan objects.

## Database backup and restore verification

Create a timestamped custom-format PostgreSQL backup and enforce retention:

```bash
corepack pnpm backup:database
```

Defaults:

- `BACKUP_DIRECTORY=backups/database`
- `BACKUP_RETENTION_DAYS=14`

Verify a backup against an explicitly supplied disposable database:

```bash
corepack pnpm backup:verify backups/database/novora-TIMESTAMP.dump \
  postgres://postgres:postgres@localhost:5432/novora_restore_check
```

The restore command refuses to target the configured application database.
When local PostgreSQL CLI tools are unavailable, both commands use the local
Docker Compose PostgreSQL service.

## Local storage to Cloudflare R2

Dry-run is the default:

```bash
corepack pnpm storage:migrate:r2
```

Upload missing objects:

```bash
corepack pnpm storage:migrate:r2 -- --apply
```

The migration preserves storage keys, skips objects whose byte size already
matches, records SHA-256 as object metadata, verifies uploaded size, and can be
rerun after interruption.

## Health

- `GET /api/health`: public minimal database/storage readiness.
- `GET /api/admin/health`: authenticated administrator disk, storage driver,
  database, quota level, and timing details.

Every proxied request receives an `x-request-id` correlation header. Logs must
not contain passwords, session tokens, API keys, or raw authentication headers.
