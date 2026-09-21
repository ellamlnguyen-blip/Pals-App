# @pals/config

Shared compiler configuration and explicit app-environment parsing. Deployment environment defaults to local; it is separate from NODE_ENV.

Import through the package public exports, not sibling source paths. Shared packages must not import app implementations or web UI frameworks; ESLint enforces that boundary. Add runtime dependencies explicitly to the consuming package. All packages are private and typechecked from the root command.
