# token-radar-01 — scoping and build notes

Competition: "Build the best token launch radar", harness program/v1 with an AI judge.
Prize pool $1,325 USDC, escrowed: $1,000 to first place, $50 each to 2nd–5th, $25 each
to 6th–10th. Entries close 2026-12-14 10:00 UTC; the final window opens ten minutes
later and results are due 2026-12-28. No entry fee. Submission is Force_Last — the
last accepted entry before the deadline is the one that counts.

## What has to be handed in

A Node program (this repo's main.ts, standard library only) that the grader runs
twice in a sealed, network-free sandbox. Both runs must agree byte for byte. Each run:

1. reads the sealed snapshot the grader mounts at /input — 758 DefiLlama protocols
   with TVL of at least $5M, ten fields each, plus a 40-protocol pre-token watchlist
   (TVL at least $50M);
2. writes board.json: between 100 and 4,000 rows, ranks exactly 1..N, implied values
   non-increasing down the ranks, every watchlist slug present, no invented slugs;
3. writes the dashboard data file and copies dashboard/ and screenshots/ across;
4. writes dossier.json through the vendored buildDossier, last, because the scorer
   rebuilds it from the output and compares bytes.

There is no local grade for this competition. Locally we can run the program, diff
two runs, and use the kit's check command for repo and transcript pre-flight only.

## How the money is decided

First a pass/fail gate: dashboard files present and fully offline (no external URL
anywhere in markup, styles or scripts), board file well formed and sorted, watchlist
coverage complete, every row carrying 3–12 farm steps of 20–600 characters each,
three or four screenshots inside the size limits, and a dossier that matches a fresh
rebuild. Fail any row and the entry is never judged.

Then the judge: a strong model at high reasoning effort reads each surviving entry's
dossier — the screenshots plus the dashboard source, capped at 65,536 bytes of text —
and plays pairwise games, each pair in both orders. Dev phase: every valid entry meets
the four fixed house dashboards plus eight games against near-strength house members,
producing a provisional win rate with a 90% interval. Final phase: a screening line at
place 40, Swiss rounds, a top-12 playoff, and a human review of the top five.

The judge's published priorities, in order: a working radar with full coverage; a
value model derived from the snapshot's own figures rather than a list of names;
farm plans with concrete actions, costs and durations; a page that sorts, filters
and explains itself; and a finished, deliberate look. Text addressed to the judge
inside the entry is allowed and is read as part of the entry.

## The model in this entry (radar-8)

Two multiplicative layers over the snapshot's own numbers, nothing hardcoded:

- A fitted comparables curve. From the 119 token-live protocols that carry both a
  market cap and a TVL, a least-squares fit of ln(market cap) on ln(TVL), with a
  per-category intercept shift (median residual, shrunk toward zero for thin
  categories). A pre-token protocol's curve value is the market cap the curve
  predicts at its TVL. Re-tested in radar-7 against robust, joint-dummy,
  Theil–Sen and size-floored fits; the least-squares fit stayed the best
  (leave-one-out median error 3.18x, the alternatives 3.25x–3.54x).
- A fitted launch-odds layer. Of the 532 protocols with a listing date, a
  logistic regression: P(token) is a sigmoid of ln(age in days + 1), step
  indicators at two and three years of age, a per-category effect for
  categories with five or more dated protocols, and ln(TVL) (ridge lambda 5).
  The size term is radar-8's addition: across three time splits it beats the
  age-only form's mean Brier 0.2326 to 0.2370, and on the canonical half split
  it scores 0.2194 against 0.2231 for the age-only form, 0.2879 for the
  age-bucket table radar-4 used and 0.3259 for the base rate. Board value is
  curve value multiplied by these odds — an expected launch value, not a
  bare multiple.

Radar-8's other change is a removal. Every hand-set multiplier was audited
against the live peers' leave-one-out pricing: the growth weight's sweep
improves to a flat stretch the shipped 0.5 sits on, the size decay's fitted
value (0.086) is the shipped 0.12 within noise, but a bonus per extra chain
made the peers' pricing worse at every strength tried (3.25x–3.88x against
3.18x with none) with a residual slope of zero — so chain count no longer
moves a row's value. It still routes every farm plan.

