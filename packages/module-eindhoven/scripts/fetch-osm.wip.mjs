// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// scripts/fetch-eindhoven-osm.mjs — build the bundled OSM layers for the
// Eindhoven sample. The extract is deliberately bounded and simplified: the
// Viewer must not query Overpass at runtime.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");

const BBOX = [51.435, 5.468, 51.447, 5.49];
const TILES = 1;
const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const USER_AGENT = "tablette-hackeindhoven/0.1";

const GREEN_FILTERS = [
  `way["leisure"~"^(park|garden|nature_reserve|playground|pitch|golf_course|common)$"]`,
  `relation["leisure"~"^(park|garden|nature_reserve|playground|pitch|golf_course|common)$"]`,
  `way["landuse"~"^(grass|forest|meadow|recreation_ground|village_green|cemetery|orchard|vineyard|allotments)$"]`,
  `relation["landuse"~"^(grass|forest|meadow|recreation_ground|village_green|cemetery|orchard|vineyard|allotments)$"]`,
  `way["natural"~"^(wood|scrub|heath|grassland|wetland)$"]`,
  `relation["natural"~"^(wood|scrub|heath|grassland|wetland)$"]`,
];

function tileBounds() {
  const [south, west, north, east] = BBOX;
  const latStep = (north - south) / TILES;
  const lonStep = (east - west) / TILES;
  const out = [];
  for (let row = 0; row < TILES; row++) {
    for (let col = 0; col < TILES; col++) {
      out.push([
        south + row * latStep,
        west + col * lonStep,
        south + (row + 1) * latStep,
        west + (col + 1) * lonStep,
      ]);
    }
  }
  return out;
}

function bboxClause(bounds) {
  return bounds.map((n) => n.toFixed(6)).join(",");
}

function buildingQuery(bounds) {
  const box = bboxClause(bounds);
  return `[out:json][timeout:180];
(
  way["building"](${box});
  relation["building"](${box});
);
out geom;`;
}

function greenQuery(bounds) {
  const box = bboxClause(bounds);
  const parts = GREEN_FILTERS.map((filter) => `  ${filter}(${box});`);
  return `[out:json][timeout:180];
(
${parts.join("\n")}
);
out geom;`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchOverpass(query, label) {
  let lastError = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const endpoint = ENDPOINTS[attempt % ENDPOINTS.length];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120_000);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          "User-Agent": USER_AGENT,
        },
        body: new URLSearchParams({ data: query }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      const text = await response.text();
      if (!text.trimStart().startsWith("{")) {
        throw new Error(text.slice(0, 120));
      }
      return JSON.parse(text);
    } catch (error) {
      lastError = error;
      const wait = Math.min(20_000, 2_000 * 2 ** attempt);
      console.warn(
        `  ${label}: ${endpoint} -> ${error instanceof Error ? error.message : error}; retrying in ${wait}ms`,
      );
      await sleep(wait);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`${label} failed: ${lastError instanceof Error ? lastError.message : lastError}`);
}

function roundCoord(point, digits = 6) {
  return [
    Number(point.lon.toFixed(digits)),
    Number(point.lat.toFixed(digits)),
  ];
}

function samePoint(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}

function isClosed(ring) {
  return ring.length > 1 && samePoint(ring[0], ring[ring.length - 1]);
}

function sqSegmentDistance(p, a, b) {
  let x = a[0];
  let y = a[1];
  let dx = b[0] - x;
  let dy = b[1] - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = b[0];
      y = b[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }
  dx = p[0] - x;
  dy = p[1] - y;
  return dx * dx + dy * dy;
}

function simplifyLine(points, tolerance) {
  if (points.length <= 2) return points;
  const sqTolerance = tolerance * tolerance;
  const simplified = [points[0]];
  let first = 0;
  let last = points.length - 1;
  const stack = [[first, last]];
  const markers = new Uint8Array(points.length);
  markers[first] = 1;
  markers[last] = 1;

  while (stack.length) {
    const [start, end] = stack.pop();
    let maxDistance = sqTolerance;
    let index = -1;
    for (let i = start + 1; i < end; i++) {
      const distance = sqSegmentDistance(points[i], points[start], points[end]);
      if (distance > maxDistance) {
        index = i;
        maxDistance = distance;
      }
    }
    if (index !== -1) {
      markers[index] = 1;
      stack.push([start, index], [index, end]);
    }
  }

  for (let i = 1; i < points.length - 1; i++) {
    if (markers[i]) simplified.push(points[i]);
  }
  simplified.push(points[points.length - 1]);
  return simplified;
}

function simplifyRing(ring, tolerance) {
  if (ring.length <= 4) return ring;
  const open = ring.slice(0, -1);
  const simplified = simplifyLine(open, tolerance);
  simplified.push(simplified[0]);
  return simplified.length >= 4 ? simplified : ring;
}

function cleanedPath(geometry) {
  if (!Array.isArray(geometry) || geometry.length < 2) return null;
  const path = [];
  for (const point of geometry) {
    const next = roundCoord(point);
    if (!path.length || !samePoint(path[path.length - 1], next)) {
      path.push(next);
    }
  }
  return path.length >= 2 ? path : null;
}

