// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// proxy/node.mjs — the Node entry point for the Studio forge proxy.
//
// Bridges Node's http request/response to the Web Fetch handler in
// `proxy.mjs`, and starts a server when run directly:
//
//   FORGE_ALLOWED_HOSTS=artefacts.bimr.net,bimr.net node proxy/node.mjs
//
// It is also imported by the Vite dev server to mount the same handler, so
// development and production share one implementation.

import http from "node:http";
import { Readable } from "node:stream";
import { pathToFileURL } from "node:url";
import { handleFetch } from "./proxy.mjs";

/** Build a Web Request from a Node incoming message. */
export function toWebRequest(req) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) for (const entry of value) headers.append(name, entry);
    else headers.set(name, value);
  }

  const method = req.method ?? "GET";
  const init = { method, headers };
  if (method !== "GET" && method !== "HEAD") {
    init.body = Readable.toWeb(req);
    init.duplex = "half";
  }
  return new Request(url, init);
}

/** Write a Web Response to a Node server response. */
export async function sendWebResponse(res, response) {
  res.statusCode = response.status;
  if (response.statusText) res.statusMessage = response.statusText;
  response.headers.forEach((value, name) => res.setHeader(name, value));
  if (response.body) Readable.fromWeb(response.body).pipe(res);
  else res.end();
}

/** Handle one Node request/response pair through the proxy handler. */
export async function handleNode(req, res) {
  try {
    const response = await handleFetch(toWebRequest(req));
    await sendWebResponse(res, response);
  } catch (err) {
    if (!res.headersSent) res.statusCode = 502;
    res.end(`proxy error: ${err?.message ?? err}`);
  }
}

export function startServer({
  port = Number(process.env.PORT ?? 8787),
  host = process.env.HOST ?? "127.0.0.1",
} = {}) {
  const server = http.createServer((req, res) => {
    void handleNode(req, res);
  });
  server.listen(port, host, () => {
    console.log(`studio forge proxy: http://${host}:${port}/forge-proxy/`);
    if (!process.env.FORGE_ALLOWED_HOSTS && process.env.FORGE_ALLOW_ANY !== "1") {
      console.warn(
        "studio forge proxy: FORGE_ALLOWED_HOSTS is empty — all targets are denied. " +
          "Set it, or FORGE_ALLOW_ANY=1 for development.",
      );
    }
  });
  return server;
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) startServer();
