// SPDX-License-Identifier: MIT
import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { boundary, type Position } from "./geo";
import { nl } from "./copy";
import type { Place } from "./data";
type Props = { places: Place[]; selected: string | null; placing: boolean; pin: Position | null; onSelect: (id: string) => void; onPin: (p: Position) => void };
export function NeighbourhoodMap(props: Props) {
  const container = useRef<HTMLDivElement>(null);
  const instance = useRef<{ L: typeof Leaflet; map: Leaflet.Map; markers: Leaflet.LayerGroup; bounds: Leaflet.LatLngBounds } | null>(null);
  const callbacks = useRef(props); callbacks.current = props;
  const [ready, setReady] = useState(false);
  const [tileError, setTileError] = useState(false);
  useEffect(() => {
    let disposed = false;
    let observer: ResizeObserver | undefined;
    void import("leaflet").then(L => {
      if (disposed || !container.current) return;
      const bounds = L.latLngBounds(boundary.map(([lng, lat]) => [lat, lng]));
      const map = L.map(container.current, { zoomControl: false, minZoom: 14, maxZoom: 19, maxBounds: bounds.pad(0.4), maxBoundsViscosity: 0.8, scrollWheelZoom: false });
      L.control.zoom({ zoomInTitle: nl.zoomIn, zoomOutTitle: nl.zoomOut }).addTo(map);
      map.fitBounds(bounds, { padding: [25, 25] });
      const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors' }).addTo(map);
      tiles.on("tileerror", () => setTileError(true));
      L.polygon(boundary.map(([lng, lat]) => [lat, lng]), { color: "#386858", weight: 2, dashArray: "7 7", fillColor: "#779a7c", fillOpacity: 0.08, interactive: false }).addTo(map);
      const markers = L.layerGroup().addTo(map);
      map.on("click", (event: Leaflet.LeafletMouseEvent) => { if (callbacks.current.placing) callbacks.current.onPin({ lat: event.latlng.lat, lng: event.latlng.lng }); });
      instance.current = { L, map, markers, bounds };
      observer = new ResizeObserver(() => map.invalidateSize()); observer.observe(container.current);
      setReady(true);
    }).catch(() => setTileError(true));
    return () => { disposed = true; observer?.disconnect(); instance.current?.map.remove(); instance.current = null; };
  }, []);
  useEffect(() => {
    const current = instance.current;
    if (!ready || !current) return;
    const { L, map, markers } = current;
    markers.clearLayers();
    for (const place of props.places) {
      const selected = props.selected === place.id;
      const marker = L.marker([place.position.lat, place.position.lng], {
        title: place.title, alt: place.title, keyboard: true, autoPanOnFocus: false,
        icon: L.divIcon({ className: "fs-marker-shell", html: `<span class="fs-marker fs-marker-${place.kind}${selected ? " fs-marker-selected" : ""}" aria-hidden="true">${place.kind === "project" ? "▦" : "✦"}</span>`, iconSize: [36, 36], iconAnchor: [18, 18] }),
      }).addTo(markers);
      marker.on("click", () => { if (callbacks.current.placing) callbacks.current.onPin(place.position); else callbacks.current.onSelect(place.id); });
      // Leaflet string tooltips are HTML; use a text node for user content.
      const label = document.createElement("span"); label.textContent = place.title;
      marker.bindTooltip(label, { direction: "top" });
    }
    if (props.pin) L.circleMarker([props.pin.lat, props.pin.lng], { radius: 10, color: "#222f47", fillColor: "#f9c15c", fillOpacity: 1, weight: 4 }).addTo(markers);
    const selected = props.places.find(p => p.id === props.selected);
    if (selected && !props.placing) map.panTo([selected.position.lat, selected.position.lng], { animate: false });
  }, [ready, props.places, props.selected, props.pin, props.placing]);
  return <section className={`fs-map-panel${props.placing ? " fs-placing" : ""}`} aria-label={nl.map}>
    <div className="fs-map-toolbar"><span>{props.placing ? nl.stepLocation : nl.map}</span><button type="button" onClick={() => instance.current?.map.fitBounds(instance.current.bounds, { padding: [25, 25] })}>{nl.fit}</button></div>
    {/* Leaflet's keyboard handler focuses with no preventScroll on mousedown.
        Focus first in capture so nested host scroll panes cannot move a marker
        between pointer down/up. Keyboard navigation stays enabled. */}
    <div className="fs-map" ref={container} data-testid="fellenoord-map" aria-label={nl.map} onMouseDownCapture={() => container.current?.focus({ preventScroll: true })} />
    {tileError && <p role="status" className="fs-map-error">{nl.mapUnavailable}</p>}
    <div className="fs-map-caption"><span>{nl.mapHelp}</span><small>{nl.boundary}</small><small>{nl.mapKeyboard}</small></div>
  </section>;
}
