# Fordj administration — forges, tokens and the npm registry

Operator notes for the Forgejo instances behind tablette: which host does what,
how forge tokens are stored, how the npm registry is configured and how to check
access without publishing.

No credentials and no private git URLs belong on this page — it ships with the
public source. Concrete hostnames for the private mirror are in the deployment
notes under `tasks/`, which are stripped from releases.

## Instances

| Role | Host | What it is | Automated access |
|:--|:--|:--|:--|
| Public forge | `fordj.org` | Forgejo behind Anubis, serves the `@bimr` npm packages and the earlier `tablette` release snapshots | git and npm work; npm reads are anonymous |
| Production forge | `git.bimr.net` | Forgejo 16.0.5 behind Anubis 1.28.2; public release repo for `tablette` (`rvba/tablette`) and the `@tablette` npm registry. Development happens on a private forge | `/api/packages/**` exempt from Anubis; SSH for git, HTTPS + token for the release push |
| Staging registry (superseded) | `https://git.rvba.fr/api/packages/rvba/npm/` | first `@tablette` publish (`0.1.0`), replaced by the `git.bimr.net` registry | token required, for reads and writes |
| Private mirror | (see the deployment task docs) | history and backup of the rvba repositories | SSH |
| Local test forge | `forgex` (`https://forgex.forgeons.org`) | disposable Forgejo used by `nx fordj forgex` for E2E | local |

Anubis is in front of every public host. Its behaviour is not uniform, so treat
each surface separately:

- `/api/packages/**` is exempt on `git.bimr.net`: an npm client gets JSON, never
  the proof-of-work page.
- `/api/v1/**` and the HTML UI challenge `curl/*` and browser clients. A `git/*`
  user agent passes through, which is why git over HTTPS works with a real git
  client and why nx sends a git-style agent.
- Consequence: **npm is the supported bot path**; for git use SSH with a key.
  Anything that must be fetched by a bot (release tarballs, npm packages) has to
  be exempt from Anubis or served by a host that is.

## Tokens

Forge tokens live in nx's key store, never in a repository. nx resolves a token
for an instance in this order, first match wins:

| Order | Source |
|:--|:--|
| 1 | `--token <T>` on the nx command |
| 2 | `$XKEYS/fordj/tokens/<instance>` (default `~/SOURCES/KEYS/keys/fordj/tokens/<instance>`) |
| 3 | `token=` in `~/.fordj/ini/<instance>.ini` |
| 4 | `token=` in the `[main]` section of `~/.fordj.ini` |
| 5 | `$FORGEJO_TOKEN` |
| 6 | admin credentials in `$XKEYS/fordj/<instance>/env`, over HTTP Basic |

```bash
nx fordj user token path   <instance>            # print the keys-repo file path
nx fordj user token list   <instance> <user>     # list a user's tokens (admin API)
nx fordj user token set    <instance> --token T  # store a token (or mint one)
nx fordj user token create <instance> <user> --scopes "write:package" --store
nx fordj forgex token                            # local forgex admin token
```

### A token belongs to one instance

Issued by a forge, valid on that forge only. Measured 2026-11-12 by reading
`@bimr/web`, which is public on `fordj.org`:

| Credential | `fordj.org` | staging registry |
|:--|:--|:--|
| the `office` token in the nx key store (2026-10-08) | `401` | `401` — stale, refresh it |
| the `fordj.org` token in `~/.npmrc` | works | `E401` |
| anonymous | works | `401 reqPackageAccess` |

A token is valid on the forge that issued it and nowhere else, so the stored
`office` token must be refreshed before the first publish, and the `fordj.org`
token cannot stand in for it. Store one per instance and export the right one:

```bash
export NODE_AUTH_TOKEN="$(cat "$(nx fordj user token path <instance>)")"
```

nx reports a stale token with "the stored token for `instance` was rejected —
refresh it". Rotate with `nx fordj user token set <instance>`; revoke the old one
in the forge UI.

### Store or mint a token

When the forge already has an instance entry — `office` for the staging registry
— use its name:

```bash
# token created in the forge UI (Settings > Applications; include write:package)
nx fordj user token set office --token T
nx fordj user token path office            # -> $XKEYS/fordj/tokens/office
```

The token file is keyed by instance name, not by host, so a forge without an nx
instance can be parked under any name (`token set rvba-staging --token T`)
without creating an ini; validation is skipped and the token is stored anyway.

`set` tries to validate the token against `/api/v1/user` on the instance's URL
and warns when there is none, then stores anyway. The file is mode 600, and the
keys repo is committed and pushed (`fordj: add token for <instance>`), so the
token joins the same store as every other forge credential.

To have nx mint it instead of pasting one, use the instance URL and a credential
for the forge — `office` has both:

```bash
nx fordj user token create office rvba \
  --name tablette-npm --scopes "write:package" --store
export NODE_AUTH_TOKEN="$(cat "$(nx fordj user token path office)")"
```

`create` prints the token without `--store`; with it, the token is written
through the same path. A forge with no instance entry needs
`~/.fordj/ini/<name>.ini` containing `url=<forge url>` first.

