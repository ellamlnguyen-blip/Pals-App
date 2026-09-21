# @pals/types

Shared cross-platform TypeScript contracts. No runtime provider or UI dependencies.

Import through the package public exports, not sibling source paths. Shared packages must not import app implementations or web UI frameworks; ESLint enforces that boundary. Add runtime dependencies explicitly to the consuming package. All packages are private and typechecked from the root command.
