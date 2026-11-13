import { test, expect, type Page } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { posix } from "node:path";
const KEY = "fellenoord-samen.data.v1";
async function openModule(page: Page) {
  await page.goto("/");
  await page.getByRole("tab", { name: "Modules", exact: true }).click();
  const card = page.locator("article.module-card").filter({ has: page.getByRole("heading", { name: "Fellenoord Samen", exact: true }) });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Open", exact: true }).click();
  const surface = page.getByTestId("fellenoord-surface");
  await expect(surface.getByRole("heading", { name: "Fellenoord Samen", exact: true })).toBeVisible();
  await expect(surface.locator(".fs-marker").first()).toBeVisible();
  return surface;
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("studio.mode", "explore"));
  await page.route("**/forge-proxy/**", route => route.fulfill({ status: 404, body: "No forge in local participation tests" }));
  await page.route("https://tile.openstreetmap.org/**", route => route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64") }));
});

test("project filters, map selection, illustrations, comments and replies persist in Tablette", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  const surface = await openModule(page);
  await surface.getByRole("searchbox").fill("onvindbaar");
  await expect(surface.getByText(/Geen plekken gevonden/)).toBeVisible();
  await surface.getByRole("button", { name: "Wis filters" }).click();
  await surface.getByLabel("Onderwerp", { exact: true }).selectOption("groen");
  await expect(surface.locator(".fs-card")).toHaveCount(1);
  await expect(surface.locator(".fs-marker")).toHaveCount(1);
  await surface.locator(".fs-marker").click();
  await expect(surface.getByRole("heading", { name: "Meer ruimte voor de Dommel" })).toBeVisible();
  await surface.getByRole("button", { name: "Schetsplan", exact: true }).click();
  await expect(surface.getByRole("img", { name: /Schetsplan/ })).toBeVisible();
  await surface.getByLabel("Jouw reactie").fill("Meer groen en een breed wandelpad, graag.");
  await surface.getByRole("button", { name: "Plaats reactie", exact: true }).click();
  await expect(surface.getByText("Meer groen en een breed wandelpad, graag.", { exact: true })).toBeVisible();
  await surface.getByRole("button", { name: /Reageer · Buurtbewoner A/ }).click();
  await surface.getByLabel("Jouw reactie").fill("En een bankje om uit te rusten.");
  await surface.getByRole("button", { name: "Plaats reactie", exact: true }).click();
  await expect(surface.locator(".fs-replies")).toContainText("En een bankje om uit te rusten.");
  await openModule(page);
  await surface.locator(".fs-card").filter({ hasText: "Meer ruimte voor de Dommel" }).click();
  await expect(surface.locator(".fs-replies")).toContainText("En een bankje om uit te rusten.");
  await expect(page.locator(".pane.chat")).toBeVisible();
  expect(errors).toEqual([]);
});

test("map-pin idea workflow supports back/cancel/review, persistence, identity support and safe text", async ({ page }) => {
  const surface = await openModule(page);
  await surface.getByRole("button", { name: /Deel je idee/ }).click();
  await surface.getByRole("button", { name: "Bevestig deze plek" }).click();
  await expect(surface.getByRole("alert")).toContainText("Kies eerst een plek");
  const map = surface.getByTestId("fellenoord-map");
  await map.click({ position: { x: 15, y: 85 } });
  await expect(surface.getByRole("alert")).toContainText("buiten het demogebied");
  const box = await map.boundingBox();
  await map.click({ position: { x: box!.width / 2, y: box!.height / 2 } });
  await expect(surface.getByText(/Gekozen coördinaten/)).toBeVisible();
  await surface.getByRole("button", { name: "Bevestig deze plek" }).click();
  await surface.getByLabel("Titel van je idee").fill("Een toegankelijke buurttuin");
  await surface.getByLabel("Onderwerp", { exact: true }).selectOption("groen");
  const description = "Een tuin voor iedereen, met brede paden. <img src=x onerror=alert(1)>";
  await surface.getByLabel("Wat stel je voor?").fill(description);
  await surface.getByRole("button", { name: "Bekijk je idee" }).click();
  await expect(surface.getByText(description, { exact: true })).toBeVisible();
  await expect(surface.locator(".fs-wizard img")).toHaveCount(0);
  await surface.getByRole("button", { name: "Vorige stap" }).click();
  await expect(surface.getByLabel("Titel van je idee")).toHaveValue("Een toegankelijke buurttuin");
  await surface.getByRole("button", { name: "Bekijk je idee" }).click();
  await surface.getByRole("button", { name: "Publiceer lokaal" }).click();
  await expect(surface.getByRole("heading", { name: "Een toegankelijke buurttuin" })).toBeVisible();
  await surface.getByRole("button", { name: "Steun dit idee", exact: true }).click();
  await expect(surface.getByText("1 steunbetuigingen", { exact: true })).toBeVisible();
  await surface.getByLabel("Je doet mee als").selectOption("resident-b");
  await surface.getByRole("button", { name: "Steun dit idee", exact: true }).click();
  await expect(surface.getByText("2 steunbetuigingen", { exact: true })).toBeVisible();
  await surface.getByRole("button", { name: "Trek mijn steun in", exact: true }).click();
  await expect(surface.getByText("1 steunbetuigingen", { exact: true })).toBeVisible();
  await surface.getByLabel("Jouw reactie").fill("Een mooie plek om buren te ontmoeten.");
  await surface.getByRole("button", { name: "Plaats reactie", exact: true }).click();
  await openModule(page);
  await surface.getByRole("tab", { name: "Ideeën uit de buurt", exact: true }).click();
  await surface.locator(".fs-card").filter({ hasText: "Een toegankelijke buurttuin" }).click();
  await expect(surface.getByText("1 steunbetuigingen", { exact: true })).toBeVisible();
  await expect(surface.getByText("Een mooie plek om buren te ontmoeten.", { exact: true })).toBeVisible();
  await surface.getByRole("button", { name: /Deel je idee/ }).click();
  await surface.getByLabel("Kies een herkenbare plek").selectOption("0");
  await surface.getByRole("button", { name: "Annuleren", exact: true }).click();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).ideas.length, KEY)).toBe(3);
});

