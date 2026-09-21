# Pals local setup

Use Node.js 24 (`nvm use`) and pnpm 11.19.0. Install that pnpm version through your normal package-manager setup (`npm install --global pnpm@11.19.0` if needed).

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Web runs at http://127.0.0.1:3000 and admin at http://127.0.0.1:3001. Use `pnpm dev:web` or `pnpm dev:admin` individually. Both servers bind to loopback. Stop them with Ctrl-C. The mobile app is a placeholder only.

No credentials are required for the placeholder apps. Optional app-specific configuration starts by copying `apps/web/.env.example` or `apps/admin/.env.example` to that app's `.env.local`. Never commit local env files. `APP_ENV` defaults to `local`, independently of Next.js `NODE_ENV`. Set staging/production explicitly only for those deployments. The parser rejects unknown values. This label does not itself select a backend; the target validator below must be used when clients are integrated.

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

The workspace pins Supabase CLI. A running Docker-compatible runtime remains a local prerequisite; TASK-002 established a temporary Lima/Docker instance on this host for verification. See the workflow below and task handoff. Never substitute production for missing local infrastructure.

Read `AGENTS.md` and the assigned task contract before work. Each bounded implementation task uses a fresh task-specific agent and produces a handoff under `agents/handoffs/`.

## Supabase foundation

The pinned workspace CLI is Supabase 2.117.0. Use `pnpm exec supabase`; no global CLI install is required. Install a Docker-compatible runtime and ensure `docker info` succeeds. The verified host setup uses Lima with Docker and loopback-only host forwarding. Other runtimes require checking their host bindings. The local stack needs approximately 4 GiB RAM; initial image downloads take time. Keep the runtime socket local and do not expose it over the network.

```sh
docker network create -o com.docker.network.bridge.host_binding_ipv4=127.0.0.1 pals-local-network
pnpm db:start
pnpm db:verify
pnpm db:stop
```

Create the network once per Docker runtime; if it already exists, inspect its `com.docker.network.bridge.host_binding_ipv4` option and confirm `127.0.0.1`. With CLI 2.117.0, the database container still publishes 54322 on all interfaces **inside the runtime**, while API/mail respect the network option. The verified Lima VM forwards it only to host `127.0.0.1`; its host-agent log confirmed that binding. Do not assume this network option alone contains the database on Docker Desktop or native Docker: use an isolated runtime with loopback forwarding or restrict host access before starting the stack. `db:verify` resets the **local** database, runs pgTAP RLS tests, repeats the reset/tests, then lints the schema. Resets delete local development data. No linked project or hosted credentials are needed. The seed contains the UNC reference row only; SQL tests create `example.invalid` identities inside a rolled-back transaction.

API: `http://127.0.0.1:54321`; local Postgres: port 54322; email capture: `http://127.0.0.1:54324`. Email confirmation is enabled and local mail is captured, not delivered. Studio, Realtime, Storage, Edge Runtime, and analytics are disabled for this bounded foundation. Profile photo paths are placeholders for future Storage integration; no upload or public bucket exists.

`pnpm exec supabase migration new descriptive_name` creates the next committed migration. Never edit migrations after they are applied to a shared environment. Apply schema changes through migrations, and keep local fixtures under `supabase/seed/`. See `supabase/README.md` for the separately gated staging procedure.

`validateSupabaseTarget` in `@pals/config` rejects hosted targets in local mode and requires a matching explicit project reference in staging/production. No app provider client exists yet; TASK-003 must call it before constructing clients. The caller must supply independently configured staging/production references; the validator cannot establish that a human labeled a hosted project correctly. Never copy production credentials into local or staging configuration.

The TASK-002 handoff records the temporary Lima runtime paths used on this host. That runtime is stopped after verification and is not a repository dependency; new machines can use their own Docker runtime. Official setup references: [Supabase local development](https://supabase.com/docs/guides/local-development), [Lima installation](https://lima-vm.io/docs/installation/).
