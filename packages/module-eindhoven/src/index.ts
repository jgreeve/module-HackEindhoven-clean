import type { ProjectModule } from "@hackeindhoven/module-contracts";
import { EindhovenSurface } from "./Surface";
import { eindhovenSample } from "./sample";
import { createEindhovenTools } from "./tools";

export { eindhovenSample } from "./sample";
export const eindhovenModule: ProjectModule = {
  id: "eindhoven",
  label: "Eindhoven",
  description: "Official district and neighbourhood boundaries with a live permit map.",
  version: "0.1.0",
  docs: "https://github.com/jgreeve/module-HackEindhoven/tree/main/packages/module-eindhoven",
  modes: ["sketch", "explore", "build"],
  defaultEnabled: true,
  dataSources: [
    {
      id: "eindhoven-open-data", label: "Gemeente Eindhoven Open Data",
      endpoint: "https://data.eindhoven.nl/api/explore/v2.1/catalog/datasets/",
      auth: "none", cors: true, methods: ["GET"], license: "Public domain",
      attribution: "Data: Gemeente Eindhoven (public domain)",
    },
  ],
  attribution: eindhovenSample.attribution ?? [],
  prompt: "For Eindhoven city boundaries or permit maps, use eindhoven_open_map. The map uses public municipal data and an OSM basemap. Do not claim it contains OSM building footprints or green-space features: that work is paused. Permit applications and decisions must keep their original source statuses.",
  createTools: createEindhovenTools,
  Surface: EindhovenSurface,
  samples: [eindhovenSample],
};
