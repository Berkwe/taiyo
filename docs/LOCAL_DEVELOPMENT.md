# Local development

Requirements: Node 24.11.1, Corepack, Docker, and Git.

```bash
cp .env.example .env
corepack enable
corepack pnpm install
corepack pnpm setup:local
corepack pnpm dev
```

`setup:local` is safe to rerun. It starts PostgreSQL, Meilisearch, and
Dragonfly, deploys pending migrations, and upserts only the fictional
NovoraScans seed. The destructive upstream reset seed remains available as
`corepack pnpm --filter @taiyomoe/db seed:legacy:reset`.

Workspace scripts load the root `.env` automatically. Prisma TypedSQL generation
still needs PostgreSQL, so run `setup:local` before typecheck or build.
ClickHouse and HyperDX remain optional and are not started by this command.
