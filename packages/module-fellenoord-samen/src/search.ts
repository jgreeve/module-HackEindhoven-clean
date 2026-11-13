// SPDX-License-Identifier: MIT
import type { Place } from "./data";
import { nl } from "./copy";
const normalise = (value: string) => value.toLocaleLowerCase("nl").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
export function matchingPlaces<T extends Place>(places: T[], query: string): T[] {
  const words = normalise(query.trim()).split(/\s+/).filter(Boolean);
  return places.filter(place => {
    const text = normalise(`${place.title} ${place.description} ${place.location} ${nl.categories[place.category]} ${place.kind === "project" ? `${place.summary} ${place.question}` : ""}`);
    return words.every(word => text.includes(word));
  });
}
