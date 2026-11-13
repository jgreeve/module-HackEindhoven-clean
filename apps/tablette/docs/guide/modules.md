# Modules

Modules add capabilities without changing the core. A module can contribute:

- **tools** the agent can call;
- a **prompt section** describing when and how to use them;
- **data sources** with endpoint, auth, CORS, license and attribution;
- an optional **surface** rendered in Explore;
- optional **settings** shown in the module catalogue.

The module packages are installed from the `@tablette` npm scope. The core
stays a single static build: there is no runtime `import()` and no remote code.

## Enable and disable

Open **Settings > Modules** or **Explore > Modules** and toggle a module.
Changes apply immediately; the agent uses the new set on its next turn.

A module also declares the modes it supports. Data modules currently target
**Sketch** only, so their tools do not appear in Explore, Learn or Build even
when the module is enabled.

The effective set is stored under `studio.modules.overrides` in `localStorage`.
Per-module settings live under `studio.module.<id>`.

## What a module adds

| Contribution | Where it appears |
|--------------|------------------|
| Prompt section | Composed into the system prompt for supported modes |
| Tools | Available to the agent in the same modes |
| Data sources | Module catalogue: endpoint, license, CORS, methods |
| Attribution | Module catalogue and generated apps |
| Surface | **Open** button in Explore > Modules |
| Settings | Fields in the module card |

## The catalogue

| Module | Adds | Surface |
|--------|------|---------|
| [Canutes](/modules/canutes) | French parliamentary open data: scrutins, votes, deputies, dossiers, laws | Canutes browser |
| [Open Data](/modules/opendata) | A catalogue of public sources by topic and country | Open Data browser |
| [Reports](/modules/report) | Self-contained, printable HTML research reports | Reports library |
| [Wikidata](/modules/wikidata) | CC0 facts, coordinates, types and identifiers | — |
| [Wikimedia](/modules/wikimedia) | Wikipedia summaries and Commons media | — |
| [BIMR](/modules/bimr) | The legacy BIMR engine for Explore, Learn and Build | — |

All six are enabled by default. The `bimr` module is core-owned; the other five
are installed npm packages.

## Data-module rules

Modules that read public data follow a few rules:

- **Read-only.** No module writes to a public source.
- **Fetch at generation time.** The agent fetches data while composing an app;
  the app inlines it and does not call the source at runtime.
- **Metadata is not data.** The Open Data module returns catalogue records, not
  datasets or files.
- **Attribution is part of the result.** Every source declares its license and
  credit line; generated apps carry them.
- **Bounded queries.** Tools cap limits and projections. The agent must not
  download whole tables or full records for a list.

## Adding a module

A module is its own npm package implementing `@tablette/module-sdk`. The core
discovers installed `@tablette/module-*` packages with
`scripts/gen-registry.mjs`; opting in or out is a `package.json` edit.

A module must not require edits to `src/agent/tools.ts` or
`src/agent/prompts.ts`, and must not import core source. Workspace, viewer,
trace, mode and settings access are injected through `ModuleContext`.

See [Module SDK](/reference/module-sdk) for the contract and package layout.

## Where the code lives

- Module packages: `tablette-modules` repository, published as
  `@tablette/module-*`.
- Core-owned BIMR engine: `src/modules/bimr/`.
- Registry composition: `src/modules/registry.ts`.
- Generated manifest: `src/modules/registry.generated.ts`.
- Module UI: `src/components/ModulesPanel.tsx` and `ModuleSurfaceHost.tsx`.
- Documentation links: `src/modules/links.ts` points at this site.

## Next steps

- [Module catalogue](/modules/) — the public pages.
- [Module SDK](/reference/module-sdk) — the contract.
- [Security](/reference/security) — sandboxing and untrusted content.
