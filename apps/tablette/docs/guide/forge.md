# Forge access

Tablette can use a **Forgejo** instance as its discovery surface and as a git
remote for the workspace. The forge is optional, but it is what makes Explore,
`samples`, `bimr/gis-src` blocks and `bimr/gis-apps` work.

## Configure

Open **Settings > Forge**:

| Field | Example | Notes |
|-------|---------|-------|
| Forge URL | `https://artefacts.bimr.net` | Base URL, no `/api/v1` |
| Bot user | `bot` | Default owner for discovery |
| Access token | `…` | Forgejo token; scopes depend on the task |
| Proxy URL | `https://studio.example/forge-proxy/` | Optional; see below |

The token is stored in `localStorage` with the rest of the configuration. Use a
dedicated account with the smallest scopes that work.

## Why a proxy

Browsers enforce the same-origin policy. Forgejo sends CORS headers on some
API routes and not on git smart HTTP, so a browser on another origin cannot
clone or push directly.

The repository ships a stateless **forge proxy**:

- it forwards the REST API and git smart HTTP;
- it is allowlisted by host, deny-by-default;
- it holds no secrets and no state;
- it strips cookies, `Origin` and `Referer`, and never logs authorization
  headers.

Run it locally:

```bash
FORGE_ALLOWED_HOSTS="artefacts.bimr.net,bimr.net" npm run proxy
```

Then set **Proxy URL** to `http://localhost:8787/forge-proxy/`. In development
the Vite server mounts the same handler at `/forge-proxy/`, so you usually do
not need the standalone process. See [Forge proxy](/operations/proxy) for the
nginx and systemd configurations.

## Discovery tools

The assistant can explore without changing anything:

| Tool | Purpose |
|------|---------|
| `forge_overview` | List organizations and repositories |
| `forge_list_repos` | Repositories of a user or org |
| `forge_search_repos` | Search by name or description |
| `forge_repo_info` | Repository details and default branch |
| `forge_list_files` | List a repository directory |
| `forge_read_file` | Read a Markdown or source file |

Read-only exploration never needs a proposal. The assistant reuses proven
patterns from existing repositories instead of inventing one.

## Git tools

The workspace can be a git repository. The tools are:

| Tool | Purpose |
|------|---------|
| `git_status` | Working tree status |
| `git_log` | Recent commits |
| `git_init` | Start a repository on `main` |
| `git_clone` | Clone a repository, replacing the workspace |
| `git_commit` | Stage all changes and commit |
| `git_remote` | Set the `origin` remote |
| `git_push` | Publish the current branch |
| `git_tag` | Create a version tag |
| `forge_create_repo` | Create a repository owned by the bot |

The workflow is:

```text
discover ──► clone or (create repo + init) ──► edit ──► commit ──► push
```

## Commit rules

Committing is **user-driven**:

- The assistant never commits or pushes unless you explicitly ask (commit,
  save, publish, push). Editing files or running an app does not count.
- When you ask to commit, it commits and pushes in the same turn.
- It works on trunk (`main`) only. It does not create or switch branches and
  does not force-push.

Before a mutating action (create a repo, clone, commit, tag, push) the
assistant calls `propose_actions` and waits for your choice. A proposal always
includes a cancel option.

## Repository descriptors

Explore can render a repository landing page from a `studio.yaml` descriptor
at the repository root. The descriptor can declare a title, summary, links,
actions and embedded Markdown. The gateway repository is
`bimr/studio-gateway`.

## Samples and blocks

Two repositories are part of the Sketch workflow:

- `bimr/gis-src` — reusable Leaflet blocks and `gis.yaml`;
- `bimr/gis-apps` — generated apps and `gis-apps.yaml`.

**Samples** in the Sketch toolbar lists `bimr/gis-apps`. `gis_list_blocks`
reads `bimr/gis-src`. Both need a working forge configuration (or a cached
copy).

## Token scopes

Forgejo tokens are per instance. A token from one forge is not valid on
another. Typical scopes:

| Task | Scopes |
|------|--------|
| Browse public repositories | none, or `read:repository` |
| Read private repositories | `read:repository` |
| Push to a repository | `write:repository` |
| Create a repository | `write:repository`, `write:user` |

Use a dedicated bot account for a shared deployment. Do not give a public demo
a token that can write.

## When the forge is unavailable

The assistant can continue without it: workspace editing, map composition and
the local modules still work. Forge tools return an error that the agent is
told to ignore. The exception is `bimr/gis-src`: without the forge you need a
cached checkout of the blocks to compose from them.

## Next steps

- [Forge proxy](/operations/proxy) — deployment details.
- [Forge administration](/operations/fordj) — instances, tokens and registries.
- [Security](/reference/security) — token and sandbox rules.
