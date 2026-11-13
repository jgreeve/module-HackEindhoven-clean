# Fellenoord Samen — integration handoff

Task tracking: [clean repository issue #1](https://github.com/jgreeve/module-HackEindhoven-clean/issues/1).

## Result

Working Tablette module in `packages/module-fellenoord-samen`, opened through
**Explore → Modules → Fellenoord Samen → Open**. Includes shared geographic map,
project/idea discovery, original schematic project illustrations, map-pin idea
creation with review/back/cancel, discussions/replies, identity-based reversible
support, durable local storage and SDK chat discovery/detail tools that update
the module Surface. The host shell/chat and existing modules are retained.

## Baseline and publishing

- Original main: `b105596247bd1846558e4d40754bdbe4092828c9`.
- Validated clean baseline: `85c498b5423bd577d913c85ab806fc3d8b695c0c`.
- Initially empty destination received that baseline on `main` through an
  initial non-forced push preserving source history. Remote SHA was verified.
- GitHub baseline CI run `43428737656` completed successfully.
- Feature branch: `feat/fellenoord-samen`; integrate through review/PR.
- Original main and the observed OSM branch remained at their inspected SHAs
  when rechecked. No existing agent workspace, remote branch or configuration
  was modified. No unfinished agent branch was imported. No deployment performed.

## Shared paths changed by the feature

- `apps/tablette/package.json`: generated module registration dependency (the
  generator also sorts dependencies).
- `package-lock.json`: workspace registration, Leaflet production usage,
  Leaflet/GeoJSON type dependencies. SDK remains a public peer/dev dependency.
- `apps/tablette/src/modules/registry.generated.ts`: **generator output**, not a
  handwritten registration.
- Root README/backlog and validation documentation; no host/SDK code changes.
- `tests/browser/fellenoord.spec.ts`: host integration coverage for the module.

Collaboration rules and module migration instructions are already on the clean
baseline in `AGENTS.md`, `CONTRIBUTING.md` and `docs/MODULE_MIGRATION.md`. Agents 1
and 2 finish their own work, then transfer only reviewed module-specific files
and reconcile dependencies against clean main through separate PRs.

## Executed validation (Node 22.23.2 / npm 10.9.8)

| Command/check | Observed result |
|---|---|
| `npm ci` after final dependency reconciliation | Passed; 391 packages installed, 17 existing advisories |
| `npm run check` | Passed: package boundaries, builds, scaffold test, all module typechecks/tests, host typecheck, proxy tests, production build |
| Check-suite tests | 28 passed: 1 scaffold, 2 contracts, 3 Eindhoven, 10 Fellenoord, 12 proxy |
| `npm run build` | Passed; static output in `apps/tablette/dist` |
| `npm run test:smoke` | 8/8 passed: 6 Fellenoord and 2 existing host/Eindhoven scenarios |
| Isolated production preview + Chromium | Passed: actual built catalogue/Surface and project detail opened, 3 markers, 9/9 real OSM tile responses HTTP 200, no page errors |

The production preview used a dynamically allocated loopback port and was
terminated after verification. Public municipal APIs/tiles are mocked in CI;
the extra production-preview check fetched a normal viewport's OSM tiles, not
bulk geospatial data. No model API key, paid inference or forge token was used.
Actual AI-provider response quality was not tested; SDK tools and their shared
Surface state were exercised directly in unit/browser tests.

Screenshots are generated locally under `test-results/fellenoord-desktop.png`,
`fellenoord-narrow.png` and `fellenoord-production-live.png` (ignored build/test
artifacts). Browser traces are retained on failure; CI uploads failed artifacts.

### Failures found and resolved

- Initial TypeScript union inference in filtered places: fixed with explicit
  `Place[]` typing, then all package/host typechecks passed.
- Browser tests exposed ambiguous accessible category/control names and
  list-vs-marker selectors: clarified category labels, gave the tablist its own
  name and scoped list selectors; tests then passed.
- Actual marker clicks in the host scroll pane were displaced by Leaflet's
  mousedown focus. Module-local capture focus with `preventScroll` fixes the
  click while retaining keyboard navigation. Verified by real mouse selection.
- A combined installation/check shell invocation exceeded its 120-second
  budget before finishing; `npm run check` was rerun on its own with a larger
  timeout and passed. This interrupted attempt was not counted as a passing run.
- An initial ad-hoc preview port was occupied and did not test this build. The
  corrected check owned its server on an ephemeral port. A subsequent startup
  parser needed ANSI-stripping; the successful final check is reported above.

## Scope and remaining limitations

- Local demonstration only. Feedback is not sent to the municipality or shared
  across devices. Browser data can be exported and reset. Identity switching is
  a demo interaction, not authentication. Replies are limited to one level.
- Fellenoord is narrower than Knoop XL. The manually approximated northern
  station-corridor boundary is visibly labelled, not an official legal/GIS
  perimeter or a claim to match the municipality's stated 55 hectares.
- Project scenarios, questions, diagrams, seed comments and ideas are fictional.
  Official context is researched/linked; no unlicensed architectural renders
  were copied. Obtain approved perimeter and licensed official records/media
  before a real participation rollout.
- Normal browser storage is versioned/validated and write failures preserve the
  draft. Stale sequential writes are detected; simultaneous multi-tab edits are
  not a transactional collaboration protocol.
- Tiles need internet; overlays, list and landmark workflow survive tile failure.
  Chat tools expose selected local content to the configured AI conversation;
  this is disclosed. SDK has no host navigation-to-Surface API, so tools do not
  claim to open Explore automatically or replace it with a generated app.
- Baseline audit findings remain: 17 dependency advisories (8 moderate, 9 high),
  upstream bundle warnings and an optional missing external BIMR viewer source
  warning. They do not prevent the observed build/tests; dependency remediation
  requires its own compatibility-reviewed change.

See the module README for exact sources, storage schema, limits, public tool
contract and third-party notices; see `docs/CLEAN_BASELINE_AUDIT.md` for Gate 1.
