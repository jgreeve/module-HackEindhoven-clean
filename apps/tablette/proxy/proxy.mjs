// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// proxy/proxy.mjs — a stateless, host-allowlisted CORS proxy for the forge.
//
// A browser can only read a response from a forge on another origin when the
// forge sends CORS headers, and Forgejo never sends them on git routes. This
// proxy makes the forge reachable through Studio's own origin: the target's
// absolute URL is carried in the path, so one scheme serves both the REST API
// and isomorphic-git's `corsProxy`.
//
//   GET /forge-proxy/https://forge.example/api/v1/repos/search?q=x
//   GET /forge-proxy/https://forge.example/owner/repo.git/info/refs?...
//
// It is runtime-agnostic (Web Fetch API): it runs on Node, Deno, Bun and edge
// runtimes. `proxy/node.mjs` is the Node entry point. No dependencies.
//
// Configuration (env, or a `globalThis` string of the same name):
//   FORGE_ALLOWED_HOSTS  comma-separated allowlist; exact hosts or `*.suffix`.
//                        Empty means deny all.
//   FORGE_ALLOW_ANY=1    allow any host (development only — never in prod).

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "proxy-connection",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

// Headers never forwarded to the forge: the proxy is the client, so the
// browser's Cookie/Origin/Referer must not travel, and length is recomputed.
const REQUEST_DROP = new Set(["cookie", "host", "origin", "referer", "content-length"]);

// Headers never forwarded to the browser: cookies are dropped, and length /
// encoding are recomputed because the body is streamed.
const RESPONSE_DROP = new Set(["set-cookie", "content-encoding", "content-length"]);

function env(name) {
  const fromProcess = globalThis.process?.env?.[name];
  if (fromProcess !== undefined) return fromProcess;
  const fromGlobal = globalThis[name];
  return typeof fromGlobal === "string" ? fromGlobal : undefined;
}

function allowAny() {
  return env("FORGE_ALLOW_ANY") === "1";
}

function allowedHosts() {
  return (env("FORGE_ALLOWED_HOSTS") ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function hostAllowed(host) {
  if (allowAny()) return true;
  const hostname = host.toLowerCase();
  for (const pattern of allowedHosts()) {
    if (pattern === hostname) return true;
    if (pattern.startsWith("*.") && hostname.endsWith(pattern.slice(1))) return true;
  }
  return false;
}

function isLocalhost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

/** The mount prefix, so scheme-less targets can be recognised. */
function proxyPrefix() {
  return (env("FORGE_PROXY_PREFIX") ?? "/forge-proxy").replace(/\/+$/, "");
}

/** The absolute target URL carried in the request path, or null. */
function extractTarget(requestUrl) {
  const url = new URL(requestUrl);
  const rest = `${url.pathname}${url.search}`;

  // Form 1: the target carries its scheme — /forge-proxy/https://host/path.
  const match = rest.match(/https?:\/\/.+/i) ?? rest.match(/https?:\/{1,2}.+/i);
  if (match) {
    const normalized = match[0].replace(/^(https?):\/+/, "$1://");
    try {
      return new URL(normalized);
    } catch {
      return null;
    }
  }

  // Form 2: scheme-less — isomorphic-git's corsProxy strips "https://" and
  // produces /<prefix>/<host>/<path>. Strip the mount prefix and assume https.
  const prefix = proxyPrefix();
  let rest2 = rest;
  if (prefix && (rest2 === prefix || rest2.startsWith(`${prefix}/`))) {
    rest2 = rest2.slice(prefix.length);
  }
  rest2 = rest2.replace(/^\/+/, "");
  if (!rest2) return null;
  try {
    return new URL(`https://${rest2}`);
  } catch {
    return null;
  }
}

/** Why the target is refused, or null when it is allowed. */
function targetError(target) {
  const secure = target.protocol === "https:";
  const localHttp = target.protocol === "http:" && isLocalhost(target.hostname);
  if (!secure && !localHttp) return "only https targets are allowed";
  if (!hostAllowed(target.host)) return `host not allowed: ${target.host}`;
  return null;
}

function corsHeaders(origin) {
  const headers = new Headers();
  headers.set("access-control-allow-origin", origin || "*");
  headers.set("access-control-expose-headers", "Content-Type, Content-Length, X-Total-Count, Link");
  if (origin) headers.append("vary", "Origin");
  return headers;
}

function preflight(origin, requestedHeaders) {
  const headers = corsHeaders(origin);
  headers.set("access-control-allow-methods", "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS");
  headers.set("access-control-allow-headers", requestedHeaders || "Authorization, Content-Type, Accept");
  headers.set("access-control-max-age", "600");
  return new Response(null, { status: 204, headers });
}

function json(body, status, origin) {
  const headers = corsHeaders(origin);
  headers.set("content-type", "application/json");
  headers.set("cache-control", "no-store");
  headers.set("x-forge-proxy", "1");
  return new Response(JSON.stringify(body), { status, headers });
}

function forwardRequestHeaders(headers) {
  const out = new Headers();
  for (const [name, value] of headers) {
    const lower = name.toLowerCase();
    if (HOP_BY_HOP.has(lower) || REQUEST_DROP.has(lower)) continue;
    out.set(name, value);
  }
  return out;
}

function forwardResponseHeaders(headers, origin) {
  const out = corsHeaders(origin);
  for (const [name, value] of headers) {
    const lower = name.toLowerCase();
    if (HOP_BY_HOP.has(lower) || RESPONSE_DROP.has(lower)) continue;
    if (lower.startsWith("access-control-")) continue;
    out.set(name, value);
  }
  return out;
}

/** The proxy handler: forward one request to its allowlisted target. */
export async function handleFetch(request) {
  const origin = request.headers.get("origin") || "";
  const url = new URL(request.url);

  const healthPath = `${proxyPrefix()}/__health`;
  if (url.pathname === healthPath || url.pathname === "/__health") {
    return json({ ok: true, proxy: "studio", allowAny: allowAny() }, 200, origin);
  }

  if (request.method === "OPTIONS" && request.headers.get("access-control-request-method")) {
    return preflight(origin, request.headers.get("access-control-request-headers"));
  }

  const target = extractTarget(request.url);
  if (!target) return json({ error: "no target url in path" }, 400, origin);

  const blocked = targetError(target);
  if (blocked) return json({ error: blocked }, 403, origin);

  const init = {
    method: request.method,
    headers: forwardRequestHeaders(request.headers),
  };
  const hasBody = request.method !== "GET" && request.method !== "HEAD" && request.body;
  if (hasBody) {
    init.body = request.body;
    init.duplex = "half";
  }

  let upstream;
  try {
    upstream = await globalThis.fetch(target, init);
  } catch (err) {
    return json({ error: `upstream fetch failed: ${err?.message ?? err}` }, 502, origin);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: forwardResponseHeaders(upstream.headers, origin),
  });
}

export default { fetch: handleFetch };
