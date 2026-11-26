// token-radar-01 entrypoint, radar-9 build. Node 22, standard library only, no network.
//
// What one run does, in order:
//   1. locate the sealed snapshot from --input (a snapshot.json file or the directory
//      holding one; without the flag, the grader's /input mount)
//   2. score every rankable pre-token protocol in it through lib/model.ts
//   3. refuse to write anything when the finished board would fail the gate's
//      own rules (boardIssue) — a bad board is caught here, not on the platform
//   4. write board.json plus the dashboard's data.js
//   5. copy dashboard/ and screenshots/ into the output tree, validating the
//      screenshot names and count as they land
//   6. write dossier.json last through the vendored buildDossier: the scorer
//      rebuilds the dossier from the output directory and compares bytes, so
//      the run ends the moment this file lands
//
// The output directory comes from --output, else $MAKEFUN_OUTPUT_DIR, else
// /output. A local run:
//   node main.ts --input ../input/snapshot.json --output out

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { boardIssue, buildRadar, dataScript, parseSnapshot } from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

// The gate's caps, restated on this side so a run that would fail there fails
// here first: how much text the dossier may carry, how many screenshots and
// how large, and how big the dashboard may be in files and bytes.
const DOSSIER_TEXT_CAP = 65_536;
const SHOTS_AT_MOST = 4;
const SHOT_BYTES_CAP = 524_288;
const DASH_FILES_CAP = 400;
const DASH_BYTES_CAP = 4_194_304;
const SHOTS_AT_LEAST = 3;
const SHOT_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;

const here = path.dirname(fileURLToPath(import.meta.url));

/** A run-stopping problem that carries its own exit code. */
class Abort extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * Read --name value and --name=value flags. When one flag arrives in both
 * spellings, the spaced spelling wins, which matches how the kit calls the
 * program — so the joined spellings are read first, then the spaced ones
 * overwrite them.
 */
function flagsOf(argv: string[]): Record<string, string> {
  const found: Record<string, string> = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    if (eq > 2) found[arg.slice(2, eq)] = arg.slice(eq + 1);
  }
  for (let i = 0; i + 1 < argv.length; i++) {
    const arg = argv[i]!;
    if (arg.startsWith('--') && !arg.includes('=')) found[arg.slice(2)] = argv[i + 1]!;
  }
  return found;
}

/**
 * Copy a directory's plain files into the output tree and return the names
 * that landed. Dotfiles and subdirectories are not part of the hand-in, so
 * both stay behind; a source directory that is not there copies as nothing.
 */
function copyPlainFiles(fromDir: string, toDir: string): string[] {
  if (!fs.existsSync(fromDir)) return [];
  fs.mkdirSync(toDir, { recursive: true });
  const landed: string[] = [];
  for (const entry of fs.readdirSync(fromDir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || !entry.isFile()) continue;
    fs.copyFileSync(path.join(fromDir, entry.name), path.join(toDir, entry.name));
    landed.push(entry.name);
  }
  return landed;
}

/**
 * The screenshot rules, enforced on what actually landed in the output:
 * at least the minimum count, and every name inside the alphabet the
 * dossier accepts.
 */
function assertShots(names: string[]): void {
  if (names.length < SHOTS_AT_LEAST) {
    throw new Abort(1, `screenshots/ holds ${names.length} image${names.length === 1 ? '' : 's'}: hand in ${SHOTS_AT_LEAST} — the board, a detail view and a filtered view`);
  }
  for (const name of names) {
    if (!SHOT_NAME.test(name)) {
      throw new Abort(1, `screenshots/${name}: a name is letters, digits and . _ -, 1 to 128 characters`);
    }
  }
}

function main(): void {
  const flags = flagsOf(process.argv.slice(2));
  const inputArg = flags.input ?? '/input';
  const snapshotPath = inputArg.endsWith('.json') ? inputArg : path.join(inputArg, 'snapshot.json');
  if (!fs.existsSync(snapshotPath)) {
    throw new Abort(2, `no snapshot at ${snapshotPath}: pass --input <snapshot.json|directory> or mount the sealed /input`);
  }
  const outDir = flags.output ?? process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

  const snapshot = parseSnapshot(fs.readFileSync(snapshotPath, 'utf8'));
  const { board, radar } = buildRadar(snapshot);
  const issue = boardIssue(board, snapshot);
  if (issue !== null) throw new Abort(1, `the model wrote a board the gate refuses: ${issue}`);

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'board.json'), JSON.stringify({ rows: board }) + '\n');
  fs.writeFileSync(path.join(outDir, 'data.js'), dataScript(radar));

  copyPlainFiles(path.join(here, 'dashboard'), path.join(outDir, 'dashboard'));
  const shots = copyPlainFiles(path.join(here, 'screenshots'), path.join(outDir, 'screenshots'));
  assertShots(shots);

  const dossier = buildDossier(outDir, {
    text_max_bytes: DOSSIER_TEXT_CAP,
    screenshots: { max: SHOTS_AT_MOST, max_bytes: SHOT_BYTES_CAP },
    dashboard: { max_files: DASH_FILES_CAP, max_bytes: DASH_BYTES_CAP },
  });
  fs.writeFileSync(path.join(outDir, 'dossier.json'), dossier);

  process.stdout.write(
    `token radar: ${snapshot.protocols.length} protocols, ${snapshot.watchlist.length} on the watchlist, ` +
      `${board.length} rows scored (${radar.early_size} early, ${radar.live_size} live set aside)\n` +
      `token radar: wrote ${path.join(outDir, 'board.json')}, ${path.join(outDir, 'data.js')}, ` +
      `${path.join(outDir, 'dashboard')} (3 files), ${path.join(outDir, 'screenshots')} (${shots.length} images) ` +
      `and ${path.join(outDir, 'dossier.json')}\n`,
  );
}

try {
  main();
} catch (err) {
  if (err instanceof Abort) {
    process.stderr.write(`token radar: ${err.message}\n`);
    process.exit(err.code);
  }
  throw err;
}
