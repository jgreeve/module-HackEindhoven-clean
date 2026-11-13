// SPDX-License-Identifier: MIT
// All resident-facing interface copy lives here; domain/seed content is in data.ts.
export const nl = {
  title: "Fellenoord Samen", subtitle: "Denk mee over jouw buurt.",
  area: "Eindhoven · Fellenoord", participationMode: "Kies hoe je meedoet", zoomIn: "Zoom in", zoomOut: "Zoom uit",
  sourceMunicipality: "Open Eindhoven · Fellenoord", sourceVision: "Fellenoord 2040",
  demo: "Lokale demo", identity: "Je doet mee als", identities: ["Buurtbewoner A", "Buurtbewoner B", "Buurtbewoner C"],
  notice: "Dit is een oefenplek. Je bijdragen worden alleen in deze browser opgeslagen en niet naar de gemeente gestuurd. Gebruik je de chat, dan kan lokale inhoud met je ingestelde AI-aanbieder worden gedeeld.",
  projects: "Projecten", ideas: "Ideeën uit de buurt", add: "Deel je idee", search: "Zoek in de buurt", searchPlaceholder: "Bijvoorbeeld groen, wonen of fietsen…",
  category: "Onderwerp", all: "Alle onderwerpen", categories: { groen: "Groen & ontmoeten", mobiliteit: "Lopen & fietsen", wonen: "Wonen & voorzieningen" },
  results: "plekken om over mee te denken", empty: "Geen plekken gevonden. Probeer een ander zoekwoord of onderwerp.",
  resetFilters: "Wis filters", back: "Terug naar overzicht", location: "Locatie", status: "Fase", about: "Wat verandert er?", question: "Denk je mee?",
  demoProject: "Demoproject", demoIdea: "Demo-idee", source: "Bekijk de officiële achtergrond", discussion: "In gesprek met de buurt", noComments: "Jij kunt het gesprek beginnen.",
  comment: "Jouw reactie", commentPlaceholder: "Wat vind je belangrijk voor deze plek?", post: "Plaats reactie", reply: "Reageer", replyTo: "Antwoord op", cancelReply: "Annuleer antwoord",
  constructive: "Houd het vriendelijk en concreet. Deel geen persoonlijke gegevens.", support: "Steun dit idee", unsupport: "Trek mijn steun in", supporters: "steunbetuigingen", author: "Gedeeld door", created: "Geplaatst op",
  stepLocation: "1 · Kies een plek", stepDetails: "2 · Vertel je idee", stepReview: "3 · Kijk nog even na", choose: "Klik binnen de stippellijn op de kaart. Of kies een herkenbare plek hieronder.",
  landmark: "Kies een herkenbare plek", confirmLocation: "Bevestig deze plek", noLocation: "Kies eerst een plek binnen het demogebied Fellenoord.", outside: "Deze plek ligt buiten het demogebied. Kies een plek binnen de stippellijn.",
  landmarkPlaceholder: "Kies een plek uit de lijst…", customLocation: "Eigen plek op de kaart",
  ideaTitle: "Titel van je idee", ideaDescription: "Wat stel je voor?", titleHint: "5–100 tekens", descriptionHint: "20–2000 tekens. Vertel wat je wilt verbeteren en voor wie.",
  next: "Bekijk je idee", previous: "Vorige stap", cancel: "Annuleren", publish: "Publiceer lokaal", review: "Zo komt je idee in deze browser te staan.",
  required: "Controleer de titel (5–100 tekens), het onderwerp, de beschrijving (20–2000 tekens) en de locatie.",
  commentError: "Schrijf een reactie van 2 tot 1000 tekens.", saved: "Je idee staat op de kaart! Alleen zichtbaar in deze browser.", commentSaved: "Je reactie is lokaal opgeslagen.", supportSaved: "Je steun is lokaal bijgewerkt.",
  map: "Kaart van Fellenoord", mapHelp: "Vierkant = project · rond = buurtidee · stippellijn = benaderde demogrens", boundary: "Benaderde demogrens, geen officiële plangrens.",
  boundaryInfo: "Fellenoord ligt ten noorden van het station, tussen de Elisabethtunnel en de toegang tot de TU/e. Knoop XL omvat ook gebieden buiten Fellenoord.",
  fit: "Toon heel Fellenoord", mapUnavailable: "De achtergrondkaart kon niet laden. Pinnen, grens en de lijst blijven bruikbaar.", mapKeyboard: "Gebruik de lijst om plekken met je toetsenbord te openen. Je kunt ook de kaart verschuiven met de pijltjestoetsen en zoomen met + en −.",
  illustration: "Eigen schematische illustratie — geen architectonisch ontwerp.", scene: "Buurtbeeld", plan: "Schetsplan", coordinates: "Gekozen coördinaten", selected: "Geselecteerd",
  storageError: "Opslaan is niet gelukt. Je wijziging is niet gepubliceerd. Controleer browseropslag en probeer opnieuw.",
  damaged: "De lokale gegevens hebben een onbekend of beschadigd formaat. Ze zijn niet overschreven. Exporteer een kopie of herstel alleen deze demo.",
  conflict: "De demo is in een ander tabblad veranderd. De laatste gegevens zijn geladen; probeer je wijziging opnieuw.",
  export: "Exporteer lokale gegevens", reset: "Herstel demo", resetConfirm: "Alleen jouw lokale Fellenoord Samen-ideeën, reacties en steun wissen en de voorbeeldgegevens herstellen?", exportError: "Exporteren lukt niet in deze browser.",
  toolFocus: "Een plek is geselecteerd vanuit de chat.", commentsCount: "reacties", sources: "Over dit demogebied", closeSources: "Sluit toelichting",
} as const;
export type Category = keyof typeof nl.categories;
export type Identity = "resident-a" | "resident-b" | "resident-c";
export const identities: Identity[] = ["resident-a", "resident-b", "resident-c"];
export const identityName = (id: Identity) => nl.identities[identities.indexOf(id)];
