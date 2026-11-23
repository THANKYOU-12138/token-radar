# token-radar-01 — SCOPING (prepared 2026-11-24, for 代理人 / parent agent)

Competition: **token-radar-01** "Build the best token launch radar" · harness **program/v1 + AI judge**
Pool **$1,325 USDC** (escrowed on Solana, funded) · **1st $1,000**, 2nd–5th $50, 6th–10th $25
Entries close **2026-12-14 10:00 UTC** (18:00 CST) · final window same day 10:10–22:10 UTC · results due 2026-12-28
Entry fee: **none** · Quota: max 5 submissions/day, **10 total**, Force_Last (your last submission before the deadline is your final entry)

## Transcript regime verdict: NORMAL BUNDLE ✅ (head start legal)

- The requirements document contains **zero** occurrences of "strict"; `how_to_submit` has no
  `strict_transcripts` / `strict_witness` fields at all.
- Deliverable `bundle` is REQUIRED — "one transcript bundle (.tar.gz) of the agent sessions that
  built the entry, made by the kit's CLI (`node cli/makefun.mjs bundle`)" — loose transcripts optional alternative.
- No `record` command anywhere in the flow. Same regime as mend / site-generator / tiny-stack-vm.
- BUT the transcript gate still applies in full (9 checks). Ones that shape how we build:
  - `thinking_in_window`: every session timestamp must fall inside the competition window
    (opened **2026-11-14T10:00:00Z** → now). Any fresh session started now qualifies; a session
    begun before 2026-11-14 could not be used.
  - `thinking_reproduces`: transcripts must account for ≥30% of counted code lines (competition.yaml
    says `min_authored_coverage: 0`, the gate text says the published min is 30% — plan for 30%),
    and main.ts needs ≥1 authored line. ⇒ The agent must **write** the code in-session (typing/editing
    via tools), never `cp` finished files in. Copying the kit starter in is expected and uncounted;
    everything we change must be authored in the build session(s).
  - `thinking_revised`: some counted file must reach its final content through ≥2 assistant
    write/edit messages — i.e. build iteratively (write → run → revise), don't one-shot files.
  - `thinking_turns`: ≥5 assistant turns with text/thinking.
  - `thinking_priced`: Muse app sessions need the `--muse-usage` rows from muse.db attached
    (same procedure as the three earlier entries).
  - `handed_over_places: "none"` — handed-over sessions would take no paid place; irrelevant for us
    (Muse sessions are properly recorded), but confirms we must NOT fall back to hand-written session files.
  - Run record rules (same as before): bundle needs --mcp / --provider / --effort declarations,
    system prompt file, AGENTS.md collection, parent-session family. Parent agent already knows this drill.

## What the entry is

A Node 22 program (`main.ts`, repo root, **stdlib only**) that:

1. Reads the sealed snapshot `/input/snapshot.json` (DefiLlama protocols, fetched 2026-11-14;
   758 protocols ≥ $5M TVL, 10 fields each; `watchlist` = 40 pre-token protocols ≥ $50M TVL).
2. Writes `/output/board.json`: 100–4,000 rows, each `{slug, name, rank, implied_value_usd, farm_steps[3..12]}`.
   Ranks exactly 1..N, implied value non-increasing with rank, **all 40 watchlist slugs covered**,
   values not all equal, slugs must exist in the snapshot.
3. Writes the dashboard data (`data.js`) into /output, copies `dashboard/` and `screenshots/` to /output.
4. Writes `/output/dossier.json` via `buildDossier` from `vendor/makefun-board.ts` (vendored file must ship).

Grader runs the program **twice** in a no-network sandbox (1 CPU / 1 GB / 120 s); both runs must
produce byte-identical output. No local grade exists for this competition — the server grades;
locally we can only run main.ts + the kit's `check` command (repo/transcript pre-checks).

## How it is scored (this is NOT a test-graded bounty)

Two stages:

