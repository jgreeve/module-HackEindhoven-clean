# Contributing

## One task, one branch, one workspace

1. Open or claim a GitHub module task. Record the owner (person/agent), package,
   expected pages/tabs, data sources and acceptance criteria.
2. Start from current `main` on `feat/<module>-<task>` or `fix/<module>-<task>`.
3. Use your own clone or worktree. Never let simultaneous agents edit the same
   working tree or share one running app/profile during tests.

```sh
git fetch origin
git worktree add ../hackeindhoven-green -b feat/green-spaces origin/main
```

Install dependencies inside the new worktree and choose a distinct Vite port if
another developer is running the app. Browser workspaces and keys are per-origin.

## Package ownership

Develop one independent module per agent, on a feature branch; never develop
features directly on `main`. Never force-push or rewrite remote history.
Integration requires a PR and passing checks. Do not manually edit generated
registries. SDK, contracts and host changes require review.

Completed work in the original repository follows
[the module migration procedure](docs/MODULE_MIGRATION.md).

- Feature work belongs in `packages/module-<id>/`.
- Keep its tools, API clients, UI/internal tabs, tests and documentation together.
- Write its owner and scope in its README. A module-task issue records active
  ownership; don't silently take over another contributor's task.
- Use SDK-injected workspace, fetch and viewer capabilities. No relative imports
  into `apps/tablette` or another package's source tree.
- Use unique module ids and `<module_id>_*` tool names.
- Propose shared API changes in an issue/PR first; document the compatibility
  impact and include integration tests.

## Checks and review

Run `npm run check`, plus `npm run test:smoke` for host/Surface integration
changes. CI runs both. Tests should mock public APIs and avoid model keys.

Commit focused changes with a message such as `feat(eindhoven): add permit
filters`. Open a PR linked to the issue; describe shared files touched, tests
run, limitations, sources and screenshots for UI changes. Request a human review
before merging. Recommended repository setting: require the `checks` CI job and
one approval on `main`; branch protection is not enabled by this source setup.

When two branches change dependencies, merge/rebase their `package.json`
changes and run `npm install` from the root to regenerate `package-lock.json`.
Do not hand-merge lockfile internals or keep per-package lockfiles.

## Record work

Code and documentation live in Git; issues/PRs record decisions and handoffs.
When stopping, push only as authorised, record the current commit/branch,
passing checks, blockers and next step in the issue. Do not confuse browser
IndexedDB documents with files stored in this repository: export or explicitly
save an artefact that must be shared.

Keep dependency directories, builds, downloaded bulk data, API tokens and local
settings out of commits. Data clients must record source, capture/fetch date,
coverage and license; approximate spatial matches must be labelled as such.
