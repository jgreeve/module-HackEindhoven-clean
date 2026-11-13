# Studio forge proxy

A stateless, host-allowlisted CORS proxy that lets a browser-based Studio read
from a Forgejo instance on another origin. It forwards both the REST API and
git smart HTTP; the target's absolute URL is carried in the path, so one scheme
serves everything. It also fronts `bimr.net` so the agent can read the BIMR
help page (a plain `GET`, no credentials):

```
/forge-proxy/https://forge.example/api/v1/repos/search?q=x
/forge-proxy/https://forge.example/owner/repo.git/info/refs?service=git-upload-pack
```

It has **no dependencies** and no state. It exists because browsers enforce the
same-origin policy, and Forgejo never sends CORS headers on git routes.

## Run

```bash
# allow one or more forges (exact hosts or *.suffix wildcards)
FORGE_ALLOWED_HOSTS="artefacts.bimr.net,bimr.net,*.example.org" node proxy/node.mjs
```

Then point Studio at it: set **Proxy URL** in Settings to
`http://localhost:8787/forge-proxy/`, or serve it same-origin at
`/forge-proxy/`.

| Env | Default | Meaning |
|-----|---------|---------|
| `FORGE_ALLOWED_HOSTS` | _(empty)_ | Comma-separated allowlist. Empty denies every target. |
| `FORGE_ALLOW_ANY` | `0` | `1` allows any host — **development only**. |
| `FORGE_PROXY_PREFIX` | `/forge-proxy` | Mount prefix, stripped to resolve scheme-less targets. |
| `PORT` | `8787` | Listen port. |
| `HOST` | `127.0.0.1` | Listen address. |

## URL scheme

The absolute target URL is appended to the mount path. The proxy accepts two
shapes:

- **with scheme** — `/forge-proxy/https://host/path` (used for the REST API);
- **scheme-less** — `/forge-proxy/host/path`, which is what `isomorphic-git`'s
  `corsProxy` produces (it strips `https://`). The proxy strips the mount prefix
  (`FORGE_PROXY_PREFIX`) and assumes `https`.

Both are validated against the allowlist.

## Deployment

### Behind nginx (same-origin)

`nginx` merges repeated slashes by default, which would turn `https://` in the
path into `https:/`. Disable that for the proxy location:

```nginx
location /forge-proxy/ {
    merge_slashes off;
    proxy_pass http://127.0.0.1:8787;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_request_buffering off;
    proxy_buffering off;
    client_max_body_size 256m;
}
```

### systemd

```ini
[Unit]
Description=Studio forge proxy
After=network-online.target

[Service]
Environment=FORGE_ALLOWED_HOSTS=artefacts.bimr.net,bimr.net
Environment=PORT=8787
ExecStart=/usr/bin/node /srv/studio/proxy/node.mjs
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

### Edge / serverless

`proxy/proxy.mjs` exports a Web `fetch` handler and a `default { fetch }`
object, so it also runs on Cloudflare Workers, Deno Deploy and Vercel Edge
without changes. Provide the allowlist via the runtime's env binding; the
handler reads `FORGE_ALLOWED_HOSTS` from `process.env` or `globalThis`.

## Development

The Vite dev server mounts the same handler at `/forge-proxy/` (see
`vite.config.ts`), so development and production share one implementation. In
dev, `FORGE_ALLOW_ANY` is enabled automatically when no allowlist is set.

## Security

- **Deny by default.** An open proxy is an SSRF and abuse vector; always set
  `FORGE_ALLOWED_HOSTS` in production.
- **HTTPS only**, except `http://localhost` for local development.
- Browser credentials (`Cookie`, `Origin`, `Referer`) are stripped before
  forwarding; `Set-Cookie` is stripped from responses.
- `Authorization` and request/response bodies are never logged.
- Bodies are streamed (no buffering); put rate limiting and a body-size cap in
  the reverse proxy in front (see the nginx block above).

## Test

```bash
node --test proxy/proxy.test.mjs
```
