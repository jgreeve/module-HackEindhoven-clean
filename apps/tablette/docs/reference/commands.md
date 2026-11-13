# Commands

All commands run from the repository root. Use **Node 20.19+ or 22.12+**.

## npm scripts

| Command | What it does |
|---------|--------------|
| `npm install` | Install dependencies from the lockfile scopes |
| `npm run dev` | Vite dev server with HMR; runs `sync:bimr` and `gen:modules` first |
| `npm run build` | Production build to `dist/`; runs `prebuild` first |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit`; runs `gen:modules` first |
| `npm run gen:modules` | Regenerate `src/modules/registry.generated.ts` from `package.json` |
| `npm run sync:bimr` | Refresh the BIMR MicroPython runtime and viewer bundle |
| `npm run proxy` | Run the forge proxy standalone |
| `npm run test:proxy` | Unit-test the forge proxy |
| `npm run test:modules` | Module contract and prompt-composition tests |
| `npm run test:e2e` | Playwright smoke and report tests |
| `npm run docs:dev` | VitePress dev server for this site |
| `npm run docs:build` | Build this site to `docs/.vitepress/dist` |
| `npm run docs:preview` | Serve the built documentation site |

`predev`, `prebuild`, `pretypecheck` and `pretest:modules` run
`gen:modules`, so a stale registry is not a normal failure mode. `predev` and
`prebuild` also run `sync:bimr`.

## Make targets

| Command | What it does |
|---------|--------------|
| `make serve` | Build and serve the Studio shell on port 8090 |
| `make build` | `npm run build` |

`make serve` sets `VITE_FORGE_PROXY=/forge-proxy/`, builds, then runs the
preview server on `127.0.0.1:8090`.

## Test commands

| Suite | Command |
|-------|---------|
| Forge proxy | `npm run test:proxy` |
| Module registry and prompts | `npm run test:modules` |
| Browser smoke and reports | `npm run test:e2e` |

The Playwright suite needs a browser install (`npx playwright install`) and a
running preview server where the test expects one.

## Documentation

```bash
npm run docs:dev       # http://localhost:5173 (VitePress)
npm run docs:build     # static output
npm run docs:preview   # serve the built site
```

The build fails on a dead internal link, so add pages before linking them.

## Release and maintainer commands

The release process lives in `RELEASE.md` in the repository. It is stripped
from public source snapshots and is not part of this site.

## Next steps

- [Getting started](/guide/getting-started) — first run.
- [Configuration](/reference/configuration) — environment variables.
- [Docs site](/operations/docs-site) — build and publish this site.
