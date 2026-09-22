# Pals web

Next.js App Router signup, signin, email confirmation, required-profile onboarding, and gated readiness screen. From the repository root use `pnpm dev:web` (http://127.0.0.1:3000), `pnpm --filter @pals/web build`, or `pnpm --filter @pals/web typecheck`.

Start local Supabase and copy `.env.example` to `.env.local` with the local public key. Provider clients are server-only and use caller sessions/RLS. No privileged key is permitted. App-specific UI stays here; reusable validation belongs in shared packages. Shared tokens are imported by the root layout. See `LOCAL_SETUP.md` and `docs/engineering/AUTH.md` for environment and security conventions. Hangout/map/social/messaging workflows are not implemented.
