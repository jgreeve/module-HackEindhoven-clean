// SPDX-License-Identifier: MIT
import { z } from "zod";
import { nl, identities, type Category, type Identity } from "./copy";
import { projects, seedData, type LocalData, type Idea } from "./data";
import { inFellenoord, type Position } from "./geo";
export const STORAGE_KEY = "fellenoord-samen.data.v1";
const MAX_BYTES = 1_000_000;
const identity = z.enum(["resident-a", "resident-b", "resident-c"]);
const category = z.enum(["groen", "mobiliteit", "wonen"]);
const position = z.object({ lat: z.number().finite(), lng: z.number().finite() }).refine(inFellenoord);
const id = z.string().min(1).max(100);
const schema = z.object({ version: z.literal(1), identity,
  ideas: z.array(z.object({ id, kind: z.literal("idea"), title: z.string().trim().min(5).max(100), category, location: z.string().min(1).max(200), position,
    description: z.string().trim().min(20).max(2000), author: identity, createdAt: z.string().datetime(), supporters: z.array(identity).max(3) })).max(500),
  comments: z.array(z.object({ id, targetId: id, parentId: id.nullable(), author: identity, body: z.string().trim().min(2).max(1000), createdAt: z.string().datetime() })).max(2000),
});
export function decodeData(raw: string): LocalData {
  // Bound bytes before JSON/schema parsing (including oversized collection input).
  if (raw.length > MAX_BYTES) throw new Error("size");
  const data = schema.parse(JSON.parse(raw));
  const targets = new Set([...projects.map(p => p.id), ...data.ideas.map(p => p.id)]);
  if (targets.size !== projects.length + data.ideas.length || new Set(data.comments.map(c => c.id)).size !== data.comments.length) throw new Error("duplicate");
  for (const idea of data.ideas) if (new Set(idea.supporters).size !== idea.supporters.length) throw new Error("supporters");
  for (const comment of data.comments) {
    if (!targets.has(comment.targetId)) throw new Error("target");
    if (comment.parentId) {
      const parent = data.comments.find(c => c.id === comment.parentId);
      // One reply level avoids unbounded recursion and cyclic imported threads.
      if (!parent || parent.parentId || parent.targetId !== comment.targetId) throw new Error("parent");
    }
  }
  return data;
}
type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;
export type Snapshot = { data: LocalData; error: string; focusId: string | null; focusRevision: number };
export function createStore(storage?: Storage) {
  let raw: string | null = null;
  let blocked = false;
  let snapshot: Snapshot = { data: seedData(), error: "", focusId: null, focusRevision: 0 };
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach(fn => fn());
  function reload() {
    try {
      raw = storage?.getItem(STORAGE_KEY) ?? null;
      snapshot = { ...snapshot, data: raw === null ? seedData() : decodeData(raw), error: "" }; blocked = false;
    } catch { blocked = true; snapshot = { ...snapshot, error: nl.damaged }; }
    emit();
  }
  reload();
  function fail(error: string) { snapshot = { ...snapshot, error }; emit(); return false; }
  function write(next: LocalData, reset = false) {
    if (blocked && !reset) return fail(nl.damaged);
    if (!storage) return fail(nl.storageError);
    try {
      if (!reset && storage.getItem(STORAGE_KEY) !== raw) { reload(); return fail(nl.conflict); }
      const nextRaw = JSON.stringify(next);
      decodeData(nextRaw);
      storage.setItem(STORAGE_KEY, nextRaw);
      raw = nextRaw; blocked = false; snapshot = { ...snapshot, data: next, error: "" }; emit(); return true;
    } catch { return fail(nl.storageError); }
  }
  return {
    getSnapshot: () => snapshot,
    subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
    reload,
    setIdentity: (value: Identity) => identities.includes(value) && write({ ...snapshot.data, identity: value }),
    addIdea(input: { title: string; description: string; category: Category; position: Position; location: string }): string | null {
      if (!inFellenoord(input.position) || input.title.trim().length < 5 || input.title.trim().length > 100 || input.description.trim().length < 20 || input.description.trim().length > 2000) { fail(nl.required); return null; }
      const idea: Idea = { ...input, title: input.title.trim(), description: input.description.trim(), id: `idea-${crypto.randomUUID()}`, kind: "idea", author: snapshot.data.identity, createdAt: new Date().toISOString(), supporters: [] };
      return write({ ...snapshot.data, ideas: [...snapshot.data.ideas, idea] }) ? idea.id : null;
    },
    comment(targetId: string, body: string, parentId: string | null) {
      if (body.trim().length < 2 || body.trim().length > 1000) return fail(nl.commentError);
      return write({ ...snapshot.data, comments: [...snapshot.data.comments, { id: `comment-${crypto.randomUUID()}`, targetId, parentId, body: body.trim(), author: snapshot.data.identity, createdAt: new Date().toISOString() }] });
    },
    toggleSupport(ideaId: string) {
      if (!snapshot.data.ideas.some(i => i.id === ideaId)) return false;
      return write({ ...snapshot.data, ideas: snapshot.data.ideas.map(i => i.id !== ideaId ? i : { ...i, supporters: i.supporters.includes(snapshot.data.identity) ? i.supporters.filter(s => s !== snapshot.data.identity) : [...i.supporters, snapshot.data.identity] }) });
    },
    focus(targetId: string) {
      if (![...projects, ...snapshot.data.ideas].some(p => p.id === targetId)) return false;
      snapshot = { ...snapshot, focusId: targetId, focusRevision: snapshot.focusRevision + 1 }; emit(); return true;
    },
    reset: () => write(seedData(), true),
    exportRaw: () => storage?.getItem(STORAGE_KEY) ?? JSON.stringify(snapshot.data, null, 2),
  };
}
let singleton: ReturnType<typeof createStore> | undefined;
export function getStore() {
  if (!singleton) {
    let storage: Storage | undefined;
    try { storage = globalThis.localStorage; } catch { /* unavailable storage is reported on mutation */ }
    singleton = createStore(storage);
    if (typeof window !== "undefined") window.addEventListener("storage", event => { if (event.key === STORAGE_KEY || event.key === null) singleton?.reload(); });
  }
  return singleton;
}