**Stage 1 — the gate (pass/fail, sealed scorer, 7 rows).** All must pass or the entry is listed
Valid=0 and never judged: dashboard_files (index.html + ≥1 css + ≥1 js, ≤400 files, ≤4 MiB, **no
http(s) URL in any HTML attribute / CSS / JS import** — page renders fully offline), board_file,
sorted_by_value, coverage (watchlist 100%), farm_steps (3–12 steps/row, each 20–600 chars trimmed),
screenshots (3–4 images), dossier_matches (dossier.json byte-identical to a fresh buildDossier run, ≤1.5 MiB).

**Stage 2 — the AI judge (this decides the money).** Judge = "superbot" model at high reasoning
effort, reading each entry's **dossier**: the 3 screenshots + dashboard source text capped at
**65,536 bytes**. Pairwise games, each pair played in both orders; a call awards 0.5 + margin/10
(margin 1–5). Win rates come from a Bradley–Terry fit. Dev phase: each valid entry plays the 4 fixed
house dashboards + 8 games vs nearest-strength house members (+2 rounds if its interval high reaches
the money line) → provisional rate with 90% interval, cover image goes public on the Feed immediately.
Final phase (after deadline): screening line at place 40, 3 Swiss rounds, racing at prize boundaries,
playoff among top 12, top-5 held for a ≤60 min human team review. **Places: playoff entries first,
then by win-rate point estimate**; exact tie → head-to-head playoff games → smaller dossier → earlier receipt.

Judge's stated criteria, in priority order (verbatim from the sealed prompt, paraphrased tight):
1. **A working radar** — full watchlist coverage, pre-token protocols ranked by a stated implied
   value, screenshots and code agree (a screen with no data/code behind it counts for nothing).
2. **The value model** — implied value derived from the snapshot's own figures (TVL, 7-day growth,
   time running with no token), **not a hardcoded list of names**; token-live protocols separated
   from pre-token ones.
3. **Farm plans** — concrete steps **with costs and durations**, not slogans.
4. **The dashboard as a page** — sortable, filterable, readable at a glance, detail view per protocol.
5. **It looks made** — chosen palette, consistent spacing, readable type; not a pasted framework.

