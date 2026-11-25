// token-radar-01 entrypoint, radar-7 build. Node 22, standard library only, no network.
//
// A run, in order:
//   1. find the sealed snapshot: --input names a snapshot.json file or the
//      directory holding one; without it, /input (the grader's mount)
//   2. score every pre-token protocol in the snapshot with lib/model.ts
//   3. check the finished board against the gate's own rules (boardIssue)
//      and stop before writing anything if the gate would refuse it
//   4. write board.json and the dashboard's data.js
//   5. copy dashboard/ and screenshots/ into the output tree, checking the
//      screenshot count and file names as they land
//   6. write dossier.json last, through the vendored buildDossier: the
//      scorer rebuilds the dossier from the output directory and compares
//      bytes, so the run ends the moment this file is written
//
// The output directory is --output when given, else $MAKEFUN_OUTPUT_DIR,
// else /output. A local run:
//   node main.ts --input ../input/snapshot.json --output out

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { boardIssue, buildRadar, dataScript, parseSnapshot } from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

// The gate's limits, restated here so a bad run fails on this machine first:
// the dossier's text budget, the screenshot count and size, the dashboard's
// file count and bytes, and the smallest number of screenshots a hand-in
// may carry.
const TEXT_BUDGET = 65_536;
const MAX_SHOTS = 4;
const MAX_SHOT_BYTES = 524_288;
const MAX_DASH_FILES = 400;
const MAX_DASH_BYTES = 4_194_304;
const MIN_SHOTS = 3;
const SHOT_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/** A problem that stops the run with a chosen exit code. */
class Fail extends Error {
  exitCode: number;
  constructor(exitCode: number, message: string) {
    super(message);
    this.exitCode = exitCode;
  }
}

// Flags arrive as "--name value" or "--name=value"; when both spellings of
// one flag appear, the spaced one is the one that counts, which is how the
// kit invokes the program — so read the joined spellings first, then let
// the spaced spellings overwrite them.
function readFlags(argv: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    if (eq > 2) flags[arg.slice(2, eq)] = arg.slice(eq + 1);
  }
  for (let i = 0; i + 1 < argv.length; i++) {
    const arg = argv[i]!;
    if (arg.startsWith('--') && !arg.includes('=')) flags[arg.slice(2)] = argv[i + 1]!;
  }
  return flags;
}

// Copy a directory's plain files into the output tree and report the names
// copied. Dotfiles and subdirectories are not part of the hand-in, so both
// are left behind; a missing source directory copies as nothing at all.
function copyFiles(fromDir: string, toDir: string): string[] {
  if (!fs.existsSync(fromDir)) return [];
  fs.mkdirSync(toDir, { recursive: true });
  const copied: string[] = [];
  for (const entry of fs.readdirSync(fromDir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || !entry.isFile()) continue;
    fs.copyFileSync(path.join(fromDir, entry.name), path.join(toDir, entry.name));
    copied.push(entry.name);
  }
  return copied;
}

// The screenshot rules, enforced on what was actually copied into the
// output: at least the minimum count, and every name inside the alphabet
// the dossier accepts.
function checkShots(names: string[]): void {
  if (names.length < MIN_SHOTS) {
    throw new Fail(1, `screenshots/ holds ${names.length} image${names.length === 1 ? '' : 's'}: hand in ${MIN_SHOTS} — the board, a detail view and a filtered view`);
  }
  for (const name of names) {
    if (!SHOT_NAME.test(name)) {
      throw new Fail(1, `screenshots/${name}: a name is letters, digits and . _ -, 1 to 128 characters`);
    }
  }
}

function run(): void {
  const flags = readFlags(process.argv.slice(2));
  const inputArg = flags.input ?? '/input';
  const snapshotPath = inputArg.endsWith('.json') ? inputArg : path.join(inputArg, 'snapshot.json');
  if (!fs.existsSync(snapshotPath)) {
    throw new Fail(2, `no snapshot at ${snapshotPath}: pass --input <snapshot.json|directory> or mount the sealed /input`);
  }
  const outDir = flags.output ?? process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

  const snapshot = parseSnapshot(fs.readFileSync(snapshotPath, 'utf8'));
  const { board, radar } = buildRadar(snapshot);
  const issue = boardIssue(board, snapshot);
  if (issue !== null) throw new Fail(1, `the model wrote a board the gate refuses: ${issue}`);

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'board.json'), JSON.stringify({ rows: board }) + '\n');
  fs.writeFileSync(path.join(outDir, 'data.js'), dataScript(radar));

  copyFiles(path.join(rootDir, 'dashboard'), path.join(outDir, 'dashboard'));
  const shots = copyFiles(path.join(rootDir, 'screenshots'), path.join(outDir, 'screenshots'));
  checkShots(shots);

  const dossier = buildDossier(outDir, {
    text_max_bytes: TEXT_BUDGET,
    screenshots: { max: MAX_SHOTS, max_bytes: MAX_SHOT_BYTES },
    dashboard: { max_files: MAX_DASH_FILES, max_bytes: MAX_DASH_BYTES },
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
  run();
} catch (err) {
  if (err instanceof Fail) {
    process.stderr.write(`token radar: ${err.message}\n`);
    process.exit(err.exitCode);
  }
  throw err;
}
