# HackEindhoven

Hackathon Eindhoven Community Building Challenge. A shared Tablette application
with independently developed modules for people and coding agents.

## Run locally

Use Node.js **22.12+ (22 LTS)** and npm. From the repository root:

```sh
git clone https://github.com/jgreeve/module-HackEindhoven-clean.git
cd module-HackEindhoven-clean
npm ci
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`. Run commands from
this repository, not the earlier standalone `tablette` checkout.

**Explore → Modules → Eindhoven → Open** displays the first local module.
Its **Open in Sketch** action moves the Eindhoven map to the editor/viewer.
**Samples** also lists module-provided maps.

**Explore → Modules → Fellenoord Samen → Open** opens the local participation
map: demo projects, community ideas, discussion threads and reversible support.
Contributions are stored only in this browser; there is no municipal submission.
A model API key is only needed for chat; configure it in
the browser's Settings. Public map data does not require a model key.

## Repository layout

```text
apps/tablette/                  Shared app shell and upstream features
packages/module-eindhoven/      Eindhoven UI, tools and map document
packages/module-fellenoord-samen/ Fellenoord participation Surface, data and tools
packages/module-contracts/      Small shared extension to the upstream module SDK
templates/module/              Runnable starting point for new modules
scripts/                       Build, scaffold and architecture checks
tests/browser/                 Host/module integration smoke tests
docs/                          Project architecture, contribution guide and backlog
.github/                       CI, module-task form and PR template
AGENTS.md                      Instructions for coding agents
```

Modules stay under **Explore → Modules**. A module may own internal tabs in its
Surface; there is no new global tab system. Local packages are npm workspaces,
not separate nested Git repositories, and use the existing `@tablette/module-sdk`.

## Add a module

```sh
npm run create:module -- green-spaces
npm install
npm run dev
```

The generator creates `packages/module-green-spaces` and adds its dependency to
the host. It appears in Explore → Modules. Keep work inside that package and
add meaningful tests. For live edits to a module, run its `watch` script in a
second terminal and refresh the browser after rebuilding.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Build local modules and start the app |
| `npm run check` | Architecture checks, scaffold tests, module tests/typechecks, host typecheck, proxy tests and production build |
| `npm run test:smoke` | Browser integration tests; run after a module build |
| `npm run build` | Build modules and `apps/tablette/dist/` |
| `npm run typecheck` | Build local modules, then check all source packages |
| `npm test` | Build modules, then run module and proxy tests |

For browser tests, first run `npx playwright install chromium`. On Windows you
can instead use installed Chrome: `$env:PLAYWRIGHT_CHANNEL='chrome'` before
`npm run test:smoke`. CI installs Chromium automatically and mocks public APIs.

## Work together

Use one GitHub issue and feature branch per task. Give each person/agent a
separate clone or Git worktree. Open a PR when checks pass; coordinate changes
to shared contracts, app dependencies and the root lockfile.

- [Contributor workflow](CONTRIBUTING.md)
- [Architecture and contracts](docs/architecture.md)
- [Module authoring](docs/module-development.md)
- [Current status and paused OSM work](docs/backlog.md)
- [Upstream provenance](UPSTREAM.md)
- [Clean baseline audit and source commit](docs/CLEAN_BASELINE_AUDIT.md)
- [Migration for completed agent modules](docs/MODULE_MIGRATION.md)
- [Fellenoord Samen scope, provenance and storage](packages/module-fellenoord-samen/README.md)

Code is MIT-licensed; original Tablette copyright and license notices are
preserved. Municipal source data and OSM data retain their respective licenses.
