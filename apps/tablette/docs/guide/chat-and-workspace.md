# Chat and workspace

The assistant, the file workspace and the live surface share one page. This
page explains what happens between a prompt and a rendered app.

## The loop

1. **Describe** — write what you want in the chat.
2. **Generate** — the assistant calls workspace tools to read and write files.
3. **Run** — `run_app` publishes the active HTML document to the Viewer.
4. **Edit** — open the same file in the Editor, change it, press **Run**.
5. **Keep** — the workspace persists in the browser across reloads.

Generating and editing are the same loop. There is no import/export step
between the chat and the Editor.

## The workspace

The workspace is a file tree stored in **IndexedDB** through LightningFS. The
root is `/workspace`; the UI shows workspace-relative paths.

- The default file is `maps/sketch.html`.
- Writing a `.html` file makes it the active app.
- The Editor is bound to the **active file**.
- The file menu opens another file or starts a new session.

Files are plain text. The agent uses the same tools a person could script:
`list_files`, `read_file`, `write_file`, `edit_file` and `open_file`.
`edit_file` is preferred for targeted changes because it keeps large files out
of the model output.

::: tip Persistence is per-origin
localStorage and IndexedDB are scoped to the origin. The workspace on
`https://studio.example` is invisible to `https://docs.example`. Clearing site
data removes it.
:::

## Tool calls and proposals

The chat shows a chip for each tool call (`write_file`, `gis_list_blocks`,
`canutes_query`, …). Open a chip to inspect the input and result. Long tool
results are truncated in the transcript but kept in the session dump.

Some actions are **client-side tools**:

- `propose_actions` — the assistant presents choices as buttons. Use it for
  next steps, repository choices and every mutating or irreversible action
  (create a repo, clone, commit, tag, push, save an app).
- `switch_mode` — applies a mode change and resumes the turn with the new
  prompt and tools.

The assistant should never commit or push unless you explicitly ask. When you
do ask, it commits and pushes in the same turn. It works on `main` and does not
force-push.

## The Editor

The Sketch surface has two tabs:

- **Editor** — CodeMirror 6 with HTML syntax highlighting.
- **Viewer** — a sandboxed `srcdoc` iframe.

Press **Run** to render the active file. Switching to **Viewer** also runs the
current source. If the file is not HTML, Run is disabled.

The footer shows the document kind (`Map`, `Report` or `File`), the active path
and a short status. The Viewer is sandboxed with scripts and popups allowed; it
has no same-origin access to the Studio page.

## Sessions and history

The top bar has:

- **New session** (`+`) — clears the trace and usage totals, resets the map
  preview and starts a fresh chat.
- **Session dump** (`</>`) — inspect the composed system prompt, enabled tools,
  the trace and the last request.
- **Usage** — accumulated token count and estimated cost for the session.
- **File menu** — switch the active file.

Chat history and usage are stored locally. They are not sent to a server beyond
the model request itself.

## Prompt history

The composer keeps previous prompts in `localStorage` under
`studio.promptHistory`. Use the arrow keys to recall them. History is local to
the browser.

## What the assistant sees

The system prompt is composed from the current mode plus the prompt sections of
every enabled module. The tool set follows the same rule. Disabling a module
removes its tools and prompt from the next request.

A greeting is not a request to build something. If the intent is unclear, the
assistant asks one short question instead of inventing an app.

## Next steps

- [Modes](/guide/modes) — what changes when you switch.
- [Map apps](/guide/map-apps) — the default artifact.
- [Settings](/guide/settings) — where the configuration lives.
