# @pals/design-tokens

Provisional shared visual primitives. Both web and admin import @pals/design-tokens/tokens.css. Colors adapt to system dark mode; spacing uses a 4px base, surfaces a 24px radius, and content a 70rem maximum. Nunito Variable is self-hosted by each web app via Fontsource with font-display: swap.

Import through the package public exports, not sibling source paths. Shared packages must not import app implementations or web UI frameworks; ESLint enforces that boundary. Add runtime dependencies explicitly to the consuming package. All packages are private and typechecked from the root command.

The installed Leon Taste skill was read at `/Users/ellanguyen/.codex/skills/leon-taste-skill/SKILL.md` and the live usepals.com reference inspected for TASK-001. These tokens preserve the friendly blue/white, rounded reference character without declaring a final product design. Native CSS is sufficient for this static bootstrap; no animation, component library or photographic marketing sections are needed. Design settings: variance 3, motion 1, density 3. Desktop/tablet use a bounded single column; mobile reduces spacing and type through a 767px breakpoint. The development notice is intentional; no simulated product controls exist.

Later UI work follows `docs/ux/DESIGN_DIRECTION.md`. Refine shared tokens coherently; do not copy divergent color palettes into apps. Mobile UI need not reuse web components; a platform-neutral token representation can be added when mobile starts.
