# Module SDK

A module is an npm package that adds tools, prompt instructions, data sources
and optionally a UI surface to Tablette. The contract is
`@tablette/module-sdk`.

## Package layout

```text
@tablette/module-<id>/
  package.json
  src/
    index.ts          exports the descriptor
    tools.ts          createTools(ctx)
    prompts.ts        the prompt section
    api.ts            source client
    Surface.tsx       optional
  dist/
  test/
```

The package must declare `studioModule` metadata:

```json
{
  "name": "@tablette/module-canutes",
  "version": "0.1.0",
  "studioModule": {
    "id": "canutes",
    "entry": "./dist/index.js",
    "export": "canutesModule"
  }
}
```

`scripts/gen-registry.mjs` reads every `@tablette/module-*` dependency, resolves
the metadata and writes `src/modules/registry.generated.ts`. The generated file
must not be edited by hand.

## The descriptor

```ts
import type { StudioModule } from "@tablette/module-sdk";

export const exampleModule: StudioModule = {
  id: "example",
  label: "Example",
  description: "What the module adds.",
  version: "0.1.0",
  docs: "/modules/example",
  modes: ["sketch"],
  defaultEnabled: true,
  dataSources: [],
  attribution: [],
  prompt: "When the user asks for …, use example_* tools.",
  createTools: (ctx) => ({
    example_query: tool({ /* … */ }),
  }),
};
```

| Field | Required | Meaning |
|-------|----------|---------|
| `id` | yes | Stable id; also the required prefix of every tool name |
| `label` | yes | Display name |
| `description` | yes | One-line catalogue description |
| `version` | yes | Must equal the package version |
| `docs` | yes | Site path (`/modules/<id>`) or a legacy repo path |
| `modes` | yes | Modes where the tools and prompt are available |
| `defaultEnabled` | yes | Initial enabled state |
| `dataSources` | yes | Endpoint, auth, CORS, methods, license, attribution |
| `attribution` | yes | Visible credit lines |
| `prompt` | yes | Prompt section appended in the module slot |
| `createTools` | yes | Creates tools per request from `ModuleContext` |
| `settings` | no | Fields rendered in the module catalogue |
| `Surface` | no | React component hosted in Explore |

## Tool names

Every tool name must start with the module id followed by `_`:

```text
canutes_query
canutes_search
wikidata_entity
opendata_source
```

The registry throws on a duplicate or a name outside the prefix. This keeps
module tools distinguishable in the transcript and prevents collisions.

## ModuleContext

Do not import the core. Use the injected context:

```ts
export interface ModuleContext {
  mode?: Mode;
  settings: Record<string, unknown>;
  enabled: Set<string>;
  credits: string[];
  trace: (label: string, start: number, detail?: string) => void;
  now: () => number;
  markRun?: (ok: boolean) => void;
  fetch: typeof fetch;
  workspace?: ModuleWorkspace;
  runApp?: () => boolean;
  setMode?: (mode: Mode, reason?: string) => void;
}
```

- `mode` lets a module narrow individual tools by mode.
- `settings` comes from `localStorage` (`studio.module.<id>`).
- `credits` is the attribution of the enabled modules in the current mode.
- `trace` and `now` report spans to the Studio trace.
- `fetch` is injectable for tests.
- `workspace`, `runApp` and `setMode` are optional host capabilities.

A module package must not import `src/agent/*`, `src/forge/*`, `src/app/*` or
`src/map/*`. That rule keeps the package testable in Node and independent of
the browser storage.

## Data sources

Declare every endpoint the module reads:

```ts
dataSources: [
  {
    id: "wikidata-api",
    label: "Wikidata API",
    endpoint: "https://www.wikidata.org/w/api.php",
    auth: "none",
    cors: true,
    methods: ["GET"],
    license: "CC0 1.0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    attribution: "Données : Wikidata (CC0)",
  },
],
```

This is what the module catalogue shows. It is also the review surface: a new
endpoint or a license change is visible without reading the code.

## Surfaces

A surface is a first-party React component:

```ts
import type { ModuleSurfaceProps } from "@tablette/module-sdk";

export function ExampleSurface({ onUse, host }: ModuleSurfaceProps) {
  return (
    <div>
      <button onClick={() => onUse?.("Map the latest results")}>
        Ask in Sketch
      </button>
    </div>
  );
}
```

`ModuleSurfaceHost` renders it in **Explore > Modules**. `onUse` hands a text
prompt back to Sketch; `host.workspace`, `host.runApp` and `host.setMode` are
available when the surface is hosted in the app.

A surface is optional. The module catalogue works without one.

## Settings

```ts
settings: [
  {
    key: "language",
    label: "Wikipedia language",
    type: "string",
    default: "fr",
    placeholder: "fr",
  },
],
```

Values are stored per module. `secret: true` renders a password field, but the
value is still client-side; do not use a module setting for a secret you cannot
expose.

## Links

`docs` should point at this site:

```ts
docs: "/modules/example",
```

`docsUrl()` resolves it against `VITE_DOCS_BASE`, defaulting to
`https://docs.tablette.bimr.net`. The legacy form `tasks/feature/example.md` is
mapped to `/modules/example` so older published modules keep working.

## Install a module in the core

1. Add the package to `dependencies`.
2. `npm install` (the lockfile pins the tarball).
3. `npm run gen:modules`.
4. `npm run typecheck`.
5. `npm run test:modules`.

Opting out is the reverse: remove the dependency, install and regenerate.

## Validation

`validateModules()` from the SDK checks descriptors at runtime in development.
`npm run test:modules` checks the installed `dist/`:

- descriptor shape and version;
- tool-name prefixes;
- duplicate ids;
- prompt composition;
- the generated registry.

## Versioning

The SDK and modules start at `0.1.0` while the contract is pre-1.0. Additive
changes bump the minor; removing or renaming a field bumps the major. A
module's descriptor `version` must equal its package `version`.

`@tablette/module-sdk` is a peer dependency of each module, with a matching
devDependency for building, so a host cannot validate descriptors of one SDK
version against modules built for another.

## Next steps

- [Modules](/guide/modules) — enablement and composition.
- [Architecture](/reference/architecture) — the registry in context.
- [Security](/reference/security) — untrusted data and licenses.
