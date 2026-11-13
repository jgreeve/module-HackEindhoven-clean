// SPDX-License-Identifier: MIT
export type Position = { lat: number; lng: number };
// WGS84 [longitude, latitude]. Deliberately approximate demo scope, not cadastral data.
export const boundary: [number, number][] = [
  [5.4684, 51.4418], [5.4695, 51.4444], [5.4772, 51.4462],
  [5.4854, 51.4461], [5.4916, 51.4447], [5.4915, 51.4428],
  [5.4800, 51.4420], [5.4720, 51.4415], [5.4684, 51.4418],
];
export function inFellenoord(p: Position): boolean {
  if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return false;
  let inside = false;
  for (let i = 0, j = boundary.length - 1; i < boundary.length; j = i++) {
    const [x, y] = boundary[i]; const [a, b] = boundary[j];
    const cross = (p.lng - x) * (b - y) - (p.lat - y) * (a - x);
    if (Math.abs(cross) < 1e-12 && p.lng >= Math.min(x, a) && p.lng <= Math.max(x, a) && p.lat >= Math.min(y, b) && p.lat <= Math.max(y, b)) return true;
    if ((y > p.lat) !== (b > p.lat) && p.lng < (a - x) * (p.lat - y) / (b - y) + x) inside = !inside;
  }
  return inside;
}
export const landmarks = [
  { label: "Stationszijde Noord / Neckerspoel", lat: 51.4438, lng: 5.4818 },
  { label: "Fellenoord / Bogert", lat: 51.4449, lng: 5.4784 },
  { label: "Dommel / toegang TU/e", lat: 51.4438, lng: 5.4900 },
  { label: "Omgeving Stroomhuis", lat: 51.4428, lng: 5.4708 },
];
