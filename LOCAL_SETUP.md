# Pals local setup

Use Node.js 24 (`nvm use`) and pnpm 11.19.0. Install that pnpm version through your normal package-manager setup (`npm install --global pnpm@11.19.0` if needed).

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Web runs at http://127.0.0.1:3000 and admin at http://127.0.0.1:3001. Use `pnpm dev:web` or `pnpm dev:admin` individually. Both servers bind to loopback. Stop them with Ctrl-C. The mobile app is a placeholder only.

Web auth requires local Supabase. Copy `apps/web/.env.example` to `apps/web/.env.local` and set `SUPABASE_PUBLISHABLE_KEY` to the local publishable (or legacy anon) key from `pnpm exec supabase status`. Never commit local env files. `APP_ENV` defaults to `local`, independently of Next.js `NODE_ENV`. Set staging/production explicitly only for those deployments, with a matching project reference and HTTPS `APP_ORIGIN`. Every provider client validates its target before connecting.

Do not put privileged credentials in `NEXT_PUBLIC_` variables. The auth app rejects service-role/secret keys entirely and uses public keys with user sessions/RLS. Mapbox, PostHog and web hosting are not connected yet. Admin remains a placeholder.

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

API: `http://127.0.0.1:54321`; local Postgres: port 54322; email capture: `http://127.0.0.1:54324`. Email confirmation is enabled and local mail is captured, not delivered. Storage is enabled for the private profile-photo bucket. Studio, Realtime, Edge Runtime, and analytics remain disabled. Use the exact web origin `http://127.0.0.1:3000`; confirmation callbacks go to `/auth/callback` and must open in the same browser that initiated signup/resend.

Run `pnpm test:auth` after SQL verification for real Auth/Storage checks. With `pnpm dev:web` running, use `WEB_TEST_ORIGIN=http://127.0.0.1:3000 pnpm test:auth` to include actual web callbacks and server gates. Local email rate limits are raised only for the mail-catcher test workflow; do not copy them to hosted environments. Tests clean their synthetic accounts. `pnpm-workspace.yaml` supports both x64 and arm64 CPU packages for normal Apple Silicon shells and the Codex runtime.

Keep `--network-id pals-local-network` on start, reset and SQL-test commands. CLI 2.117.0 otherwise recreates the database on its default network during reset while other services remain on the selected network, breaking Auth/Storage DNS. Use repository scripts consistently.

`pnpm exec supabase migration new descriptive_name` creates the next committed migration. Never edit migrations after they are applied to a shared environment. Apply schema changes through migrations, and keep local fixtures under `supabase/seed/`. See `supabase/README.md` for the separately gated staging procedure.

`validateSupabaseTarget` in `@pals/config` rejects hosted targets in local mode and requires a matching explicit project reference in staging/production. All web auth provider clients now call it. The caller must supply independently configured staging/production references; the validator cannot establish that a human labeled a hosted project correctly. Never copy production credentials into local or staging configuration.

The TASK-002 handoff records the temporary Lima runtime paths used on this host. That runtime is stopped after verification and is not a repository dependency; new machines can use their own Docker runtime. Official setup references: [Supabase local development](https://supabase.com/docs/guides/local-development), [Lima installation](https://lima-vm.io/docs/installation/).
