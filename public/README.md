# public

Static files that Next.js serves as-is at the site root. Everything here is downloaded by visitors.

## Belongs here

- `fonts/`: self-hosted typefaces.
- `org/`: organisation logos shown on the site.
- `topo/`: baked topological-shader data, written by `scripts/bake-route-heat.mjs` (see `topo/README.md`).
- `humans.txt` and `llms.txt`.

## Does not belong here

- Notes, drafts or scratch files, which are published as served.
- Measured output and anything generated locally and ignored.
- Source code: that lives in `app/`, `components/` and `lib/`.
