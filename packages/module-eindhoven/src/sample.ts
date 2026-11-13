import html from "./map.html?raw";
import type { ModuleSample } from "@hackeindhoven/module-contracts";

export const eindhovenSample: ModuleSample = {
  id: "eindhoven",
  title: "Eindhoven — open data",
  description: "Districts, neighbourhoods and live permit applications from Gemeente Eindhoven.",
  html,
  created: "2026-11-13",
  tags: ["eindhoven", "opendata", "leaflet", "live"],
  license: "Public domain (municipal source data); ODbL (OSM basemap)",
  attribution: ["Data: Gemeente Eindhoven (public domain)", "Map: © OpenStreetMap contributors (ODbL)"],
};
