# Settings

Open **Settings** with the gear icon in the top bar. The dialog has three tabs:
**Model**, **Forge** and **Modules**. Everything is stored in the browser.

## Model

| Field | Meaning |
|-------|---------|
| Provider preset | OpenRouter or DeepSeek; fills the base URL and a default model |
| Base URL | OpenAI-compatible endpoint, for example `https://openrouter.ai/api/v1` |
| API key | Provider key; stored locally and sent only to that base URL |
| Model | Model id, for example `deepseek/deepseek-v4-flash` |

The presets exist because key formats and base URLs must match. An OpenRouter
key against the DeepSeek endpoint returns `401`, and the reverse is also true.

You can use another OpenAI-compatible provider by typing its base URL, key and
model id. The agent uses the Vercel AI SDK with `@ai-sdk/openai`, so the
endpoint must accept the OpenAI chat-completions shape.

::: warning Client-side keys
The key is in `localStorage` under `studio.agentConfig`. It is readable by any
script on the origin. Use a dedicated key with a spending limit, and read
[Security](/reference/security) before exposing a deployment publicly.
:::

## Forge

| Field | Meaning |
|-------|---------|
| Forge URL | Base URL of the Forgejo instance, for example `https://artefacts.bimr.net` |
| Bot user | Owner used for discovery defaults |
| Access token | Forgejo token with the scopes you need |
| Proxy URL | Optional CORS proxy base ending in `/`; empty means auto/direct |

The forge is optional. Without it the workspace and the map app still work; the
forge tools return an error that the agent can ignore.

The token is stored in the same local configuration. Give it the smallest
scopes that work: read access for browsing, write access only if you intend to
push from the Studio.

## Modules

The Modules tab shows every installed module with:

- its label, version and description;
- the modes it supports;
- its tools;
- its data sources and licenses;
- its attribution lines;
- an enable/disable toggle;
- a **Feature page** link to this site.

Changes are immediate and do not need a Save. The Settings dialog's Cancel
button does not undo module toggles.

## Proxy URL resolution

The forge proxy URL is resolved in this order:

1. the **Proxy URL** setting;
2. the dev server proxy (`/forge-proxy/`) in development;
3. the build-time `VITE_FORGE_PROXY` value;
4. direct requests to the forge.

A build with `VITE_FORGE_PROXY=/forge-proxy/` expects the proxy to be mounted at
that path on the same origin. Set `VITE_FORGE_PROXY=""` to build for a
CORS-enabled forge and no proxy.

## Local storage keys

| Key | Content |
|-----|---------|
| `studio.agentConfig` | Model and forge configuration |
| `studio.mode` | Current mode |
| `studio.modules.overrides` | Module enable/disable overrides |
| `studio.module.<id>` | Per-module settings |
| `studio.promptHistory` | Prompt recall |
| `studio.usage` | Token and cost totals |
| `studio.learn.*` | Lesson progress |
| IndexedDB `studio-fs` | Workspace files and git data |

Clearing site data removes all of it. There is no server-side copy.

## Version

The bottom of the Settings dialog shows the app version and the current commit
hash. Include both in a bug report.

## Next steps

- [Forge access](/guide/forge) — configure and use the forge.
- [Configuration](/reference/configuration) — build-time environment variables.
- [Troubleshooting](/guide/troubleshooting) — common configuration errors.
