# Build a module

## Generate and register

```sh
npm run create:module -- green-spaces
npm install
npm run dev
```

This creates `packages/module-green-spaces` from `templates/module` and adds it
to `apps/tablette/package.json`. Root commands discover packages automatically.
No new entry in the host UI or generated registry is needed. Open it through
**Explore → Modules → green-spaces → Open**. The template demonstrates module-owned
Overview/Sources tabs; replace those with your feature.

## Contract

The package manifest declares `studioModule: { id, entry, export }` and exports
its descriptor from `dist/index.js`. Its version matches the descriptor. The
template build uses Vite for JS/HTML and TypeScript for declarations; React,
the AI SDK and shared contracts remain external peers.

- `src/index.ts`: descriptor and public exports.
- `src/Surface.tsx`: module page and internal tabs.
- `src/tools.ts`: optional `<id>_*` agent tools using injected `ModuleContext`.
- `src/api.ts`: optional data client accepting an injected fetch.
- `test/`: behavior and contract tests, with mocked network calls.
- `README.md`: owner, scope, data licenses, commands and known limitations.

Use `ModuleSurfaceProps.host` for workspace/Viewer actions. Use `onUse` to hand a
prompt to Sketch. Both may be absent in isolated previews; handle that case.

For bundled maps, type the descriptor as `ProjectModule` from
`@hackeindhoven/module-contracts` and provide `samples`. Ids must equal the module
id or start with `<module-id>-`. The host discovers them through the registry.
See `packages/module-eindhoven` for a complete example.

## Develop independently

Run `npm run dev` in one terminal. In another:

```sh
npm run watch --workspace=@tablette/module-green-spaces
```

Refresh the app after rebuilding the package. If type declarations change, run
`npm run build:modules` before a full check. Run `npm run check` before opening
the PR. For browser tests, `npx playwright install chromium` once, then
`npm run test:smoke` after building modules.

Changing package dependencies means running `npm install` at the root and
committing the root lockfile. Avoid adding module-specific CSS selectors to the
host's global stylesheet; use scoped classes, CSS modules or component styles.

## Shared changes

Adding another page or internal tab to a module needs no host change. A new host
capability, SDK field or navigation pattern needs an explicit shared proposal
and integration test. Do not bypass the boundary with a relative app import.
