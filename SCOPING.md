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

## The model in this entry (radar-5)

Two multiplicative layers over the snapshot's own numbers, nothing hardcoded:

- A fitted comparables curve. From the 119 token-live protocols that carry both a
  market cap and a TVL, a least-squares fit of ln(market cap) on ln(TVL), with a
  per-category intercept shift (median residual, shrunk toward zero for thin
  categories). A pre-token protocol's curve value is the market cap the curve
  predicts at its TVL.
- An empirical launch-odds layer. Of the 532 protocols with a listing date, the
  share that actually has a token, tabulated by category and age cohort and shrunk
  toward the global rate of 0.4925. Board value is curve value multiplied by these
  odds — an expected launch value, not a bare multiple.

The model validates itself at runtime and prints the evidence on the dashboard's
model panel: leave-one-out median pricing error 3.18x for the curve against 4.99x
for category medians, and a time-split Brier score of 0.288 for the odds against
0.326 for the base rate. Coverage is complete by construction: all 289 rankable
pre-token protocols are scored, and the page accounts for the whole snapshot —
289 ranked + 416 already live + 53 excluded = 758.

Farm plans are generated per row from category playbooks: seven steps each, the
first step of every row written from that protocol's own record (its TVL,
chains, seven-day move and age), costs and durations stated throughout. The
funding step also reads the record — it names the protocol's second chain as
the alternate route when it has one, and says plainly when the protocol runs
on one chain alone — and the hold step quotes the protocol's own age, because
the hold window is sized from that age.

The model panel prints the evidence under the two fitted layers, all computed
at runtime from the snapshot: the launch-odds table (dated protocols and the
shrunk token rate for each of the four age cohorts) and the category evidence
table (each category's live peers, their median multiple, the intercept shift
the curve grants it, and how many board rows it prices). Four screenshots are
handed in: the board, a detail drawer, the model view, and a filtered view —
the page's filters are deep-linkable in the URL hash, so the filtered shot is
the page exactly as a reader following that link sees it.

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
- v6 (this version): pricing still unchanged, board values and order identical
  to v5. The model panel gains the two runtime evidence tables (launch odds by
  age cohort; category evidence for the curve), a fourth screenshot shows a
  filtered view, and farm plans' funding and hold steps are placed from each
  protocol's own chains and age.

Entries close 2026-12-14 10:00 UTC. Versions are built on the previous version's
rating evidence and submitted as they pass the local checks; the last version
standing at the deadline is the entry.
