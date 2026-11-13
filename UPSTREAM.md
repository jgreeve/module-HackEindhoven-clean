# Upstream provenance

- Project: Tablette by Milovann Yanatchkov
- Source: https://git.bimr.net/rvba/tablette
- Imported snapshot: `f1e79894c772ff1869506a1ca7438ff1d4b0b26b`
- Upstream commit: `release: studio 2026-11-13`
- Imported into: `apps/tablette/`
- License: MIT; see `apps/tablette/LICENSE` and the original file headers.

This repository keeps the existing GitHub repository history and imports an
upstream source snapshot; it does not claim to contain upstream's entire Git
history. It also records our working Eindhoven map and Windows asset-copy fix.
The map now belongs to `packages/module-eindhoven`.

The shared app remains a browser-only React/Vite application. External published
modules and BIMR runtime packages come from the anonymous registries configured
in the root `.npmrc`. The root lockfile pins the complete workspace install.

For a future upstream update, compare the recorded snapshot with the new
upstream commit on a dedicated branch. Review host adapters, package resolution
and module registration before updating. Do not overwrite local modules or
generated runtime assets as a bulk import.
