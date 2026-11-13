# BIMR

The legacy **BIMR engine**, packaged as a core-owned Tablette module. It owns
the `@bimr/web` runtime, the MicroPython assets, the IFCX viewer bundle and the
Learn lessons.

| | |
|:--|:--|
| **Module** | core, `src/modules/bimr/` |
| **Modes** | Explore, Learn, Build |
| **Tools** | `bimr_help`, `bimr_samples`, `bimr_run` |
| **Runtime** | `@bimr/web`, MicroPython, IFCX viewer |
| **Default** | enabled |

## What it is

BIMR is the engine behind the Learn lessons and the legacy Build surface. It
compiles Python into a model and renders it in the viewer.

Module files:

| File | Responsibility |
|------|----------------|
| `session.ts` | Owns the `@bimr/web` runtime/project, run snapshots and sample helpers |
| `help.ts` | Reads the BIMR help page published on bimr.net |
| `tools.ts` | Contributes `bimr_help`, `bimr_samples` and the Learn-only `bimr_run` |
| `prompts.ts` | Python vocabulary, idioms and compile-error rules |
| `viewer.mjs` | Synced IFCX viewer bundle used by the legacy viewer pane |

The workspace and the core file tools (`list_files`, `read_file`, `write_file`,
`edit_file`, `open_file`) remain core (`src/forge/workspace.ts`).

## Tools

| Tool | Modes | Purpose |
|------|-------|---------|
| `bimr_help` | Explore, Learn, Build | Read the BIMR help page on bimr.net |
| `bimr_samples` | Explore, Learn, Build | Read models from the `bimr/samples` forge repository |
| `bimr_run` | Learn | Compile and render the active Python file |

`bimr_run` was `run_model` before the module move. The module context carries
the requesting mode, so the run tool is not exposed in Explore or Build.

## Learn lessons

The Learn mode ships two tracks adapted from Pygram:

| Track | Lessons |
|-------|---------|
| **Tetris** | Unit cell, O, I, L, T and board |
| **SimpleHouse** | Footprint, floor, walls, roof and functions |

Each lesson has Markdown notes, starter Python and optional hints. The **Run
lesson** button calls the BIMR session directly; the module toggle only affects
the agent's tools and prompt.

## Enable and disable

The module is enabled by default. Disabling it removes its tools and prompt
from the next request. The Learn lesson runner still works, because it calls
the session directly rather than through the agent.

## Runtime assets

`npm run sync:bimr` refreshes:

- `public/mp/` — the MicroPython runtime;
- `public/samples/` — sample models;
- `src/modules/bimr/viewer.mjs` — the IFCX viewer bundle.

The first two are generated and ignored by git. `viewer.mjs` is tracked and
must not be edited by hand; the sync script owns it.

## Why it is core-owned

The other data modules are npm packages. BIMR is not yet: it owns mutable
runtime assets, a synced viewer bundle and the lesson player. Packaging it is a
separate decision; until then it stays in `src/modules/bimr/` and is composed
by the same registry as the installed modules.

## Attribution

The BIMR help page and samples are read from bimr.net and the forge. Check the
BIMR project for the license and credit terms of the runtime and the sample
models.

## Next steps

- [Modes](/guide/modes) — Learn and Build.
- [Architecture](/reference/architecture) — the module boundary.
- [Module SDK](/reference/module-sdk) — the package contract.
