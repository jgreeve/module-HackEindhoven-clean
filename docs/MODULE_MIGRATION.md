# Integrating completed modules from the original repository

Destination: `jgreeve/module-HackEindhoven-clean`. The original repository and
its active agent workspaces/branches remain intact. Agents 1 and 2 finish their
own modules there first; this task does not migrate unfinished work for them.

## Agent-owned migration

1. Record the completed source branch/commit, module id, owner, license, data
   sources and passing tests. Agree that the module is ready for review.
2. Clone the clean repository into a **new** workspace. Create a dedicated
   `feat/<module>-integration` branch from its current `main`. Do not switch an
   existing agent's clone or replace the destination tree with the source tree.
3. Add the original repository as a read-only reference remote and fetch the
   completed branch. Inspect `git diff <source-base>..<completed-commit> --
   packages/module-<id>` before transferring files.
4. Transfer only `packages/module-<id>` and its module-specific tests/docs.
   Use reviewed path-limited patches or copy reviewed files from the recorded
   commit. Cherry-pick only if **every** change in that commit is appropriate;
   split mixed shared-infrastructure commits instead of importing them whole.
5. Reconcile SDK/public-contract compatibility against the destination. Never
   import private host internals or another module's source. Propose required
   host/contract changes separately for review, with integration tests.
6. Register the module dependency in `apps/tablette/package.json`, reconcile any
   package-specific dependencies and run `npm install` at the root. Regenerate
   the registry with the host generator/build. Do not copy another lockfile,
   `node_modules`, build output or a manually edited generated registry.
7. Run `npm run check` and `npm run test:smoke`. Test the module through
   Explore → Modules → Open, and confirm existing modules still work. Keep
   browser tests deterministic and free of model credentials or public API needs.
8. Open a PR against clean `main` recording source SHA, package ownership,
   transferred paths, shared changes, provenance, actual checks and limitations.
   Merge only after review and passing CI; resolve overlapping manifests and
   regenerate the lockfile rather than replacing shared infrastructure.

One module, one agent, one isolated workspace and branch. No force-pushes,
automatic unrelated-history merges, direct feature pushes to main, or production
deployments. If destination history changes, fetch/review it and adapt the PR;
never reset the remote to an older baseline.
