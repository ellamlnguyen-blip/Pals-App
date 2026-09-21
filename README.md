# Pals App

Pals is a campus social utility for casual real-world plans.

Initial launch: UNC Chapel Hill.

## Start Here

1. `AGENTS.md`
2. `docs/product/VISION.md`
3. `docs/product/MVP.md`
4. `docs/engineering/ARCHITECTURE.md`
5. `tasks/NOW.md`

## Build Order

`apps/web` first → `apps/admin` → `apps/mobile` after web/backend behavior is stable.

Pals exists to help people leave the app and do something together.

## Development

The pnpm workspace contains runnable Next.js/TypeScript placeholders in `apps/web` and `apps/admin`, a reserved mobile workspace, and six shared packages. See [LOCAL_SETUP.md](LOCAL_SETUP.md) for requirements, environments and validation.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm check
```

The current UI is a development preview, not a functional campus product. No authentication, database, map, analytics or external deployment is connected.
