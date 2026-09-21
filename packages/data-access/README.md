# @pals/data-access

Compatible backend access boundaries. Privileged access must be server-only when implemented; no clients or credentials exist yet.

Import through the package public exports, not sibling source paths. Shared packages must not import app implementations or web UI frameworks; ESLint enforces that boundary. Add runtime dependencies explicitly to the consuming package. All packages are private and typechecked from the root command.