`--password` is a bootstrap credential, not a privilege check, and it is the
forge account's password — not the local Unix user's. On a remote forge nx calls
`POST /users/<user>/tokens` with HTTP Basic as the account the token is for, so
a site admin still has to present one: the forge has no other credential to
authenticate.

Omit the flag and nx prompts (after trying `~/.p`), or store an admin token with
`token set` and nx switches to `POST /admin/users/<user>/tokens` — the route to
use for an account you cannot authenticate as. Instances whose ini has `host=`
are container-managed: nx uses the in-container Forgejo CLI and asks for
nothing.

nx has no part in the registry configuration itself: it stores the credential,
`~/.npmrc` (or `NODE_AUTH_TOKEN`) points npm at the registry.

### Scope

A token used for publishing needs package write on the owner (`write:package`
when the forge implements scopes). A token used only for installs needs package
read. An admin token is not required for npm — and a token that is not a site
admin fails the admin API with 403 even though it publishes fine.

## npm registry

The registry URL is the same shape on every forge:
`https://HOST/api/packages/rvba/npm/`. A scoped registry in `.npmrc` selects
it:

```ini
@bimr:registry=https://fordj.org/api/packages/rvba/npm/
@tablette:registry=https://git.bimr.net/api/packages/rvba/npm/
```

Reads are anonymous on `git.bimr.net`; publishing needs a token with
`write:package` for the `rvba` owner. The superseded staging registry still
serves `@tablette/*@0.1.0`, needs a token for reads, and is no longer used.

Two rules that cost an hour each if forgotten:

1. **A scoped `@scope:registry` beats `publishConfig.registry`.** A stale scope
   line in the repo or user `.npmrc` sends the publish to the old host even
   when the manifest names the new one; only the unscoped `registry=` setting
   loses to `publishConfig`. Keep the scope line and the manifests in sync, and
   check the target with `npm publish --dry-run`.
2. **`publishConfig.access: restricted` makes the package unreadable
   anonymously.** Forgejo ties visibility to the owner, so a package published
   from a private repository stays private even if the registry is public. Use
   `access: public` for anything a fresh clone must install, or keep a token
   everywhere.

### Publish

The publish runs the underlying steps, SDK first:

```bash
npm run publish:sdk
npm run publish:modules
```

The publish must resolve the same registry the consumers use. Publishing a
version you cannot install anonymously is half a release.

### Check access without publishing

`npm whoami` is not implemented by Forgejo's npm endpoint (404 even with a valid
token), and `/api/v1/**` answers the Anubis challenge unless the client sends a
git-style user agent. Probe the API directly:

```bash
curl -sS -A "git/2.0" -H "Authorization: token $NODE_AUTH_TOKEN" \
  https://<forge>/api/v1/user
```

`{"login":...}` is an accepted token; `401 {"message":"token is required"}` is
not. `403` is also acceptance: `/user` requires `read:user`, so a token scoped to
`write:package` only is valid but forbidden on that endpoint. Ask for
`read:package` as well when the same token should read published versions;
`read:user` only makes the probe return the login.

`npm view` is only a version check, not an auth check. The failure codes differ
per registry: `git.bimr.net` and `fordj.org` answer `404` for a missing package,
but the private rvba forge answers `401 reqPackageAccess` for *every* unknown
package, with or without a valid token — there it cannot distinguish "no token"
from "good token" before the first publish.

For a public registry, drop the token entirely — that is the configuration CI
and bots will use:

```bash
env -u NODE_AUTH_TOKEN npm view @bimr/web version --registry=https://fordj.org/api/packages/rvba/npm/
```

### Git access

SSH with a deploy key is the stable path for CI and agents. HTTPS works when
authenticated because git's user agent passes Anubis, but that is an agent
allowlist, not an API contract. Verify a key with `git ls-remote
ssh://git@<host>:<port>/<owner>/<repo>.git`.

## Checks

| Check | Expect |
|:--|:--|
| `nx fordj user token path <instance>` | a path under `$XKEYS/fordj/tokens/` |
| `nx fordj user token list <instance> <user>` | token metadata; 403 means the token is valid but not admin |
| anonymous `npm view` on a public registry | a version |
| anonymous `npm view` on a private registry | `401 reqPackageAccess`, even for a package that does not exist |
| `curl -A git/2.0 -H "Authorization: token T" /api/v1/user` | `{"login":...}` — the real token check |
| `npm view` of a published package with a usable token | a version |
| `npm whoami` | 404 — not implemented, not a failure |

## Failure modes

| Symptom | Cause | Fix |
|:--|:--|:--|
| `E401` while publishing | token for another instance, expired, or missing package write scope | store a token for that host, `nx fordj user token set` |
| `403 user should be the site admin` | valid token without admin rights | use an admin token for admin API calls only |
| `401 reqPackageAccess` anonymously | private package or sign-in required | make the package/repo public, or accept tokens everywhere |
| publish landed on the wrong registry | `publishConfig.registry` in the manifest | fix the manifest, delete the version, republish |
| npm gets the Anubis page | a non-exempt path or host | use the registry path, or exempt it at the edge |
| git push rejected on a new host | key not registered there | add the deploy key; keys are per instance |