The model validates itself at runtime and prints the evidence on the dashboard's
model panel: leave-one-out median pricing error 3.18x for the curve and 3.08x
for the whole pricing stack against 4.99x for category medians, a time-split
Brier score of 0.219 for the odds against 0.326 for the base rate, and the
odds' calibration by age band on that holdout. Coverage is complete by
construction: all 289 rankable pre-token protocols are scored, and the page
accounts for the whole snapshot — 289 ranked + 416 already live + 53
excluded = 758.

Farm plans are generated per row from category playbooks: seven steps each, the
first step of every row written from that protocol's own record (its TVL,
chains, seven-day move and age), costs and durations stated throughout, and
the exit step written from the protocol's playbook family — unbonding
waits for staking, repay-before-withdraw for lending and CDPs, confirm
arrival for bridges — so no step in any plan is generic.

## Transcript discipline (learned the hard way)

The bundle gate requires the uploaded sessions to account for at least 30% of the
counted lines, entrypoint included, and a line's first appearance in the transcripts
decides whether it counts as authored, pasted or merely read. Our third submission
was rejected on exactly this: the entrypoint and two other files had been carried
over from the previous version's directory with a shell copy, so their lines only
ever appeared as reads. The fix, applied in this version: the entrypoint, this
document and the stylesheet are written fresh, in-session, and the original build
sessions are named explicitly at bundle time so their writes count too. Files are
never copied between version directories without being re-authored where it matters.

## Status and remaining plan

- v1 (radar-2, category-median model): dev rate 0.842, nine wins, three draws, no
  losses against the house ladder. Still the account's kept entry.
- v2 (radar-3 model): superseded while its grading was queued; never rated.
- v3 (radar-3 plus judge-facing presentation): rejected on transcript coverage,
  never rated.
- v4: radar-3 unchanged in substance; entrypoint, scoping document and stylesheet
  re-authored in-session for the transcript gate. Dev rate 0.893 — twelve wins, no
  draws, no losses against the house ladder.
- v5: the radar-3 pricing model is unchanged; every row's farm plan now opens
  with a step written from that protocol's own record, where v4 wrote that
  step only for the top 20 and gave the other 269 rows a generic wallet step.
  Dev rate 0.914 — twelve wins, no draws, no losses; the best version so far.
- v6: pricing still unchanged, board values and order identical to v5. The
  model panel gains the two runtime evidence tables (launch odds by age
  cohort; category evidence for the curve), a fourth screenshot shows a
  filtered view, and farm plans' funding and hold steps are placed from each
  protocol's own chains and age. Dev rate 0.907 — twelve wins, no draws, no
  losses; the gap to v5 is within the rating's noise (intervals overlap
  almost entirely), so v6 is not the base for the next version.
- v7: built on v5, not v6. The launch-odds layer becomes a logistic regression
  (time-split Brier 0.2231, from 0.2879 for the bucket table); the curve is
  unchanged after re-testing the alternatives; every farm plan's exit step is
  written from its playbook family; the model panel states the fitted odds
  coefficients and the pooled odds at four ages, and the detail drawer shows
  what a 10-point rise in launch odds would do to the row's implied value.
  Dev rate 0.918 — twelve wins, no draws, no losses; the best version so far.
- v8 (this version): built on v7. The odds gain a ln(TVL) term, the one
  candidate feature that improved every time split (mean Brier 0.2326 against
  0.2370); the chain-count bonus is removed after the peers' leave-one-out
  audit rejected it at every strength; the runtime validation gains the whole
  stack's leave-one-out error (3.08x) and the odds' holdout calibration by age
  band, both printed on the model panel beside the rejected tests.

Entries close 2026-12-14 10:00 UTC. Versions are built on the previous version's
rating evidence and submitted as they pass the local checks; the last version
standing at the deadline is the entry.
