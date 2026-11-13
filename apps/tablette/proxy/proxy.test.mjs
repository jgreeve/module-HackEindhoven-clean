// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// proxy/proxy.test.mjs — handler tests. Run with:
//
//   node --test proxy/proxy.test.mjs

import test, { after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { handleFetch } from "./proxy.mjs";

const originalFetch = globalThis.fetch;

function stubFetch(impl) {
  globalThis.fetch = async (input, init) => {
    if (impl) return impl(input, init);
    return new Response("upstream-ok", {
      status: 200,
      headers: { "content-type": "text/plain" },
    });
  };
}

function proxyRequest(path, init = {}) {
  return new Request(`http://studio.test/forge-proxy/${path}`, init);
}

beforeEach(() => {
  process.env.FORGE_ALLOWED_HOSTS = "artefacts.bimr.net,*.example.org";
  delete process.env.FORGE_ALLOW_ANY;
  stubFetch();
});

after(() => {
  globalThis.fetch = originalFetch;
});

test("health endpoint identifies the proxy", async () => {
  const res = await handleFetch(proxyRequest("__health"));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("x-forge-proxy"), "1");
  const body = await res.json();
  assert.equal(body.ok, true);
});

test("rejects a host outside the allowlist", async () => {
  const res = await handleFetch(proxyRequest("https://evil.test/api"));
  assert.equal(res.status, 403);
});

test("rejects plain http to a remote host", async () => {
  const res = await handleFetch(proxyRequest("http://artefacts.bimr.net/api"));
  assert.equal(res.status, 403);
});

test("rejects a request with no target", async () => {
  const res = await handleFetch(proxyRequest(""));
  assert.equal(res.status, 400);
});

test("treats an unknown scheme-less segment as a host and denies it", async () => {
  const res = await handleFetch(proxyRequest("not-a-url"));
  assert.equal(res.status, 403);
});

test("wildcard allowlist matches subdomains", async () => {
  const res = await handleFetch(proxyRequest("https://api.example.org/x"));
  assert.equal(res.status, 200);
});

test("forwards an allowed request and strips browser credentials", async () => {
  let seen;
  stubFetch((input, init) => {
    seen = { input, init };
    return new Response("ok", { status: 200 });
  });

  const request = proxyRequest("https://artefacts.bimr.net/api/v1/version", {
    headers: {
      cookie: "session=secret",
      origin: "http://studio.test",
      referer: "http://studio.test/",
      authorization: "token abc",
    },
  });
  const res = await handleFetch(request);

  assert.equal(res.status, 200);
  assert.equal(String(seen.input), "https://artefacts.bimr.net/api/v1/version");
  assert.equal(seen.init.headers.get("cookie"), null);
  assert.equal(seen.init.headers.get("origin"), null);
  assert.equal(seen.init.headers.get("referer"), null);
  assert.equal(seen.init.headers.get("authorization"), "token abc");
});

test("forwards a scheme-less target (isomorphic-git corsProxy form)", async () => {
  let seen;
  stubFetch((input) => {
    seen = input;
    return new Response("ok", { status: 200 });
  });

  const res = await handleFetch(
    proxyRequest("artefacts.bimr.net/bot/studio-demo.git/info/refs?service=git-upload-pack"),
  );

  assert.equal(res.status, 200);
  assert.equal(
    String(seen),
    "https://artefacts.bimr.net/bot/studio-demo.git/info/refs?service=git-upload-pack",
  );
});

test("handles the extra slash isomorphic-git inserts", async () => {
  let seen;
  stubFetch((input) => {
    seen = input;
    return new Response("ok", { status: 200 });
  });

  const res = await handleFetch(proxyRequest("/artefacts.bimr.net/x"));

  assert.equal(res.status, 200);
  assert.equal(String(seen), "https://artefacts.bimr.net/x");
});

test("answers CORS preflight without hitting the forge", async () => {
  let called = false;
  stubFetch(() => {
    called = true;
    return new Response("nope", { status: 500 });
  });

  const request = proxyRequest("https://artefacts.bimr.net/api/v1/version", {
    method: "OPTIONS",
    headers: {
      origin: "http://studio.test",
      "access-control-request-method": "GET",
      "access-control-request-headers": "authorization",
    },
  });
  const res = await handleFetch(request);

  assert.equal(res.status, 204);
  assert.equal(res.headers.get("access-control-allow-origin"), "http://studio.test");
  assert.match(res.headers.get("access-control-allow-headers"), /authorization/i);
  assert.equal(called, false);
});

test("drops set-cookie and adds CORS headers to the response", async () => {
  stubFetch(
    () =>
      new Response("ok", {
        status: 200,
        headers: { "set-cookie": "a=b", "content-type": "text/plain" },
      }),
  );

  const request = proxyRequest("https://artefacts.bimr.net/x", {
    headers: { origin: "http://studio.test" },
  });
  const res = await handleFetch(request);

  assert.equal(res.headers.get("set-cookie"), null);
  assert.equal(res.headers.get("access-control-allow-origin"), "http://studio.test");
});

test("FORGE_ALLOW_ANY allows any host", async () => {
  process.env.FORGE_ALLOW_ANY = "1";
  const res = await handleFetch(proxyRequest("https://anything.test/x"));
  assert.equal(res.status, 200);
});
