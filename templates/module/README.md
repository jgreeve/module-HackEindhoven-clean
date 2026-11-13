# __MODULE_ID__

Owner: add the responsible person or team and link an assigned GitHub issue.

## Scope

Describe the feature, user-facing page/tabs, expected inputs/outputs, and data sources.
Keep UI, API clients, tools, styles and tests in this package. Import host capabilities
through `@tablette/module-sdk`; project sample declarations use
`@hackeindhoven/module-contracts`. Do not import application internals.

## Development

From the repository root:

```sh
npm run dev
npm run watch --workspace=@tablette/module-__MODULE_ID__
```

Run the second command in another terminal while editing this package; refresh
the browser after a rebuild. `npm run check` validates the complete integration.
Add behavior tests as real functionality is introduced.
