# Architecture

## Host and packages

`apps/tablette` contains the imported React/Vite shell, browser workspace,
Forgejo/git clients, agent orchestration and mode surfaces. The shell is shared
infrastructure. Features use the existing **Explore → Modules → Open** flow.

Each `@tablette/module-*` workspace exports a `StudioModule` descriptor from the
published SDK. It declares its id, modes, tools, prompts, endpoints, attribution,
settings and optional React `Surface`. The host injects workspace, Viewer, fetch,
clock and tracing capabilities. Modules do not import app internals.

The published SDK is not forked. `@hackeindhoven/module-contracts` adds the
backwards-compatible `ProjectModule.samples` field. A sample has a namespaced
id, title, HTML document, created date and optional attribution/tags/license.
The host adapter translates enabled modules' samples into the existing map-app
contract. Disabling a module removes its samples on the next catalogue load.
Already saved workspace documents remain user files.

## Build and registration

1. npm installs one workspace dependency graph and root lockfile.
2. `scripts/modules.mjs` builds local packages in dependency order.
3. The app's registry generator reads `@tablette/module-*` dependencies and their
   `studioModule` metadata, including hoisted/workspace packages.
4. Vite bundles the app and module packages together. No remote plugin loader
   or arbitrary code installation is added at runtime.
5. BIMR runtime assets are copied from the installed package; generated files and
   builds are ignored by Git.

The existing externally published modules (Canutes, Open Data, Reports, Wikidata,
Wikimedia) remain dependencies. Core BIMR remains upstream-owned in the host.

## Data and state

The app has no application backend. Documents/git live in browser IndexedDB;
configuration lives in browser localStorage. Module Surfaces are trusted React
components, so new modules require code review. Generated HTML maps run in
sandboxed iframes with scripts/popups and no same-origin access.

The Eindhoven map currently requests official boundaries and permits from the
CORS-enabled municipal API. Its OSM tiles are a basemap, not selectable building
or green-space datasets. Those features remain a separate paused task.

## Collaboration boundary

Module code/styles/tests/docs belong to their package. Shared contracts and host
changes need coordination. `npm run check:boundaries` rejects relative source
imports outside a package; CI verifies descriptors, module behavior, proxy tests,
host compilation/build and browser integration. Internal tab state is owned by
the module Surface, not by adding new global modes.
