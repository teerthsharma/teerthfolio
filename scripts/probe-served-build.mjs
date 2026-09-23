// Is the server serving the build that is on disk?
//
// This has gone wrong three separate ways in one session, and every time the
// symptom was a measurement that succeeded and reported the wrong world:
//
//   - `npm run build` stopped at a failing contract, so `next build` never ran
//     and .next still held the previous build. The probe measured it happily and
//     reported no change, which was read as the change doing nothing.
//   - `next build` replaced .next underneath a server that was already running,
//     so the served chunks 404ed and the world never reached webgl.
//   - a server started before a rebuild kept serving the old bundle, so a fix
//     measured as absent.
//
// None of those announce themselves. A stale server answers 200 for the pages it
// knows about, and a stale .next is a complete working build of something else.
//
// The check is cheap: the newest chunk on disk must be fetchable from the server.
// A build that never ran leaves that chunk absent from disk entirely; a server
// that predates the build does not know the chunk exists.
import { readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.PROBE_BASE || "http://localhost:3100";
const CHUNKS = join(".next", "static", "chunks");

export async function newestChunkOnDisk() {
  const names = (await readdir(CHUNKS)).filter((name) => name.endsWith(".js"));
  if (names.length === 0) throw new Error("no chunks on disk: has next build run?");
  const stamped = await Promise.all(
    names.map(async (name) => ({ name, at: (await stat(join(CHUNKS, name))).mtimeMs })),
  );
  stamped.sort((a, b) => b.at - a.at);
  return stamped[0];
}

export async function assertServedBuildIsCurrent() {
  const newest = await newestChunkOnDisk();
  const response = await fetch(`${BASE}/_next/static/chunks/${newest.name}`);
  if (!response.ok) {
    throw new Error(
      `the server is not serving the build on disk: ${newest.name} is the newest chunk built ` +
        `but the server answers ${response.status} for it. Restart the server before measuring.`,
    );
  }
  return newest.name;
}

// Runnable on its own so it can be used as a precondition from the shell.
// Compared through fileURLToPath rather than by string: on Windows import.meta.url
// is file:///C:/... while argv[1] is a drive path, so the naive comparison silently
// never matches and this block quietly does nothing — which is how it shipped.
if (process.argv[1] && resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
  try {
    const name = await assertServedBuildIsCurrent();
    console.log(`served build is current: ${name} is on disk and reachable`);
  } catch (error) {
    console.error(String(error.message));
    process.exit(1);
  }
}