test("damaged storage is preserved, exported and reset only with confirmation; host data is untouched", async ({ page }) => {
  await page.addInitScript(key => { localStorage.setItem(key, '{"version":99,"preserve":"yes"}'); localStorage.setItem("other-module.sentinel", "keep"); }, KEY);
  const surface = await openModule(page);
  await expect(surface.getByRole("alert")).toContainText("niet overschreven");
  const downloadPromise = page.waitForEvent("download");
  await surface.getByRole("button", { name: "Exporteer lokale gegevens" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("fellenoord-samen-demo.json");
  expect(await page.evaluate(key => localStorage.getItem(key), KEY)).toBe('{"version":99,"preserve":"yes"}');
  page.once("dialog", dialog => dialog.dismiss());
  await surface.getByRole("button", { name: "Herstel demo", exact: true }).click();
  await expect(surface.getByRole("alert")).toBeVisible();
  page.once("dialog", dialog => dialog.accept());
  await surface.getByRole("button", { name: "Herstel demo", exact: true }).click();
  await expect(surface.getByRole("alert")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("other-module.sentinel"))).toBe("keep");
});

test("narrow layout and failed tiles keep an accessible landmark idea path working", async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 900 });
  await page.route("https://tile.openstreetmap.org/**", route => route.abort());
  const surface = await openModule(page);
  await expect(surface.getByText(/achtergrondkaart kon niet laden/)).toBeVisible();
  await surface.getByRole("button", { name: /Deel je idee/ }).click();
  await surface.getByLabel("Kies een herkenbare plek").selectOption("2");
  await surface.getByRole("button", { name: "Bevestig deze plek" }).click();
  await expect(surface.getByLabel("Titel van je idee")).toBeVisible();
  expect(await surface.evaluate(el => el.scrollWidth <= el.clientWidth + 2)).toBe(true);
  await page.screenshot({ path: "test-results/fellenoord-narrow.png", fullPage: true });
});

test("SDK chat tools discover places and update the open Surface while retaining an unfinished draft", async ({ page }) => {
  await page.setViewportSize({ width: 1800, height: 1100 });
  const surface = await openModule(page);
  await page.screenshot({ path: "test-results/fellenoord-desktop.png", fullPage: true });
  const moduleUrl = posix.join("/@fs", fileURLToPath(new URL("../../packages/module-fellenoord-samen/dist/index.js", import.meta.url)).replaceAll("\\", "/"));
  const runTool = (select: boolean) => page.evaluate(async ({ moduleUrl, select }) => {
    const { moduleDescriptor } = await import(moduleUrl);
    const tools = moduleDescriptor.createTools({ mode: "explore", settings: {}, enabled: new Set(["fellenoord-samen"]), credits: [], trace: () => {}, now: () => 0, fetch: () => { throw new Error("unexpected network"); } });
    const options = { toolCallId: "browser-smoke", messages: [] };
    const found = JSON.parse(await tools["fellenoord-samen_search"].execute({ query: "Dommel", kind: "project" }, options));
    return JSON.parse(await tools["fellenoord-samen_detail"].execute({ id: found.places[0].id, select }, options));
  }, { moduleUrl, select });
  const result = await runTool(true);
  expect(result.place.id).toBe("project-dommel");
  await expect(surface.getByRole("heading", { name: "Meer ruimte voor de Dommel" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Explore ▾", exact: true })).toBeVisible();
  await surface.getByRole("button", { name: /Deel je idee/ }).click();
  await surface.getByLabel("Kies een herkenbare plek").selectOption("0");
  await surface.getByRole("button", { name: "Bevestig deze plek" }).click();
  await surface.getByLabel("Titel van je idee").fill("Mijn concept blijft bestaan");
  await runTool(true);
  await expect(surface.getByLabel("Titel van je idee")).toHaveValue("Mijn concept blijft bestaan");
});

test("storage quota failure leaves the review open and never claims publication", async ({ page }) => {
  await page.addInitScript(key => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) { if (name === key) throw new DOMException("Quota exceeded", "QuotaExceededError"); original.call(this, name, value); };
  }, KEY);
  const surface = await openModule(page);
  await surface.getByRole("button", { name: /Deel je idee/ }).click();
  await surface.getByLabel("Kies een herkenbare plek").selectOption("0");
  await surface.getByRole("button", { name: "Bevestig deze plek" }).click();
  await surface.getByLabel("Titel van je idee").fill("Meer groen voor iedereen");
  await surface.getByLabel("Wat stel je voor?").fill("Maak ruimte voor een brede groene strook met bomen en bankjes.");
  await surface.getByRole("button", { name: "Bekijk je idee" }).click();
  await surface.getByRole("button", { name: "Publiceer lokaal" }).click();
  await expect(surface.getByRole("alert")).toContainText("niet gepubliceerd");
  await expect(surface.getByRole("button", { name: "Publiceer lokaal" })).toBeVisible();
  await expect(surface.getByText(/Je idee staat op de kaart/)).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), KEY)).toBe(null);
});
