# ADR-0001 — Web-first monorepo
Status: Accepted  
Date: 2026-09-21

## Decision
Use a monorepo with Next.js web first, internal admin, React Native + Expo mobile later, plus shared domain/types/validation/data-access/config/design-token packages. Do not force all UI to be shared.

## Consequences
Faster web iteration and one source of truth; some web/native UI will be implemented separately.
