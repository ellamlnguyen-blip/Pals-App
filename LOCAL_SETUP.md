# Pals local setup

Use Node.js 24 (`nvm use`) and pnpm 11.19.0. Install that pnpm version through your normal package-manager setup (`npm install --global pnpm@11.19.0` if needed).

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Web runs at http://127.0.0.1:3000 and admin at http://127.0.0.1:3001. Use `pnpm dev:web` or `pnpm dev:admin` individually. Both servers bind to loopback. Stop them with Ctrl-C. The mobile app is a placeholder only.

No credentials are required for the placeholder apps. Optional app-specific configuration starts by copying `apps/web/.env.example` or `apps/admin/.env.example` to that app's `.env.local`. Never commit local env files. `APP_ENV` defaults to `local`, independently of Next.js `NODE_ENV`. Set staging/production explicitly only for those deployments. The parser rejects unknown values. This label does not itself select, validate or protect a backend; integration checks belong to TASK-002/003.

Do not put privileged credentials in `NEXT_PUBLIC_` variables. Supabase service-role keys stay server-only. No backend, Mapbox, PostHog or hosting account is connected yet.

## Validation

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
# Or run all five in order:
pnpm check
```

`pnpm format` formats implementation/tooling files; existing specification folders are excluded to avoid unrelated rewrites. Next.js type generation precedes each app typecheck, so checks work on a fresh clone. Production preview: `pnpm --filter @pals/web start` and `pnpm --filter @pals/admin start` after building. CI runs frozen install and `pnpm check`; a local success is not a hosted CI run.

## Tooling choices

pnpm workspaces provide local package links and recursive scripts without adding a build orchestrator. Dependencies are pinned in manifests and the lockfile. The workspace explicitly permits only required native dependency build scripts (sharp/unrs-resolver). ESLint uses the matching Next.js configuration, TypeScript is strict, Prettier handles formatting, and Node's built-in test runner checks environment defaults/rejection. TypeScript 5.9 is a conservative supported compiler baseline. ESLint 9 remains pinned because the installed Next.js React lint plugin's peer range excludes ESLint 10; revisit when that upstream constraint changes.

## Next task prerequisites

TASK-002 requires Supabase CLI plus a working Docker-compatible runtime for local Postgres/RLS verification. Neither Docker nor Supabase CLI was present on PATH during TASK-001; install/provision them within TASK-002's authorized scope. Do not substitute production for missing local infrastructure.

Read `AGENTS.md` and the assigned task contract before work. Each bounded implementation task uses a fresh task-specific agent and produces a handoff under `agents/handoffs/`.
