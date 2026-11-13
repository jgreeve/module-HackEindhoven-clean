// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/modules/bimr/vocabulary.ts — the BIMR Python runtime vocabulary.
//
// Mirrors PYTHON_VOCABULARY from @bimr/web. Importing the package here would
// pull its browser-only custom elements into the module contract tests, so the
// list is kept local. Update it when the @bimr/web runtime vocabulary changes.

export const BIMR_VOCABULARY = [
  "Point",
  "Line",
  "Circle",
  "Curve",
  "Vector",
  "List",
  "Divide",
  "Cut",
  "Explode",
  "Random",
  "Extrusion",
  "Wall",
  "Column",
  "Slab",
  "Frame",
  "Level",
  "Building",
] as const;
