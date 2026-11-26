// token-radar-01 entrypoint, radar-8 build. Node 22, standard library only, no network.
//
// What a run does, in the order it does it:
//
//   1. Resolve the snapshot. --input names the file itself or the folder
//      holding it; with no flag the sealed mount at /input is assumed.
//   2. Score the snapshot into a board (lib/model.ts) and hold the board
//      up against the gate's rules before a single byte is written: a
//      board the scorer would refuse stops the run here, not downstream.
//   3. Lay out /output: board.json and data.js first, then the dashboard/
//      and screenshots/ copies, then dossier.json — always last, because
//      the scorer rebuilds the dossier from the finished tree and
//      compares it byte for byte, so nothing may change after it lands.
//
// Where the output goes: --output, else $MAKEFUN_OUTPUT_DIR, else /output.
// A local run looks like:
//   node main.ts --input ../input/snapshot.json --output out

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { boardIssue, buildRadar, dataScript, parseSnapshot } from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

// The hand-in's limits, restated at the door so a bad tree fails here
// rather than at the scorer: the dossier's text budget, how many
// screenshots a hand-in carries and how large each may be, and how much
// dashboard the dossier will hold.
const DOSSIER_TEXT_BYTES = 65_536;
const SHOTS_MIN = 3;
const SHOTS_MAX = 4;
const SHOT_BYTES_MAX = 524_288;
const DASH_FILES_MAX = 400;
const DASH_BYTES_MAX = 4_194_304;
const SHOT_NAME_OK = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;

const here = path.dirname(fileURLToPath(import.meta.url));

/** A run-stopping problem, carrying the exit code the shell should see. */
class Abort extends Error {
  readonly code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * Read "--name value" and "--name=value" flags into one record. The kit
 * calls the program with the spaced spelling, so when a flag arrives in
 * both spellings the spaced one wins: collect the joined spellings
 * first, then let the spaced ones overwrite.
 */
function readCli(argv: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (const arg of argv) {
    const eq = arg.startsWith('--') ? arg.indexOf('=') : -1;
    if (eq > 2) flags[arg.slice(2, eq)] = arg.slice(eq + 1);
  }
  for (let i = 0; i + 1 < argv.length; i++) {
    const arg = argv[i]!;
    if (arg.startsWith('--') && !arg.includes('=')) flags[arg.slice(2)] = argv[i + 1]!;
  }
  return flags;
}

/**
 * Copy one directory's plain files across and return the names copied.
 * The hand-in holds no dotfiles and no nested folders, so both are left
 * where they lie; a directory that does not exist copies as an empty
 * list rather than an error — the screenshot check below is the one
 * that decides whether an empty copy is acceptable.
 */
function stageCopy(fromDir: string, toDir: string): string[] {
  if (!fs.existsSync(fromDir)) return [];
  fs.mkdirSync(toDir, { recursive: true });
  const names: string[] = [];
  for (const entry of fs.readdirSync(fromDir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || !entry.isFile()) continue;
    fs.copyFileSync(path.join(fromDir, entry.name), path.join(toDir, entry.name));
    names.push(entry.name);
  }
  return names;
}

/**
 * The screenshot rules, checked against what actually landed in the
 * output: enough images for the board, a detail and a filtered view,
 * and every name inside the alphabet the dossier accepts.
 */
function guardShots(names: string[]): void {
  if (names.length < SHOTS_MIN) {
    throw new Abort(1, `screenshots/ holds ${names.length} image${names.length === 1 ? '' : 's'}: hand in ${SHOTS_MIN} — the board, a detail view and a filtered view`);
  }
  for (const name of names) {
    if (!SHOT_NAME_OK.test(name)) {
      throw new Abort(1, `screenshots/${name}: a name is letters, digits and . _ -, 1 to 128 characters`);
    }
  }
}

function main(): void {
  const flags = readCli(process.argv.slice(2));
  const given = flags.input ?? '/input';
  const snapshotPath = given.endsWith('.json') ? given : path.join(given, 'snapshot.json');
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

  stageCopy(path.join(here, 'dashboard'), path.join(outDir, 'dashboard'));
  const shots = stageCopy(path.join(here, 'screenshots'), path.join(outDir, 'screenshots'));
  guardShots(shots);

  const dossier = buildDossier(outDir, {
    text_max_bytes: DOSSIER_TEXT_BYTES,
    screenshots: { max: SHOTS_MAX, max_bytes: SHOT_BYTES_MAX },
    dashboard: { max_files: DASH_FILES_MAX, max_bytes: DASH_BYTES_MAX },
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
