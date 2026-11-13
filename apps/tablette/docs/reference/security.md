# Security

Tablette has no application backend. Security is therefore about what runs in
the browser, what the generated artifacts are allowed to do, and which
credentials a deployment exposes.

## Client-side credentials

The model key and the forge token are stored in `localStorage` and used
directly from the page:

```text
studio.agentConfig = { baseUrl, apiKey, model, forgeUrl, forgeToken, proxyUrl }
```

Anyone with access to the origin can read them. This is acceptable for a local
or trusted deployment. It is a **public credential** on a shared demo.

Recommendations:

- use a dedicated API key with a spending limit;
- use a dedicated forge bot with the smallest scopes;
- rotate the keys;
- do not put a production secret in a public build;
- set a rate limit and a spend cap at the provider.

A demo that ships a baked-in key is a public key. OpenRouter supports per-key
credit limits and DeepSeek has account limits; use them.

## The generated surface

Generated apps and reports run in a sandboxed iframe:

```html
<iframe sandbox="allow-scripts allow-popups" srcdoc="…"></iframe>
```

Consequences:

- the document cannot read the Studio page, its storage or its network
  credentials;
- scripts run so Leaflet and charts work;
- popups are allowed for source links;
- no same-origin access, no top navigation, no form submission.

The map contract adds:

- Leaflet from a pinned CDN;
- OSM tiles with visible attribution;
- inline data;
- no Nominatim or Overpass at runtime;
- no `file:///` or local paths.

## The case for a proxy

A browser cannot read a cross-origin forge that sends no CORS headers, and git
smart HTTP fails cross-origin. The optional proxy solves that.

`proxy/proxy.mjs` is:

- **stateless** — no database, no session, no cache;
- **deny-by-default** — `FORGE_ALLOWED_HOSTS` must list the target;
- **credential-stripping** — `Cookie`, `Origin` and `Referer` are removed;
- **non-logging** — authorization and bodies are never logged;
- **streaming** — no buffering of large git bodies.

An open proxy is an SSRF and abuse vector. Never set `FORGE_ALLOW_ANY=1` in
production. Add rate limiting and a body-size cap at the reverse proxy.

## Forge tokens

A Forgejo token is valid only on the instance that issued it.

| Task | Scopes |
|------|--------|
| Browse public repositories | none, or `read:repository` |
| Read private repositories | `read:repository` |
| Push | `write:repository` |
| Create a repository | `write:repository`, `write:user` |

Use a dedicated bot for a shared deployment. Do not give a public demo a token
that can write or delete repositories.

The assistant never commits or pushes unless explicitly asked, and it does not
force-push or create branches. Those rules reduce the blast radius of a
mistaken action but do not replace a limited token.

## Untrusted content

The forge and the public data sources are untrusted input:

- repository READMEs and files are displayed as Markdown;
- module results are passed to the model;
- reports render agent-supplied text.

The UI sanitizes Markdown with `rehype-sanitize`. Report sections render
markdown-lite, not raw HTML. Images must be HTTPS and carry a known license.
Links are rendered as links, not executed.

Prompt injection is still possible: a malicious README can try to steer the
agent. Treat the forge as data, keep the token scoped, and review mutations
before accepting a proposal.

## Build-time secrets

The bundle contains only `VITE_*` values and the app version/hash. Do not put a
secret in any `VITE_*` variable: Vite inlines it into the public JavaScript.

The release procedure guards against private URLs and registry files leaking
into the public snapshot. See `RELEASE.md` in the repository.

## Dependencies

The module packages are installed from the `@tablette` npm scope and locked by
the root lockfile. They are part of the build, not loaded at runtime. Review a
module like any other dependency: code, data sources, license and attribution
are all visible in its descriptor.

## Reporting

Report a security issue privately to the maintainer rather than opening a
public issue with reproduction details.

## Next steps

- [Forge access](/guide/forge) — token and proxy configuration.
- [Forge proxy](/operations/proxy) — deployment hardening.
- [Configuration](/reference/configuration) — what is stored where.
