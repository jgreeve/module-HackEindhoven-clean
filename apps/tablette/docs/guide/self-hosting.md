# Self-hosting

Tablette is a static single-page app. You can host `dist/` on any web server and
add the optional forge proxy when browsers must reach a Forgejo instance
without CORS.

## Build

```bash
npm ci
npm run build
```

The output is `dist/`. The default build bakes in a same-origin proxy path:

```text
VITE_FORGE_PROXY=/forge-proxy/
```

Set it to another URL, or to an empty string for a direct/CORS-enabled forge:

```bash
VITE_FORGE_PROXY=https://proxy.example/forge-proxy/ npm run build
VITE_FORGE_PROXY="" npm run build
```

The documentation base URL is also a build-time value:

```bash
VITE_DOCS_BASE=https://docs.tablette.bimr.net npm run build
```

Module catalogue links use it. The default is
`https://docs.tablette.bimr.net`.

## Serve

Any static file server works. The app is a single-page application, so route
unknown paths to `index.html`.

```nginx
server {
    listen 8087;
    server_name studio.example;

    root /srv/tablette/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /forge-proxy/ {
        merge_slashes off;
        proxy_pass http://127.0.0.1:8787;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_request_buffering off;
        proxy_buffering off;
        client_max_body_size 256m;
    }
}
```

`merge_slashes off;` matters: nginx collapses `https://` in the proxy path
otherwise, and the proxy cannot resolve the target.

## The optional proxy

The proxy is a single dependency-free Node file. It is stateless and holds no
secrets.

```bash
FORGE_ALLOWED_HOSTS="artefacts.bimr.net,bimr.net" \
PORT=8787 HOST=127.0.0.1 \
node proxy/node.mjs
```

| Variable | Default | Meaning |
|----------|---------|---------|
| `FORGE_ALLOWED_HOSTS` | empty | Comma-separated exact hosts or `*.suffix` |
| `FORGE_ALLOW_ANY` | `0` | Allow any host; development only |
| `FORGE_PROXY_PREFIX` | `/forge-proxy` | Mount prefix |
| `PORT` | `8787` | Listen port |
| `HOST` | `127.0.0.1` | Listen address |

Deny-by-default is intentional: an open proxy is an SSRF and abuse vector. Add
rate limiting and a body-size cap at the reverse proxy.

See [Forge proxy](/operations/proxy) for the full deployment notes.

## What is not in the build

`dist/` contains only static assets. There is no server-side rendering, no
session store and no secret store. Anything the app needs at runtime comes
from:

- the browser's own storage;
- the model provider;
- the forge and its proxy;
- public data-source APIs used by enabled modules.

## Runtime assets

`npm run build` runs `prebuild`: it syncs the BIMR MicroPython runtime and
samples from `@bimr/web` and regenerates the module registry. Both steps need
the npm dependencies to be installed.

The synced directories `public/mp/` and `public/samples/` are generated and
ignored by git. `src/modules/bimr/viewer.mjs` is tracked and must not be edited
by hand.

## Checklist

- [ ] `npm ci` resolves `@bimr` and `@tablette` packages.
- [ ] `npm run typecheck` passes.
- [ ] `npm run build` produces `dist/`.
- [ ] The static server falls back to `index.html`.
- [ ] The forge proxy is allowlisted and reachable.
- [ ] `VITE_DOCS_BASE` points at the docs site.
- [ ] No build-time secret is baked into the bundle.

## Next steps

- [Forge proxy](/operations/proxy) — nginx, systemd and edge deployments.
- [Docs site](/operations/docs-site) — build and publish this documentation.
- [Security](/reference/security) — what a public deployment exposes.
