# Clean Tablette baseline audit

Inspection date: 2026-11-13. Owner: Fellenoord Samen integration task.

## Provenance and remote inspection

- Source: `https://github.com/jgreeve/module-HackEindhoven`.
- Source `main` and baseline: `b105596247bd1846558e4d40754bdbe4092828c9`.
- Other source branch observed: `feat/eindhoven-osm-layers` at
  `a4c92094af26e85db9c78ca27237caa7d988ffd0`; not imported or modified.
- Destination: `https://github.com/jgreeve/module-HackEindhoven-clean`.
  Initial inspection: no refs, no default branch, no branches or PRs. Therefore
  preserve source main history through an initial non-forced push, then use PRs.
- Isolated clone: `fellenoord-samen-isolated`. Source remote remains `origin`;
  destination is the separate `clean` remote. No existing agent workspace touched.
- Upstream Tablette snapshot and attribution remain recorded in `UPSTREAM.md`.

## Authoritative contracts consulted

Official architecture, module SDK, catalogue, third-party module guide and
security pages at `https://docs.tablette.bimr.net/`, plus installed SDK 0.1.0
declarations. Browser-only React Surfaces, statically registered npm workspaces,
namespaced tools and injected host APIs already conform. The samples extension
is additive; the published SDK is not forked. Module generation and the registry
generator remain the registration mechanism.

The SDK has no API to navigate from a tool to an Explore Surface. A module may
share its own state between its tools and an already mounted Surface. It must
not import private host navigation or imply that `onUse` keeps Explore open:
`onUse` explicitly hands the prompt to Sketch.

## Findings

### Critical

No blocking architecture/build/host-operation defect found in the inspected
baseline. No unfinished remote agent branch was merged. The committed paused
OSM downloader is explicitly WIP and is not executed by setup, build or tests.

### Recommended

- `npm ci` reports 17 dependency advisories (8 moderate, 9 high); production-only
  audit reports 14 (6 moderate, 8 high), including transitive AI SDK/undici and
  Zod. Some suggested changes cross SDK major versions or have no automatic fix.
  Resolve in a dedicated compatibility-reviewed dependency PR; do not run a
  forced audit fix or silently fork the SDK. This baseline is not a security
  certification. Bound module input sizes before parsing untrusted collections.
- `sync:bimr` probes an optional external viewer source checkout. It warns
  when absent and keeps the committed viewer. Reproducible install/build and
  browser tests succeed without that checkout.
- Require PR review and successful CI for integration; repository protection
  settings are maintainer policy and have not been changed by this task.

### Optional

- Upstream bundle size and mixed static/dynamic imports trigger Vite warnings.
  Optimisation is independent of module integration and does not block the app.
- Existing app chrome is English; new module UI will be Dutch with local strings.

## Gate 1 — executed before feature implementation

Environment: Node 22.23.2 / npm 10.9.8, compatible with `.node-version` and root
engines. Commands run in the isolated root:

- `npm ci`: success (audit findings above).
- `npm run check`: success, including architecture checks, generator test,
  2 contracts tests, 3 Eindhoven tests, typechecks, 12 proxy tests and Vite build.
- `npx playwright install chromium`: success.
- `npm run test:smoke`: 2/2 passed against a newly started Vite server on 5174.

The browser tests open Tablette, navigate Explore/catalogue, open the stable
Eindhoven Surface, load its fixture-backed map, hand it to Sketch and verify
module enablement/sample behaviour. Public APIs are mocked; no model key is
required or tested. The scaffold test creates a real temporary module and
verifies registration and collision/path-traversal protection.
