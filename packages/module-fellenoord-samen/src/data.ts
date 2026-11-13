// SPDX-License-Identifier: MIT
import type { Category, Identity } from "./copy";
import type { Position } from "./geo";
export type Project = {
  id: string; kind: "project"; title: string; category: Category; location: string;
  position: Position; summary: string; description: string; question: string; status: string; source: string;
};
export type Idea = { id: string; kind: "idea"; title: string; category: Category; location: string; position: Position; description: string; author: Identity; createdAt: string; supporters: Identity[] };
export type Comment = { id: string; targetId: string; parentId: string | null; author: Identity; body: string; createdAt: string };
export type Place = Project | Idea;
export type LocalData = { version: 1; identity: Identity; ideas: Idea[]; comments: Comment[] };
export const sourceUrls = {
  fellenoord: "https://www.openeindhoven.nl/projecten/centrum/stationsgebied-knoop-xl/fellenoord",
  vision: "https://www.fellenoord2040.nl/nl",
  knoop: "https://www.openeindhoven.nl/projecten/centrum/stationsgebied-knoop-xl",
};
export const projects: Project[] = [
  { id: "project-stationsplein", kind: "project", title: "Een groen welkom bij het station", category: "mobiliteit", location: "Stationszijde Noord / Neckerspoel", position: { lat: 51.4438, lng: 5.4818 },
    summary: "Van overstapplek naar een plein waar je ook even wilt blijven.", status: "Verkenning · demo",
    description: "De officiële gebiedsvisie beschrijft een ondergronds busstation en meer ruimte voor mensen boven de grond. In dit demoproject verkennen we een groen stationsplein met overzichtelijke looproutes, zitplekken en schaduw. De invulling en deze gespreksvraag zijn fictief; dit is geen lopende gemeentelijke inspraakprocedure.",
    question: "Wat heb jij nodig om hier prettig te wachten en veilig je weg te vinden?", source: sourceUrls.vision },
  { id: "project-wonen", kind: "project", title: "Wonen met een levendige plint", category: "wonen", location: "Fellenoord / Bogert", position: { lat: 51.4449, lng: 5.4784 },
    summary: "Een buurt waar wonen en dagelijkse voorzieningen samenkomen.", status: "Ideevorming · demo",
    description: "Fellenoord 2040 beschrijft de ambitie voor een gemengde stadswijk met woningen, winkels en ontmoetingsplekken. Deze fictieve voorbeeldlocatie laat je nadenken over de begane grond: welke voorzieningen maken de buurt ook voor bestaande bewoners fijner? De schets is geen plan van een ontwikkelaar en de pin is indicatief.",
    question: "Welke voorziening op loopafstand mis jij in de buurt?", source: sourceUrls.fellenoord },
  { id: "project-dommel", kind: "project", title: "Meer ruimte voor de Dommel", category: "groen", location: "Dommel / toegang TU/e", position: { lat: 51.4438, lng: 5.4900 },
    summary: "Groen, water en fijne wandelplekken aan de oostkant van Fellenoord.", status: "Verkenning · demo",
    description: "In de gebiedsvisie krijgt het landschap rond de Dommel meer ruimte. Dit demoproject verkent toegankelijke paden, biodiversiteit en rustige plekken langs het water. De inrichting is verzonnen om het gesprek te oefenen; de officiële achtergrond vind je bij de bron. Er worden via deze demo geen besluiten genomen.",
    question: "Hoe combineren we ruimte voor natuur met een plek om elkaar te ontmoeten?", source: sourceUrls.vision },
];
export function seedData(): LocalData {
  return { version: 1, identity: "resident-a", ideas: [
    { id: "idea-schaduw", kind: "idea", title: "Een bankje in de schaduw", category: "groen", location: "Omgeving Stroomhuis", position: { lat: 51.4428, lng: 5.4708 }, description: "Maak een rustige zitplek met bomen, zodat je onderweg naar het station ook op warme dagen even kunt uitrusten. Houd ruimte naast het bankje voor een rolstoel of kinderwagen.", author: "resident-b", createdAt: "2026-11-10T10:00:00.000Z", supporters: ["resident-b", "resident-c"] },
    { id: "idea-fiets", kind: "idea", title: "Een duidelijke route voor fietsers", category: "mobiliteit", location: "Fellenoord / Bogert", position: { lat: 51.4444, lng: 5.4762 }, description: "Geef de fietsroute richting het station herkenbare bewegwijzering. Zo hoeven bezoekers minder te zoeken en houden we de stoep vrij voor voetgangers.", author: "resident-c", createdAt: "2026-11-11T14:30:00.000Z", supporters: ["resident-c"] },
  ], comments: [
    { id: "comment-welkom", targetId: "project-stationsplein", parentId: null, author: "resident-b", body: "Graag ook duidelijke looproutes voor mensen die slecht zien. Een rustige plek om op iemand te wachten zou fijn zijn.", createdAt: "2026-11-11T09:00:00.000Z" },
    { id: "comment-bank", targetId: "idea-schaduw", parentId: null, author: "resident-c", body: "Goed idee! Een bankje met een rugleuning zou ook voor oudere buurtbewoners prettig zijn.", createdAt: "2026-11-11T15:00:00.000Z" },
  ] };
}
