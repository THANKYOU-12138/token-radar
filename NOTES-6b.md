# NOTES-6b — M2 (dashboard v2) + M3 (screenshots), 2026-11-24

For 代理人 / parent agent. Chunk 6c (bundle/submit) should read the last section.

## The one design decision: the page derives nothing

The starter page recomputed values and invented its own farm steps in app.js; radar-2's
playbooks live in lib/model.ts, so the two could drift. Fixed by carrying the board's own data
into the page instead of re-deriving it:

- `lib/model.ts` (commit ba5d1e6): RadarRow now carries `farm_steps` (the exact strings
  board.json carries) and a `watchlist` flag. BoardRow/board.json are untouched, so the gate's
  board rows are unaffected. Verified: data.js rows match board.json on slug, implied value and
  farm steps for all 232 rows, 0 mismatches; 40 rows flagged watchlist.
- `dashboard/app.js` (commit 947cace): the radar-1 recompute and the generic farm generator are
  deleted. The detail drawer renders row.farm_steps verbatim and shows the board's own factor
  breakdown. data.js grows to 444 KB (it is not part of the dossier; no cap applies).

## M2 — what the page is now

- **Theme**: dark radar console — near-black canvas, one amber signal colour, hairline grids,
  sharp corners, monospace numerals, uppercase micro-labels, a radar-ring brand mark. Nothing
  like the starter's light sage theme (house dashboard #2).
- **Board**: sortable by rank/name/TVL/7d/age/peer/implied; search; category filter; new Scope
  filter (whole board / watchlist only / early radar only); Pre-token vs Live token tabs. Every
  row carries a WATCHLIST (solid amber) or EARLY (outline) chip; a Peer x column was added.
- **Detail view** (hash #p=<slug>): full radar-2 breakdown — TVL, peer multiple (named as the
  category's live-peer mcap/TVL median), growth, maturity, chain and size multipliers, implied
  total — plus the board's farm plan with costs and durations. Honest rounding note instead of
  a fake exact recompute: the published factors are rounded to 4 dp, so their product lands
  within 0.1% of the board's figure (measured max error 0.051% over 232 rows).
- **Model panel**: the radar-2 formula stated in full from DATA.model's own constants — peer
  derivation (winsorise, shrinkage k, clamp), growth, maturity, chain step, size decay — and the
  board's composition rule (watchlist + rankable ≥ $10M + growers $5–10M at ≥ +30%, top 25).

## Sizes and gate checks

- Dashboard source (index.html + app.css + app.js): **30,486 bytes** of the 65,536 judge cap —
  the judge reads it whole. Offline purity verified: no http(s) anywhere in dashboard/.
- Kit `check` (no transcripts): **4 passed** (competition_open, snapshot, license_osi,
  entrypoint), 1 failed = transcripts_present (expected; bundle is 6c), 15 transcript rows
  skipped, 5 rows deferred to submission (GitHub-side).
- The server-side gate rows were verified by hand: boardIssue passes inside main.ts (it exits
  non-zero otherwise); farm plans are 7 steps/row within 20–600 chars; dossier.json is
  **808,265 bytes** (cap 1.5 MiB); two full runs are byte-identical (board.json, data.js,
  dossier.json all cmp-clean).

## M3 — screenshots (commit 76c2fb2), shot from out/ with the 6a Chrome command

| File | View | Size |
|---|---|---|
| screenshots/1-board.png | Board, top of the ranking | 182,871 B |
| screenshots/2-detail.png | Steakhouse Financial detail (rank 3, top watchlist row, 11 chains) | 224,475 B |
| screenshots/3-filtered.png | Category filter = Lending (12 rows) | 174,983 B |

All 1440×900 PNG, each well under the 512 KiB cap; all three visually inspected — board shows
chips and peer multiples, the drawer shows the full factor table and the first farm steps with
costs, the filtered view shows the Lending selection with global ranks preserved.

## For 6c — must know

1. Bundle/submit is all that remains: repo is still local-only; the check's
   repo_created_after_open row mentions the kit `init` drand-anchor flow for source bundles —
   decide how to publish (the mend drill created the GitHub repo at submit time).
2. Everything the gate reads is committed at HEAD (76c2fb2 + this notes commit): model,
   dashboard, screenshots. `out/` is generated and gitignored — never commit it.
3. If the page changes again, recapture all three screenshots and re-run main.ts before
   bundling: dossier_matches compares against a fresh build from the committed files, and
   stale shots would also break judge criterion 1.
4. Detail/filtered hashes if re-shooting: `#p=steakhouse-financial`, `#category=Lending`.