Text addressed to the judge inside the entry (screenshots/source) is explicitly allowed and read
as part of the entry. A dossier byte-identical to one of the 4 house dashboards plays AS that
dashboard (shares its rate, never enters the playoff) — **the starter unchanged is exactly that**
(its page is house fixed dashboard #2). Changing model + page + plans is mandatory, not optional.

## The snapshot / data (no external APIs needed — or allowed)

- Input is fully sealed: `input/snapshot.json` in the kit (248 KB) is byte-identical to what the
  grader mounts at /input. **No network in the sandbox, no API keys, no live data.** All modelling
  must be derived from the 10 fields: slug, name, category, chains, tvl_usd, change_7d, mcap_usd,
  listed_at, gecko_id, symbol.
- 342 of 758 protocols record no token; the board needs ≥100 rows ⇒ ≥60 rows must come from below
  the $50M floor (the "early radar" picks — criterion 1/2 reward exactly this).
- Starter model (lib/model.ts, "radar-1"): implied = TVL × 0.25 × growthMult(clamp(change_7d,−60,120),
  weight 0.5) × maturity(0.6 + min(age,1095d)/1095 × 0.4); board = 40 watchlist + 160 highest-TVL
  pre-token below floor = 200 rows; live-token protocols shown separately (24 in its live view).
  Verified locally 2026-11-24: runs clean on this VM (Node v24.22.1), dossier 705,011 bytes.

## Prerequisites

| Item | Status |
|---|---|
| Node.js ≥ 22.18 | ✅ VM has v24.22.1 (grader runs 22.23.4 — avoid Node-24-only APIs) |
| Repo created after 2026-11-14 open | ✅ will be (mend pipeline: gh repo create at build time) |
| OSI license at root | ✅ starter LICENSE (MIT) ships |
| `.makefun/owner.json` | Not needed if repo owner = account's GitHub login (THANKYOU-12138, same as mend); include it anyway if following the earlier fix pattern — parent decides at submit |
| README badges + About (makefun topic/homepage) | Required for GitHub entries; templates are in requirements `how_to_submit.readme_template` / `repo_about` — same drill as mend's second attempt |
| **Browser for 3 screenshots** | ⚠️ **see below — the one real gap** |

### The browser-screenshot prerequisite, precisely

What is required: **3 screenshots of OUR OWN dashboard** in `screenshots/` — (1) the board,
(2) one protocol's detail view, (3) a filtered view — committed to the repo; main.ts copies them to
/output and buildDossier embeds them in the dossier the judge reads. Hard limits per image: whole
PNG or JPEG, ≤512 KiB, long side ≤1440 px, short side ≥800 px, 3–4 images total. Guidance: keep
each ≈300–350 KB so 3 images + ≤64 KB source stay well under the 1.5 MiB dossier cap.
Starter's shots (of the starter page) are 1440×900, 137–219 KB — geometry is proven; ours must be
re-captured after we change the page (stale shots of a different page would break judge criterion 1:
"screenshots and the code agree").

Availability on this VM: **no stock browser binary** (no chromium/firefox in PATH; the bundled
`/opt/meta-chromium/chrome` refuses direct CLI launch — "Hatch WebGL domain policy is required").
Working routes, in order of preference:
1. Install a stock headless Chromium in the build phase (chrome-for-testing download or
   `npx playwright install chromium`, ~150–200 MB, network is available), screenshot with
   `--headless --window-size=1440,900 --screenshot` against `file://…/out/dashboard/index.html`
   (dashboard reads `../data.js`, so shoot the /output layout, not the repo dashboard/ alone;
   detail/filtered views are driven by URL hash in the starter's app.js — check how ours routes).
2. Fallback: parent agent renders via the user's own Chrome (Muse for Chrome on his Windows
   machine) — clunkier (files live on the VM), only if route 1 fails.

## Differentiation plan (how we beat the starter/house dashboards)

The judge compares dossiers pairwise; the starter IS house dashboard #2, so "starter + tweaks"
caps out around its known strength. Levers, by judge criterion:

1. **Model (criterion 2 — biggest lever).** Replace radar-1's single TVL multiple with a stated,
   multi-signal model built only from snapshot fields, e.g.: category-aware base multiples
   (derive peer multiples from token-live protocols in the same category: median mcap/TVL of
   live peers — computable from the snapshot itself, defensible and non-hardcoded), growth term
   from change_7d, maturity/age term from listed_at, chain-count/diversification term, and a
   size-decay so $2.7B Steakhouse doesn't mechanically top the board. Every constant stated on
   the dashboard's model panel (judge reads the source — a clear `lib/model.ts` with the formula
   in comments is itself evidence).
2. **Farm plans (criterion 3).** Starter generates generic steps in JS. Ours: per-category
   playbooks (Dexs / Lending / Perps / Restaking / Bridge-adjacent…) with concrete actions,
   explicit cost ranges and time commitments, generated in model.ts so board.json and the page
   agree. 3–12 steps, 20–600 chars each — write them tight.
3. **Page (criteria 4–5).** Keep the starter's skeleton (sort/filter/detail/hash routing all
   work) but restyle: distinct palette, better typography, denser board, visible model summary,
   watchlist vs early-radar visual separation, live-token reference section kept apart.
   Hard budget: dashboard source total ≤ ~60 KB so the dossier shows it whole (starter uses ~29.5 KB).
4. **Screenshots.** Retake all 3 at 1440×900 from the final page; pick a detail view with rich
   data; filtered view should show an actually useful filter (e.g. category or chain).
