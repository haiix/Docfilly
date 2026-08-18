# Docfilly brand assets

`source/docfilly-icon.svg` is the canonical icon source. Edit this file when the
icon design changes.

Run the following command from the repository root to update the web assets:

```sh
pnpm generate:icons
```

The command writes the browser-facing SVG and PNG files to
`apps/web/public/icons/`. Do not edit those generated files directly.

## Trimming

Configure the generated icon crop in `icon-generation.json`. The `top`,
`right`, `bottom`, and `left` values use the source SVG viewBox coordinates;
positive values remove space from that edge. The values must leave a square
viewBox. Keep all values at `0` to preserve the source SVG framing.

For example, this removes 64 units from every edge of the 1024-unit source:

```json
{
  "trim": {
    "top": 64,
    "right": 64,
    "bottom": 64,
    "left": 64
  }
}
```

The current icon palette is:

- Navy: `#13253D` to `#0B1B31`
- Lime: `#D8FF55` to `#B7EF43`
- Violet: `#665BFF` to `#5145E8`
- White: `#FFFFFF`
