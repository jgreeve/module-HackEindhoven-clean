import assert from "node:assert/strict";
import test from "node:test";
import { validateModules } from "@tablette/module-sdk";
import { moduleDescriptor } from "../dist/index.js";
import { createStore, decodeData, STORAGE_KEY } from "../src/store";
import { boundary, inFellenoord, landmarks } from "../src/geo";
import { projects, seedData } from "../src/data";
import { nl } from "../src/copy";
import { matchingPlaces } from "../src/search";

test("module descriptor implements the shared SDK contract", () => {
  assert.deepEqual(validateModules([moduleDescriptor]), []);
});

function memory(initial: string | null = null) {
  let raw = initial;
  return { getItem: (_key: string) => raw, setItem: (_key: string, value: string) => { raw = value; } };
}
const draft = { title: "Een veilig wandelpad", description: "Een breed wandelpad met veel ruimte voor mensen met een rollator.", category: "mobiliteit" as const, position: { lat: 51.4438, lng: 5.4818 }, location: "Neckerspoel" };

test("scope contains all seeded places/landmarks but rejects city-wide and nonfinite locations", () => {
  for (const p of [...projects, ...seedData().ideas]) assert.equal(inFellenoord(p.position), true, p.id);
  for (const l of landmarks) assert.equal(inFellenoord(l), true, l.label);
  assert.equal(inFellenoord({ lat: boundary[0][1], lng: boundary[0][0] }), true);
  for (const p of [{ lat: 51.438, lng: 5.48 }, { lat: 52, lng: 5.48 }, { lat: NaN, lng: 5.48 }, { lat: 51.44, lng: Infinity }]) assert.equal(inFellenoord(p), false);
});

test("ideas persist across store reload with the active author; no valid location means no write", () => {
  const storage = memory(); const store = createStore(storage);
  assert.equal(store.addIdea({ ...draft, position: { lat: 0, lng: 0 } }), null);
  assert.equal(storage.getItem(STORAGE_KEY), null);
  store.setIdentity("resident-c"); const id = store.addIdea(draft);
  assert.ok(id);
  const reloaded = createStore(storage).getSnapshot().data;
  assert.equal(reloaded.ideas.at(-1)?.id, id);
  assert.equal(reloaded.ideas.at(-1)?.author, "resident-c");
  assert.deepEqual(reloaded.ideas.at(-1)?.position, draft.position);
});

test("support is per demo identity, reversible and durable", () => {
  const storage = memory(); const store = createStore(storage); const id = store.addIdea(draft)!;
  store.toggleSupport(id); store.setIdentity("resident-b"); store.toggleSupport(id);
  assert.deepEqual(store.getSnapshot().data.ideas.at(-1)?.supporters, ["resident-a", "resident-b"]);
  store.toggleSupport(id); store.toggleSupport(id); store.toggleSupport(id);
  assert.deepEqual(createStore(storage).getSnapshot().data.ideas.at(-1)?.supporters, ["resident-a"]);
});

test("comments/replies persist, reject wrong targets and prevent deep or cyclic reply trees", () => {
  const storage = memory(); const store = createStore(storage);
  assert.equal(store.comment(projects[0].id, "Graag veel schaduw.", null), true);
  const root = store.getSnapshot().data.comments.at(-1)!;
  assert.equal(store.comment(projects[0].id, "Helemaal mee eens.", root.id), true);
  const reply = store.getSnapshot().data.comments.at(-1)!;
  const previous = storage.getItem(STORAGE_KEY);
  assert.equal(store.comment(projects[1].id, "Verkeerde plek.", root.id), false);
  assert.equal(store.comment(projects[0].id, "Te diep.", reply.id), false);
  assert.equal(store.comment("unknown", "Onbekend.", null), false);
  assert.equal(storage.getItem(STORAGE_KEY), previous);
  assert.equal(createStore(storage).getSnapshot().data.comments.at(-1)?.parentId, root.id);
});

test("write failure does not publish in memory; damaged/future data is preserved until explicit reset", () => {
  const failed = createStore({ getItem: () => null, setItem: () => { throw new Error("quota"); } });
  assert.equal(failed.addIdea(draft), null);
  assert.equal(failed.getSnapshot().data.ideas.length, 2);
  assert.equal(failed.getSnapshot().error, nl.storageError);
  const original = '{"version":2,"valuable":"data"}'; const storage = memory(original); const store = createStore(storage);
  assert.equal(store.getSnapshot().error, nl.damaged);
  assert.equal(store.addIdea(draft), null); assert.equal(store.exportRaw(), original);
  assert.equal(store.reset(), true); assert.equal(createStore(storage).getSnapshot().error, "");
});

test("stale tab cannot silently overwrite newer feedback", () => {
  const storage = memory(); const tabA = createStore(storage); const tabB = createStore(storage);
  const id = tabA.addIdea(draft);
  assert.equal(tabB.addIdea({ ...draft, title: "Tweede idee" }), null);
  assert.equal(tabB.getSnapshot().error, nl.conflict);
  assert.equal(tabB.getSnapshot().data.ideas.at(-1)?.id, id);
  assert.ok(tabB.addIdea({ ...draft, title: "Tweede idee" }));
  assert.equal(createStore(storage).getSnapshot().data.ideas.length, 4);
});

test("schema bounds input and rejects duplicate support, invalid dates and invalid references", () => {
  assert.throws(() => decodeData(" ".repeat(1_000_001)));
  const bad = seedData(); bad.ideas[0].supporters.push("resident-b"); assert.throws(() => decodeData(JSON.stringify(bad)));
  const invalid = seedData(); invalid.comments[0].createdAt = "yesterday"; assert.throws(() => decodeData(JSON.stringify(invalid)));
});

test("search covers categories, descriptions and locations, including accented queries", () => {
  assert.equal(matchingPlaces(projects, "groen").length, 2);
  assert.equal(matchingPlaces(projects, "fÍétsen")[0]?.id, "project-stationsplein");
  assert.equal(matchingPlaces(projects, "Dommel")[0]?.id, "project-dommel");
  assert.equal(matchingPlaces(projects, "onvindbaar").length, 0);
});

test("built tools are namespaced, discover actual records and safely select a Surface record without host internals", async () => {
  const traces: string[] = [];
  const tools = moduleDescriptor.createTools({ settings: {}, enabled: new Set([moduleDescriptor.id]), credits: [], now: () => 1, trace: label => traces.push(label), fetch: async () => { throw new Error("must not fetch"); } });
  assert.ok(Object.keys(tools).every(name => name.startsWith("fellenoord-samen_")));
  const options = { toolCallId: "unit", messages: [] };
  const result = await tools["fellenoord-samen_search"].execute!({ query: "Dommel", kind: "project" }, options);
  const found = JSON.parse(String(result)); assert.equal(found.places[0].id, "project-dommel"); assert.equal(found.demo, true);
  const details = JSON.parse(String(await tools["fellenoord-samen_detail"].execute!({ id: "project-dommel", select: true }, options)));
  assert.equal(details.place.id, "project-dommel"); assert.equal(details.selectionRequested, true);
  assert.match(String(await tools["fellenoord-samen_detail"].execute!({ id: "unknown", select: true }, options)), /^error:/);
  assert.equal(traces.length, 2);
});
