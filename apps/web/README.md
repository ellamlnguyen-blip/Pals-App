# Pals web

Next.js App Router signup, signin, email confirmation, required-profile onboarding, and gated readiness screen. From the repository root use `pnpm dev:web` (http://127.0.0.1:3000), `pnpm --filter @pals/web build`, or `pnpm --filter @pals/web typecheck`.

Start local Supabase and copy `.env.example` to `.env.local` with the local public key. Provider clients are server-only and use caller sessions/RLS. No privileged key is permitted. App-specific UI stays here; reusable validation belongs in shared packages. Shared tokens are imported by the root layout. See `LOCAL_SETUP.md` and `docs/engineering/AUTH.md` for environment and security conventions. Social, messaging and calendar workflows remain separate tasks.

## Hangouts map shell

The `/hangouts` route retains `requireAccess("ready")` and renders a Mapbox GL JS shell after the live Supabase gate. Set `NEXT_PUBLIC_MAPBOX_TOKEN` to a project-owned public `pk.` token; restrict its URL origins and scopes to the local/staging map use. Missing/non-public values show a useful fallback. Restart development or rebuild hosted output when changing public environment values. Basemaps use Mapbox light-v11/dark-v11 based on the system preference at mount. Mapbox CSS/worker are bundled through the official package; network access to Mapbox styles, tiles, fonts and ordinary map session endpoints is required.

The `/hangouts` map retains clearly labeled mock examples. Its local-only saved entry opens a separate RLS-backed map/list/detail at `/hangouts/saved`; mock pins never join or link to saved records. A ready caller can create/edit a saved campus Hangout and join/leave one through the accepted TASK-005 backend. Saved pins show approximate public areas; private instructions are fetched separately for authorized published host/joined access. The database Hangout gate defaults disabled, and all saved paths/actions additionally require the local loopback Supabase target. No hosted Hangout use is enabled.

Local filters and previews work without map delivery. Device location is requested only by Locate me, once per click, used as a coarse local camera center in the UNC area, never saved or submitted as a user record. Normal basemap tile requests reflect the viewed map area. No user-location marker, continuous watcher or location analytics exists.
