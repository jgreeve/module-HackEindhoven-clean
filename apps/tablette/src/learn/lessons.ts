// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/learn/lessons.ts — the bundled Pygram-derived lesson corpus.
//
// Adapted from Pygram (learn-to-code-with-Blender) to the BIMR runtime;
// English only.

export interface Lesson {
  id: string;
  track: string;
  title: string;
  markdown: string;
  code: string;
  hints?: string[];
}

export interface Track {
  id: string;
  title: string;
  description: string;
}

export const TRACKS: Track[] = [
  { id: "tetris", title: "Tetris", description: "Construct Tetris-like shapes" },
  { id: "simplehouse", title: "SimpleHouse", description: "Walls, roof and functions" },
];

const CELL = `CELL = 100

def cell(x, y):
    pts = [Point(x, y, 0), Point(x + CELL, y, 0), Point(x + CELL, y + CELL, 0), Point(x, y + CELL, 0)]
    Slab(Curve(List(*pts)), 20, 0)
`;

export const LESSONS: Lesson[] = [
  {
    id: "t1-cell",
    track: "tetris",
    title: "A1 · The unit cell",
    markdown: `Every Tetris shape is built from one **unit cell**: a square slab.

\`Curve\` needs a \`List\`, so we wrap a python list of \`Point\`s with \`List(*pts)\`.`,
    code: `${CELL}
cell(0, 0)`,
    hints: ["Try changing CELL to 200 and run again."],
  },
  {
    id: "t2-o",
    track: "tetris",
    title: "A2 · The O shape",
    markdown: `The **O** tetromino is a 2x2 block: place a cell at every combination of
two x and two y positions. A nested \`for\` does it.`,
    code: `${CELL}
for cx in range(2):
    for cy in range(2):
        cell(cx * CELL, cy * CELL)`,
    hints: ["range(2) gives 0 and 1."],
  },
  {
    id: "t3-i",
    track: "tetris",
    title: "A3 · The I shape",
    markdown: `The **I** tetromino is a row of four cells — a single loop over x.`,
    code: `${CELL}
for cx in range(4):
    cell(cx * CELL, 0)`,
  },
  {
    id: "t4-l",
    track: "tetris",
    title: "A4 · The L shape",
    markdown: `The **L** tetromino is a column of three cells plus one cell to the right at
the bottom.`,
    code: `${CELL}
for cy in range(3):
    cell(0, cy * CELL)
cell(CELL, 0)`,
  },
  {
    id: "t5-t",
    track: "tetris",
    title: "A5 · The T shape",
    markdown: `The **T** tetromino is three cells in a row plus one cell above the middle.`,
    code: `${CELL}
for cx in range(3):
    cell(cx * CELL, 0)
cell(CELL, CELL)`,
  },
  {
    id: "t6-board",
    track: "tetris",
    title: "A6 · The board",
    markdown: `A **board** is just a grid of cells — two nested loops. This is the field the
shapes will sit on.`,
    code: `${CELL}
for gx in range(6):
    for gy in range(4):
        cell(gx * CELL, gy * CELL)`,
    hints: ["Try a different board size with range(8) and range(6)."],
  },
  {
    id: "h1-footprint",
    track: "simplehouse",
    title: "B1 · The footprint",
    markdown: `We now build a small **house**. Start with its footprint: a rectangle as a
\`Curve\`.`,
    code: `W = 500
D = 400
pts = [Point(0, 0, 0), Point(W, 0, 0), Point(W, D, 0), Point(0, D, 0)]
Curve(List(*pts))`,
  },
  {
    id: "h2-floor",
    track: "simplehouse",
    title: "B2 · The floor",
    markdown: `A \`Slab\` takes a curve, a thickness and an elevation. Use the footprint for a
floor slab.`,
    code: `W = 500
D = 400
pts = [Point(0, 0, 0), Point(W, 0, 0), Point(W, D, 0), Point(0, D, 0)]
Slab(Curve(List(*pts)), 20, 0)`,
  },
  {
    id: "h3-walls",
    track: "simplehouse",
    title: "B3 · The walls",
    markdown: `A \`Wall\` takes a \`Line\`, a thickness and a height. Add one wall per edge of
the footprint.`,
    code: `W = 500
D = 400
H = 300
T = 20
Wall(Line(Point(0, 0, 0), Point(W, 0, 0)), T, H)
Wall(Line(Point(W, 0, 0), Point(W, D, 0)), T, H)
Wall(Line(Point(W, D, 0), Point(0, D, 0)), T, H)
Wall(Line(Point(0, D, 0), Point(0, 0, 0)), T, H)`,
    hints: ["Wall(line, thickness, height) — the order matters."],
  },
  {
    id: "h4-roof",
    track: "simplehouse",
    title: "B4 · The roof",
    markdown: `A first roof: a flat \`Slab\` at the top of the walls (elevation \`H\`). A gable
roof is the alternative exercise.`,
    code: `W = 500
D = 400
H = 300
pts = [Point(0, 0, H), Point(W, 0, H), Point(W, D, H), Point(0, D, H)]
Slab(Curve(List(*pts)), 20, H)`,
    hints: ["Try H + 20 to lift the roof above the walls."],
  },
  {
    id: "h5-function",
    track: "simplehouse",
    title: "B5 · A house function",
    markdown: `Group the floor and walls into a \`house(x, y)\` function so a house can be
placed anywhere.`,
    code: `W = 500
D = 400
H = 300
T = 20

def house(x, y):
    pts = [Point(x, y, 0), Point(x + W, y, 0), Point(x + W, y + D, 0), Point(x, y + D, 0)]
    Slab(Curve(List(*pts)), 20, 0)
    Wall(Line(Point(x, y, 0), Point(x + W, y, 0)), T, H)
    Wall(Line(Point(x + W, y, 0), Point(x + W, y + D, 0)), T, H)
    Wall(Line(Point(x + W, y + D, 0), Point(x, y + D, 0)), T, H)
    Wall(Line(Point(x, y + D, 0), Point(x, y, 0)), T, H)

house(0, 0)`,
  },
  {
    id: "h6-row",
    track: "simplehouse",
    title: "B6 · A row of houses",
    markdown: `Call \`house()\` in a loop to place a row of houses, spacing them by the
footprint width plus a gap.`,
    code: `W = 500
D = 400
H = 300
T = 20

def house(x, y):
    pts = [Point(x, y, 0), Point(x + W, y, 0), Point(x + W, y + D, 0), Point(x, y + D, 0)]
    Slab(Curve(List(*pts)), 20, 0)
    Wall(Line(Point(x, y, 0), Point(x + W, y, 0)), T, H)
    Wall(Line(Point(x + W, y, 0), Point(x + W, y + D, 0)), T, H)
    Wall(Line(Point(x + W, y + D, 0), Point(x, y + D, 0)), T, H)
    Wall(Line(Point(x, y + D, 0), Point(x, y, 0)), T, H)

for i in range(3):
    house(i * (W + 100), 0)`,
    hints: ["i * (W + 100) leaves a 100 unit gap between houses."],
  },
];