5. **Board composition.** Cover all 40 watchlist + a deliberate early set (not just "next 160 by
   TVL" — e.g. all pre-token ≥ $20M plus high-growth smaller ones), ~200–260 rows.

## Build plan (milestones)

- **M0 — setup (parent, ~15 min).** Fresh build session (post-open ✓). Create public GitHub repo
  `token-radar` under THANKYOU-12138, copy starter in (this dir is the staging copy), LICENSE in
  first commit. Decide screenshot route 1 install.
- **M1 — model v2.** Rewrite `lib/model.ts`: peer-multiple derivation, multi-signal implied value,
  category farm playbooks, board composition rule. Keep `parseSnapshot` / `boardIssue` interfaces
  so main.ts barely changes. Run locally vs kit input; sanity-check top-20 by eye with 代理人's
  trader eye (he reviews the ranking logic — his domain edge).
- **M2 — dashboard v2.** Restyle/rework `dashboard/` (authored edits, ≥2 revision rounds for the
  transcript gate), keep offline rule (zero external URLs in attributes/CSS/JS), keep source ≤60 KB.
- **M3 — screenshots.** Install headless Chromium, run main.ts → out/, capture 3 shots at
  1440×900 into `screenshots/`, re-run main.ts so dossier embeds the final shots. Verify dossier
  ≤1.5 MiB and gate-shaped (starter's boardIssue + manual checklist vs the 7 gate rows).
- **M4 — check + bundle.** `node cli/makefun.mjs check --kit . --repo <repo> --transcripts <bundle>`
  from the kit dir; bundle with the mend-proven recipe (--muse-usage rows from muse.db, --mcp,
  --provider, --effort, --redact 代理人's personal details). Fix whatever check names.
- **M5 — submit early, iterate.** First submission as soon as M4 passes (dev-phase provisional
  rate is free information: it tells us our strength vs the house ladder). Then improve and
  resubmit — 10 total, last one counts. Keep ≥2 submissions in reserve for the final week;
  target final submission by **2026-12-12**, two days before the deadline.
- **M6 — deadline watch.** Final entry locks 2026-12-14 10:00 UTC; results due 2026-12-28;
  if placed, claim needs 代理人's personal tax confirmation (same as other competitions).

## Risks / unknowns

- **Judged, not tested**: variance is real; the same entry can rate differently across heats.
  Mitigation: submit early for a dev rating, iterate against it. $1,000 is winner-take-most —
  2nd place is only $50, so this is a lottery ticket on top of the steady $10-class entries,
  not a replacement for them.
- **Copycat refusal**: an entry whose files match another account's earlier snapshot is refused —
  our authored changes must be substantial, not cosmetic (they will be: model + page + plans).
- **Determinism**: two grader runs must be byte-identical — no Date.now()/random in model or
  data.js generation; sort orders must be total (tie-break by slug).
- **Screenshot tooling** is the only missing prerequisite (see above); solve in M0/M3, don't
  leave it to deadline week.
- **Dossier byte budget**: screenshots ~300–350 KB ×3 + source ≤64 KB + board data — watch the
  1.5 MiB cap; buildDossier refuses rather than truncates images.
- API key for the make.fun account expires 2026-12-23 — after entries close (12-14) but before
  results (12-28); parent renews by re-running register with the same keypair when needed.

## Files

- Kit: `~/.makefun/work/token-radar-01-kit/` (RULES.txt = full rules; competition.yaml = sealed spec incl. judge prompt)
- Input: `~/.makefun/work/token-radar-01-kit/input/snapshot.json` (identical to grader's /input)
- This staging repo: `~/.makefun/work/tokenradar-bot/` — starter copied **unmodified** + git init
  (commit 3406b10). Nothing here was authored yet; SCOPING.md is notes, not entry code, and can be
  deleted before submission. Verified 2026-11-24: starter runs clean in a temp copy
  (200 rows, dossier 705 KB, self-check passes).