function ringFromGeometry(geometry, tolerance) {
  if (!Array.isArray(geometry) || geometry.length < 3) return null;
  const cleaned = cleanedPath(geometry);
  if (!cleaned) return null;
  if (!isClosed(cleaned)) cleaned.push(cleaned[0]);
  if (cleaned.length < 4) return null;
  return simplifyRing(cleaned, tolerance);
}

function stitchRings(lines) {
  const remaining = lines.map((line) => line.slice());
  const rings = [];
  while (remaining.length) {
    let ring = remaining.shift();
    let extended = true;
    while (!isClosed(ring) && extended) {
      extended = false;
      for (let i = 0; i < remaining.length; i++) {
        const line = remaining[i];
        const end = ring[ring.length - 1];
        if (samePoint(end, line[0])) {
          ring = ring.concat(line.slice(1));
        } else if (samePoint(end, line[line.length - 1])) {
          ring = ring.concat(line.slice(0, -1).reverse());
        } else {
          continue;
        }
        remaining.splice(i, 1);
        extended = true;
        break;
      }
    }
    if (isClosed(ring) && ring.length >= 4) rings.push(ring);
  }
  return rings;
}

function pointInRing(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersects =
      yi > point[1] !== yj > point[1] &&
      point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function geometryForElement(element, tolerance) {
  if (element.type === "way") {
    const ring = ringFromGeometry(element.geometry, tolerance);
    return ring ? { type: "Polygon", coordinates: [ring] } : null;
  }
  if (element.type !== "relation" || !Array.isArray(element.members)) return null;

  const outers = [];
  const inners = [];
  for (const member of element.members) {
    const path = cleanedPath(member.geometry);
    if (!path) continue;
    if (member.role === "inner") inners.push(path);
    else if (member.role === "outer" || !member.role) outers.push(path);
  }

  const stitchedOuters = stitchRings(outers).map((ring) =>
    simplifyRing(ring, tolerance),
  );
  if (!stitchedOuters.length) return null;
  const stitchedInners = stitchRings(inners).map((ring) =>
    simplifyRing(ring, tolerance),
  );
  const polygons = stitchedOuters.map((outer) => {
    const holes = stitchedInners.filter((inner) => pointInRing(inner[0], outer));
    return [outer, ...holes];
  });
  return { type: "MultiPolygon", coordinates: polygons.map((polygon) => polygon) };
}

function propertiesForElement(element, kind) {
  const tags = element.tags || {};
  const props = {
    osm_id: element.id,
    osm_type: element.type,
    kind,
    name: tags.name,
    building: tags.building,
    leisure: tags.leisure,
    landuse: tags.landuse,
    natural: tags.natural,
  };
  for (const key of Object.keys(props)) {
    if (props[key] === undefined) delete props[key];
  }
  return props;
}

function featureForElement(element, kind, tolerance) {
  const geometry = geometryForElement(element, tolerance);
  if (!geometry) return null;
  return {
    type: "Feature",
    properties: propertiesForElement(element, kind),
    geometry,
  };
}

function collection(features, name) {
  return {
    type: "FeatureCollection",
    name,
    generated: new Date().toISOString(),
    source: "https://www.openstreetmap.org",
    license: "ODbL 1.0",
    bbox: [BBOX[1], BBOX[0], BBOX[3], BBOX[2]],
    features,
  };
}

function writeCollection(file, featureCollection) {
  mkdirSync(publicDir, { recursive: true });
  const target = join(publicDir, file);
  const json = JSON.stringify(featureCollection);
  writeFileSync(target, json);
  const size = Buffer.byteLength(json);
  console.log(`  ${file}: ${featureCollection.features.length} features, ${(size / 1024 / 1024).toFixed(2)} MiB`);
}

async function main() {
  const tiles = tileBounds();

  const buildings = new Map();
  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i];
    console.log(`Buildings ${i + 1}/${tiles.length}: ${bboxClause(tile)}`);
    const data = await fetchOverpass(buildingQuery(tile), "buildings");
    for (const element of data.elements || []) {
      const feature = featureForElement(element, "building", 0.00001);
      if (feature) buildings.set(`${element.type}/${element.id}`, feature);
    }
    await sleep(1_500);
  }
  writeCollection(
    "eindhoven-buildings.geojson",
    collection(
      [...buildings.values()],
      "OpenStreetMap buildings — Eindhoven city centre",
    ),
  );

  const green = new Map();
  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i];
    console.log(`Green spaces ${i + 1}/${tiles.length}: ${bboxClause(tile)}`);
    const data = await fetchOverpass(greenQuery(tile), "green spaces");
    for (const element of data.elements || []) {
      const feature = featureForElement(element, "green", 0.00003);
      if (feature) green.set(`${element.type}/${element.id}`, feature);
    }
    await sleep(1_500);
  }
  writeCollection(
    "eindhoven-green.geojson",
    collection(
      [...green.values()],
      "OpenStreetMap green spaces — Eindhoven city centre",
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
