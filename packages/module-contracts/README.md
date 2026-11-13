# Project module contracts

Shared infrastructure; coordinate changes with other module owners before editing.

`ProjectModule` extends the upstream `StudioModule` only with optional bundled
`samples`. It does not replace or fork `@tablette/module-sdk`.

`collectModuleSamples` selects samples from enabled modules and rejects duplicate
or foreign ids. A sample id must equal its owning module id or start with that
id followed by `-`. The host converts samples into its map catalogue; modules
do not import that catalogue or the host filesystem directly.

Build and validate through `npm run check` at the repository root. Any shared
API change must describe compatibility and include contract/integration tests.
