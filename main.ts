// token-radar-01 entrypoint, radar-5 build. Node 22, standard library only, no network.
//
// One run, end to end:
//   1. find the sealed snapshot — /input by default, or wherever --input points
//      (a snapshot.json file, or the directory holding one)
//   2. score every pre-token protocol in it with the model in lib/model.ts
//   3. hold the finished board up against the gate's own rules (boardIssue)
//      and refuse to write anything if the gate would refuse it too
//   4. write board.json, then the dashboard's data.js
//   5. copy dashboard/ and screenshots/ into the output tree, checking the
//      screenshot count and names on the way
//   6. write dossier.json last of all, through the vendored builder: the
//      scorer rebuilds the dossier from the output directory and compares
//      bytes, so after this write the run is over
//
// The output directory is --output when given, else $MAKEFUN_OUTPUT_DIR,
// else /output (the grader's mount). A local run looks like:
//   node main.ts --input ../input/snapshot.json --output out

import { buildDossier } from './vendor/makefun-board.ts';
import { boardIssue, buildRadar, dataScript, parseSnapshot } from './lib/model.ts';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import * as fs from 'node:fs';

// The gate's caps, restated here so a bad run fails at home first: the dossier
// text budget, the screenshot count and size limits, the dashboard file and
// byte limits, and the fewest screenshots a hand-in may carry.
const GATE = {
  dossierTextBytes: 65_536,
  shotMax: 4,
  shotMaxBytes: 524_288,
  dashMaxFiles: 400,
  dashMaxBytes: 4_194_304,
  shotsMin: 3,
};
const SHOT_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;

const here = path.dirname(fileURLToPath(import.meta.url));

/** A run-stopping problem, carrying the exit code the grader should see. */
class RunError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

// The command line accepts "--name value" and "--name=value". The spaced
// spelling wins when both appear, which is how the kit invokes the program,
// so collect the joined spellings first and let the spaced ones overwrite.
function readFlags(argv: string[]): Map<string, string> {
  const flags = new Map<string, string>();
  for (const arg of argv) {
    const eq = arg.startsWith('--') ? arg.indexOf('=') : -1;
    if (eq > 2) flags.set(arg.slice(2, eq), arg.slice(eq + 1));
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg.startsWith('--') && !arg.includes('=') && i + 1 < argv.length) {
      flags.set(arg.slice(2), argv[i + 1]!);
    }
  }
  return flags;
}

// Copy one directory's plain files into the output tree and return their
// names. The hand-in has no dotfiles and no subdirectories, so both are
// passed over; a missing source directory copies as nothing.
function copyFlat(fromDir: string, toDir: string): string[] {
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

// The screenshot rules, enforced on what was actually copied: at least the
// minimum count, and every name inside the dossier's alphabet.
function checkShots(names: string[]): void {
  if (names.length < GATE.shotsMin) {
    throw new RunError(
      1,
      `screenshots/ holds ${names.length} image${names.length === 1 ? '' : 's'}: a hand-in needs ${GATE.shotsMin} or ${GATE.shotMax} — the board, a detail view, a model view, a filtered view`,
    );
  }
  for (const name of names) {
    if (!SHOT_NAME.test(name)) {
      throw new RunError(1, `screenshots/${name}: names are letters, digits and . _ -, 1 to 128 characters`);
    }
  }
}

function run(): void {
  const flags = readFlags(process.argv.slice(2));
  const inputArg = flags.get('input') ?? '/input';
  const snapshotPath = inputArg.endsWith('.json') ? inputArg : path.join(inputArg, 'snapshot.json');
  if (!fs.existsSync(snapshotPath)) {
    throw new RunError(2, `no snapshot at ${snapshotPath}: pass --input <snapshot.json|directory> or mount the sealed /input`);
  }
  const outDir = flags.get('output') ?? process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

  const snapshot = parseSnapshot(fs.readFileSync(snapshotPath, 'utf8'));
  const { board, radar } = buildRadar(snapshot);
  const problem = boardIssue(board, snapshot);
  if (problem !== null) {
    throw new RunError(1, `the model wrote a board the gate refuses: ${problem}`);
  }

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'board.json'), JSON.stringify({ rows: board }) + '\n');
  fs.writeFileSync(path.join(outDir, 'data.js'), dataScript(radar));

  copyFlat(path.join(here, 'dashboard'), path.join(outDir, 'dashboard'));
  const shots = copyFlat(path.join(here, 'screenshots'), path.join(outDir, 'screenshots'));
  checkShots(shots);

  const dossier = buildDossier(outDir, {
    text_max_bytes: GATE.dossierTextBytes,
    screenshots: { max: GATE.shotMax, max_bytes: GATE.shotMaxBytes },
    dashboard: { max_files: GATE.dashMaxFiles, max_bytes: GATE.dashMaxBytes },
  });
  fs.writeFileSync(path.join(outDir, 'dossier.json'), dossier);

  const lines = [
    `token radar: ${snapshot.protocols.length} protocols, ${snapshot.watchlist.length} on the watchlist, ` +
      `${board.length} rows scored (${radar.early_size} early, ${radar.live_size} live set aside)`,
    `token radar: wrote ${path.join(outDir, 'board.json')}, ${path.join(outDir, 'data.js')}, ` +
      `${path.join(outDir, 'dashboard')} (3 files), ${path.join(outDir, 'screenshots')} (${shots.length} images) ` +
      `and ${path.join(outDir, 'dossier.json')}`,
  ];
  process.stdout.write(lines.join('\n') + '\n');
}

try {
  run();
} catch (err) {
  if (err instanceof RunError) {
    process.stderr.write(`token radar: ${err.message}\n`);
    process.exit(err.code);
  }
  throw err;
}
