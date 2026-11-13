import { stringify } from "yaml";
import { collectModuleSamples } from "@hackeindhoven/module-contracts";
import { getEnabledModuleIds } from "../app/modules";
import { MODULES } from "../modules/registry";
import type { GisAppBundle, GisAppIndexEntry, GisAppManifest } from "./types";

function localSamples() {
  return collectModuleSamples(MODULES, getEnabledModuleIds());
}

export function localAppEntries(): GisAppIndexEntry[] {
  return localSamples().map((sample) => ({
    id: sample.id,
    path: `local/${sample.id}`,
    title: sample.title,
    description: sample.description,
    tags: sample.tags,
  }));
}

export function findLocalApp(idOrPath: string): GisAppBundle | null {
  const clean = idOrPath.replace(/\/+$/, "");
  const sample = localSamples().find((item) =>
    [item.id, `local/${item.id}`, `apps/${item.id}`].includes(clean),
  );
  if (!sample) return null;
  const manifest: GisAppManifest = {
    gis_app: 1, id: sample.id, title: sample.title,
    description: sample.description, entry: "index.html", created: sample.created,
    source_blocks: [], tags: sample.tags, license: sample.license,
    attribution: sample.attribution,
  };
  return {
    manifest, manifestText: stringify(manifest, { lineWidth: 0 }),
    entry: sample.html, files: ["index.html", "app.yaml"],
  };
}
