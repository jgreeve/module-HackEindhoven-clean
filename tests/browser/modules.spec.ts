import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test.beforeEach(async ({ page }) => {
  await page.route("**/forge-proxy/**", async (route) => {
    if (route.request().url().includes("gis-apps.yaml")) {
      const content = Buffer.from("gis_apps: 1\napps:\n  - id: remote-demo\n    path: apps/remote-demo\n    title: Remote demo\n").toString("base64");
      await route.fulfill({ json: { encoding: "base64", content } });
    } else {
      await route.fulfill({ status: 404, body: "No forge needed for this test" });
    }
  });
  await page.route("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js", async (route) => {
    await route.fulfill({ contentType: "application/javascript", body: await readFile("node_modules/leaflet/dist/leaflet.js", "utf8") });
  });
  await page.route("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", async (route) => {
    await route.fulfill({ contentType: "text/css", body: await readFile("node_modules/leaflet/dist/leaflet.css", "utf8") });
  });
  await page.route(/https:\/\/.*tile\.openstreetmap\.org\//, (route) => route.fulfill({
    contentType: "image/png",
    body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64"),
  }));
  await page.route("https://data.eindhoven.nl/**", async (route) => {
    const url = new URL(route.request().url());
    const record = { zaaknummer: "FIXTURE-1", omschrijving: "Test permit", status_oms: "Zaak gestart", adres: "Fixture Avenue 1", ddindiening: "2026-11-01", geo_point_2d: { lat: 51.44, lon: 5.47 } };
    let data: unknown;
    if (url.pathname.endsWith("/exports/geojson")) {
      data = { type: "FeatureCollection", features: [{ type: "Feature", properties: { wijknaam: "Fixture district", buurtnaam: "Fixture neighbourhood" }, geometry: { type: "Polygon", coordinates: [[[5.46, 51.43], [5.48, 51.43], [5.48, 51.45], [5.46, 51.45], [5.46, 51.43]]] } }] };
    } else if (url.pathname.endsWith("/exports/json")) {
      data = [record];
    } else if (url.searchParams.has("group_by")) {
      data = { results: [{ [url.searchParams.get("group_by")!]: "Zaak gestart", n: 1 }] };
    } else {
      data = { results: [{ n: 1 }] };
    }
    await route.fulfill({ json: data, headers: { "Access-Control-Allow-Origin": "*" } });
  });
});

test("a local module opens under Explore and hands its map to Sketch", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("studio.mode", "explore"));
  await page.goto("/");
  await page.getByRole("tab", { name: "Modules", exact: true }).click();
  const card = page.locator("article.module-card").filter({ has: page.getByRole("heading", { name: "Eindhoven", exact: true }) });
  await expect(card).toBeVisible();
  await expect(card.getByText("eindhoven_open_map", { exact: true })).toBeVisible();
  await card.getByRole("button", { name: "Open", exact: true }).click();
  const moduleFrame = page.frameLocator('iframe[title="Eindhoven module map"]');
  await expect(moduleFrame.locator("#status")).toContainText("Loaded 1 permit application");
  await page.getByRole("button", { name: "Open in Sketch", exact: true }).click();
  await expect(page.locator(".map-status-path")).toHaveText("maps/eindhoven.html");
  await expect(page.frameLocator("iframe.map-frame").locator("#status")).toContainText("Loaded 1 permit application");
  await page.getByRole("button", { name: /Samples/ }).click();
  await expect(page.getByRole("button", { name: /Eindhoven — open data/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remote demo", exact: true })).toBeVisible();
});

test("disabling a module excludes its samples while remote samples remain", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("studio.modules.overrides", JSON.stringify({ eindhoven: false })));
  await page.goto("/");
  await page.getByRole("button", { name: /Samples/ }).click();
  await expect(page.getByRole("button", { name: "Remote demo", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Eindhoven — open data/ })).toHaveCount(0);
});
