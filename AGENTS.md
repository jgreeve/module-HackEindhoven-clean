# Coding-agent instructions

## Start
- Read README.md, CONTRIBUTING.md, docs/architecture.md and the target package's README.
- Check git status before editing; preserve unfamiliar work. Read the linked task and state which package/files you will own.
- One agent per clone/worktree and branch. Coordinate any shared-file changes.

## Architecture
- New user features live in packages/module-<id>, using @tablette/module-sdk.
- UI pages stay under Explore → Modules. Internal tabs belong to their module Surface.
- Do not import app internals or another package's src. Use injected host capabilities or a documented public package contract.
- ProjectModule.samples in @hackeindhoven/module-contracts adds maps to Samples. No hard-coded per-feature imports in the app shell.
- Register dependencies through the app package.json; never hand-edit registry.generated.ts.
- Keep upstream copyright/license headers and data attribution.

## Verify
- Run npm ci from the root for a clean install.
- Run npm run check. Run npm run test:smoke for host/Surface integration changes.
- The root lockfile is authoritative. Use npm install after dependency changes.
- No API key is needed in tests. Mock public APIs; never print or commit localStorage keys/tokens.
- No autonomous downloading of bulk OSM data. The downloader under module-eindhoven/scripts is paused WIP, not part of setup/build/tests.

## Finish / handoff
- Report changed files, tests actually run and known limitations.
- Keep docs/backlog.md and the task issue current. Do not mark unfinished OSM work as complete.
- Commit, push, merge or create PRs only when the user/task authorises those actions. Never force-push or change git config.
- Before a commit inspect status, diff and recent log; stage intended files only.
