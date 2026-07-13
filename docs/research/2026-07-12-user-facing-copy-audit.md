# User-facing copy audit — 2026-07-12

Status: implementation audit in progress; final browser wording proof belongs to Wave E.

Each visible surface must answer four questions: what state or fact does it communicate, what source owns that fact, what action becomes possible, and why it must be visible now. If a surface cannot answer all four, its text is removed or deferred until arrival/focus.

| Surface | Decision | Purpose | Source or state authority | Final copy rule |
| --- | --- | --- | --- | --- |
| Entry gate | Keep title, one sentence, one dominant action, one tiny alternate hint | Name the world and start or bypass the 3D route | Static site identity; renderer gate state | `Seal's Topology Land`; `Start the adventure into Seal's Topological Land`; `Scroll left if boring`. No renderer jargon or fake loading percentage. |
| World masthead | Keep compact and peripheral | Identify owner/world after entry | Static site identity | Name only; no repeated mission paragraph over the scene. |
| Route instrument | Move to a screen edge and collapse while docked | Show destination, travel phase, and progress without covering the seal or monument | Canonical traversal presentation | Destination/arrival + percentage only. Remove `open world stream`, `field renderer`, `station loop`, and `evidence index` from settled gameplay. |
| Control hint | Keep until first successful input, then dismiss | Teach WASD or touch routing | Input capability + first-input state | `WASD moves the seal` on keyboard devices; direct tap guidance on coarse pointers. Do not repeat permanently. |
| Station evidence | Keep at an edge only after arrival | Explain the current physical place and expose project evidence | Earned docked station, never selected destination | Station name, specific project/system signal, one direct description. No Plaque text while routing to another station. |
| GitHub radar | Keep source label, repository, event, date, and direct link | Show current public upstream activity without invention | Server-provided `live-github` or `research-snapshot` | `Live GitHub API` only for live data; `Research snapshot` for fallback. No fallback item is labeled live. |
| Topology archive | Keep as an explicit offer only after docking | Let users choose the archive without forced navigation | Earned Topology arrival + user confirmation | `Enter the topology archive`; `Stay in the polar world`. Tooling/Assembly never uses this prompt. |
| Project index | Keep project selector, purpose, repository scope, language size, commit sample, source link | Provide a complete non-game route to technical evidence | Corpus + live complete GitHub tree or dated complete-tree snapshot | Complete scope: `1,013 tracked / 397 Rust`; curated arrays: `sampled paths`; commits: `recent commits`; never `6 files`. |
| Language bytes | Keep as an explicitly sized language mix | Communicate repository composition without guessing lines of code | GitHub languages bytes in corpus | Use `MiB`, `KiB`, or `B`. Do not infer line count from bytes. |
| Quality controls | Keep four direct controls | Let users choose GPU quality and contrast | Current render state | `Low`, `Medium`, `High`, `Contrast`; High is the normal default, Low remains a safe/explicit path. |
| Fallback | Keep only when WebGL is unavailable, safe mode is requested, or a real renderer error occurs | Preserve access and explain the actual failure | Renderer lifecycle diagnostics | State the failure and provide retry/index access. Do not show internal diagnostic prose during healthy rendering. |
| Seal guidance | Keep sparse directional hints | Make the companion functional without speech-heavy narration | Arrived/idle timer + adjacent route | One actionable neighboring direction every 15 seconds; suppress during movement, portal, and offscreen states. |

## Station naming and personality

| Station | Text earns its place by naming | Avoid |
| --- | --- | --- |
| Plaque | Antarctic observatory, corpus entry, source count | Generic welcome copy |
| S2 Core | Epsilon-Hollow, Seal OS, boot/runtime proof, CERN-style antimatter containment | `High-tech core`, unexplained S2 jargon |
| Aether | Aether-Lang, persistent homology, primordial golden energy seed | Repeating S2 orbital language |
| Field | Faraday/Hamilton field work, thermal/plasma containment | Ice terminology or generic physics prose |
| QPU | TopoBridge-Q, homology verification, alien coherence causeway | Black/colorless `quantum` decoration |
| Upstream | Public GitHub activity, radio signal harbor | Invented activity or vague `live signal` |
| Topology | Named topology repositories and relational archive trace | Forced portal, black-hole metaphor before consent |
| Tooling / Assembly | Inspectable tools, proof, computational archaeology | `Tool locker`, generic warehouse copy |

## Removed or rejected patterns

- Curated evidence array length presented as repository total.
- Large center-screen route title and three decorative subsystem labels.
- Generic CTAs such as `Get started`, `Learn more`, or `Explore more`.
- Meta-commentary that tells users the page is impressive instead of naming evidence.
- Buzzwords and empty intensifiers from UI-authored copy.
- Unexplained pseudo-technical status strings during healthy rendering.
- Repeated project/station descriptions on the gate, HUD, and evidence card simultaneously.

## Proof still required

- Browser capture of gate, route, arrival, archive prompt, safe fallback, and project index.
- Screen-reader snapshot of gate, side route instrument, project selector, portal offer, and quality controls.
- Forced GitHub API failure proving fallback labels.
- Width checks at desktop, tablet, and mobile so copy never covers the hero plane.
