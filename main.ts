// token-radar-01 entrypoint. Node 22, standard library only, no network.
//
// What a run does, in order:
//   1. locate the sealed snapshot (default /input, override with --input <file|dir>)
//   2. score every pre-token protocol with the model in lib/model.ts
//   3. refuse to hand in a board the gate would reject (boardIssue is the local mirror)
//   4. write board.json and the dashboard's data.js into the output directory
//   5. copy dashboard/ and screenshots/ across, checking the screenshot rules
//   6. write dossier.json last of all — the scorer rebuilds it from the output
//      directory and compares bytes, so nothing may change after this point
//
// The output directory is --output when given, else $MAKEFUN_OUTPUT_DIR, else
// /output (the grader's mount). A local run looks like:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { boardIssue, buildRadar, dataScript, parseSnapshot } from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

// The scorer's caps, mirrored from the gate so a bad run fails here first.
const DOSSIER_TEXT_CAP = 65_536;
const SHOT_LIMITS = { max: 4, max_bytes: 524_288 };
const DASH_LIMITS = { max_files: 400, max_bytes: 4_194_304 };
const SHOT_NAME_OK = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;
const MIN_SHOTS = 3;

const repoDir = path.dirname(fileURLToPath(import.meta.url));

function die(code: number, message: string): never {
  process.stderr.write(`token radar: ${message}\n`);
  process.exit(code);
}

// Command line flags come in two spellings, "--name value" and "--name=value";
// the spaced spelling wins when both are present, matching how the kit calls us.
function flagValue(name: string): string | undefined {
  const args = process.argv.slice(2);
  const spaced = args.indexOf(`--${name}`);
  if (spaced !== -1) return args[spaced + 1];
  const joined = args.find((a) => a.startsWith(`--${name}=`));
  return joined === undefined ? undefined : joined.slice(name.length + 3);
}

// Mirror one directory's plain files into the output tree. Dotfiles and
// subdirectories are not part of the hand-in, so both are skipped.
function mirrorDir(fromDir: string, toDir: string): string[] {
  if (!fs.existsSync(fromDir)) return [];
  fs.mkdirSync(toDir, { recursive: true });
  const sent: string[] = [];
  for (const entry of fs.readdirSync(fromDir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || !entry.isFile()) continue;
    fs.copyFileSync(path.join(fromDir, entry.name), path.join(toDir, entry.name));
    sent.push(entry.name);
  }
  return sent;
}

function main(): void {
  const inputFlag = flagValue('input') ?? '/input';
  const snapshotPath = inputFlag.endsWith('.json') ? inputFlag : path.join(inputFlag, 'snapshot.json');
  if (!fs.existsSync(snapshotPath)) {
    die(2, `no snapshot at ${snapshotPath}: pass --input <snapshot.json|directory> or mount the sealed /input`);
  }
  const outDir = flagValue('output') ?? process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

  const snapshot = parseSnapshot(fs.readFileSync(snapshotPath, 'utf8'));
  const { board, radar } = buildRadar(snapshot);
  const problem = boardIssue(board, snapshot);
  if (problem !== null) die(1, `the model wrote a board the gate refuses: ${problem}`);

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'board.json'), JSON.stringify({ rows: board }) + '\n');
  fs.writeFileSync(path.join(outDir, 'data.js'), dataScript(radar));

  mirrorDir(path.join(repoDir, 'dashboard'), path.join(outDir, 'dashboard'));
  const shots = mirrorDir(path.join(repoDir, 'screenshots'), path.join(outDir, 'screenshots'));
  if (shots.length < MIN_SHOTS) {
    die(1, `screenshots/ holds ${shots.length} image${shots.length === 1 ? '' : 's'}: hand in 3, the board, a detail view and a filtered view`);
  }
  for (const name of shots) {
    if (!SHOT_NAME_OK.test(name)) {
      die(1, `screenshots/${name}: a name is letters, digits and . _ -, 1 to 128 characters`);
    }
  }

  const dossier = buildDossier(outDir, {
    text_max_bytes: DOSSIER_TEXT_CAP,
    screenshots: SHOT_LIMITS,
    dashboard: DASH_LIMITS,
  });
  fs.writeFileSync(path.join(outDir, 'dossier.json'), dossier);

  const summary =
    `token radar: ${snapshot.protocols.length} protocols, ${snapshot.watchlist.length} on the watchlist, ` +
    `${board.length} rows scored (${radar.early_size} early, ${radar.live_size} live set aside)`;
  const wrote =
    `token radar: wrote ${path.join(outDir, 'board.json')}, ${path.join(outDir, 'data.js')}, ` +
    `${path.join(outDir, 'dashboard')} (3 files), ${path.join(outDir, 'screenshots')} (${shots.length} images) ` +
    `and ${path.join(outDir, 'dossier.json')}`;
  process.stdout.write(summary + '\n' + wrote + '\n');
}

main();
