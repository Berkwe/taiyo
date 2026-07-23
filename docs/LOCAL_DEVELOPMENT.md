# Local development

Requirements: Node 24.11.1, Corepack, Docker, and Git.

```bash
cp .env.example .env
corepack enable
corepack pnpm install
docker compose up -d
corepack pnpm --filter @taiyomoe/db db migrate deploy
corepack pnpm --filter @taiyomoe/db seed
corepack pnpm dev
```

Prisma TypedSQL generation connects to PostgreSQL even during typecheck. Start
the database before `corepack pnpm typecheck` or `corepack pnpm build`.
Monitoring services are inherited from Taiyō and are not required by the
fixture-backed public foundation.
