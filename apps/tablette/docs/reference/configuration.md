# Configuration

Tablette has two kinds of configuration: **build-time environment variables**
and **browser-persisted settings**. There are no server-side secrets.

## Build-time environment

Set these in the shell that runs `npm run build` (or `npm run dev`).

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_FORGE_PROXY` | `/forge-proxy/` | Proxy base baked into the bundle. Empty means direct/CORS. |
| `VITE_DOCS_BASE` | `https://docs.tablette.bimr.net` | Base URL for module documentation links |
| `FORGE_ALLOWED_HOSTS` | empty | Proxy allowlist (dev/preview and standalone proxy) |
| `FORGE_ALLOW_ANY` | `0` | Allow any proxy target; development only |
| `FORGE_PROXY_PREFIX` | `/forge-proxy` | Proxy mount prefix |
| `PORT` | `8787` | Proxy listen port |
| `HOST` | `127.0.0.1` | Proxy listen address |
| `STUDIO_MODULES` | empty | Comma-separated module ids to include in the generated registry |
| `STUDIO_REGISTRY_OUT` | `src/modules/registry.generated.ts` | Registry output path |
| `BIMR_WEB_DIR` | `$HOME/SOURCES/BIMR/bimr-web` | Local `@bimr/web` checkout for `sync:bimr` |

### Examples

```bash
# same-origin proxy, production build
VITE_FORGE_PROXY=/forge-proxy/ npm run build

# no proxy: the forge must send CORS headers
VITE_FORGE_PROXY="" npm run build

# a subset of modules for a demo build
STUDIO_MODULES=wikidata,wikimedia npm run build
```

`VITE_APP_VERSION` and `VITE_GIT_HASH` are injected by `vite.config.ts` from
`package.json` and `git rev-parse`; they are not set by hand.

## Browser settings

Open **Settings** (gear icon). The values are stored in `localStorage` under
`studio.agentConfig`:

| Field | Default | Meaning |
|-------|---------|---------|
| `baseUrl` | `https://openrouter.ai/api/v1` | OpenAI-compatible endpoint |
| `apiKey` | empty | Provider key |
| `model` | `deepseek/deepseek-v4-flash` | Model id |
| `temperature` | `0.4` | Sampling temperature |
| `forgeUrl` | `https://artefacts.bimr.net` | Forgejo base URL |
| `forgeUser` | `bot` | Default owner |
| `forgeToken` | empty | Forgejo token |
| `proxyUrl` | empty | CORS proxy base ending in `/` |

### Provider presets

| Preset | Base URL | Model | Key format |
|--------|----------|-------|------------|
| OpenRouter | `https://openrouter.ai/api/v1` | `deepseek/deepseek-v4-flash` | `sk-or-v1-...` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-flash` | `sk-...` |

The preset and key must match. Another OpenAI-compatible endpoint works if it
implements the chat-completions API.

## Local storage keys

| Key | Content |
|-----|---------|
| `studio.agentConfig` | Model and forge configuration |
| `studio.mode` | Current mode (`sketch`, `explore`, `learn`, `build`) |
| `studio.modules.overrides` | Module enable/disable overrides |
| `studio.module.<id>` | Per-module settings |
| `studio.promptHistory` | Prompt recall |
| `studio.usage` | Token and cost totals |
| `studio.learn.*` | Lesson progress |
| IndexedDB `studio-fs` | Workspace and git data |

All of it is per-origin. Clearing site data removes it.

## Proxy resolution

`src/forge/proxy.ts` resolves the proxy base in this order:

1. the `proxyUrl` setting;
2. `/forge-proxy/` in development;
3. `VITE_FORGE_PROXY` from the build;
4. direct access.

The proxy accepts two path shapes:

```text
/forge-proxy/https://forge.example/api/v1/...
/forge-proxy/forge.example/api/v1/...
```

The second is what isomorphic-git produces when it strips the scheme.

## Documentation site

The docs site is a separate VitePress build:

```bash
npm run docs:dev
npm run docs:build
npm run docs:preview
```

It reads `docs/` and writes `docs/.vitepress/dist`. The site URL is
`https://docs.tablette.bimr.net`; see [Docs site](/operations/docs-site).

## Next steps

- [Settings](/guide/settings) — the UI fields.
- [Self-hosting](/guide/self-hosting) — build and serve.
- [Forge proxy](/operations/proxy) — runtime environment.
