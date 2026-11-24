# NOTES-v2 — radar-3 (the entry's second version, built 2026-11-24 evening)

Built by the parent session in this side chat after 代理人 approved in chat (22:36 CST),
following the plan in EVAL-v2-analysis.md. Directory: tokenradar-bot-v2/ (copy of the v1
bot dir; v1 untouched). NOT yet committed, pushed or submitted — 代理人 decides.

## What changed (model label radar-2 -> radar-3)
1. Launch-odds layer: empirical token rates by category x age cohort (buckets <1y, 1-2y,
   2-3y, 3y+) from the snapshot's 532 dated protocols; shrinkage cell -> bucket (k=10) ->
   global (k=20). Board value = expected launch value = curve implied x odds.
2. Fitted comps curve replacing category medians: least-squares ln(mcap) = a + b ln(TVL)
   on 119 live peers, per-category intercept shifts (median residual, n>=5, shrunk n/(n+10)).
   Fit on this snapshot: a=7.7881, b=0.4721, R2=0.1434.
3. Runtime self-validation, printed on the model panel: leave-one-out median pricing
   error curve 3.18x vs category-median method 4.99x; launch-odds time-split Brier
   0.2879 vs base rate 0.3259 (holdout n=266). All pure functions of the snapshot.
4. Full coverage: board ranks all 289 rankable pre-token protocols (was 232 with the
   $10M floor + growth picks). Whole-snapshot accounting on the page:
   289 ranked + 416 live + 53 excluded = 758 — matches radar-6's published accounting.
5. Kept from v1: dark radar-console page, board-verbatim farm steps, factor breakdown
   in the detail drawer (now: curve multiple + launch odds rows), 3 screenshots
   recaptured from the new page (detail shot now #p=lofty, top watchlist row, rank 9).

## Verification
- Two full runs byte-identical (board.json, data.js, dossier.json).
- Dashboard source 31,635 B of the 65,536 cap; screenshots 187-217 KB each (< 512 KiB).
- Detail arithmetic spot-checked: factors multiply to the printed implied value.
- Kit check (level-38 kit, --worktree, no transcripts): 4 passed, 1 failed
  (transcripts_present — expected pre-bundle), 15 skipped, 5 at submission.
  Same profile as v1. NOTE: site kit is at level 42 — re-download the kit before
  bundling/submitting the v2 entry.

## Local evidence vs the field's published numbers
- Our curve LOO 3.18x (wiliamkesh published 3.49x for his fit; medians 4.54x there,
  4.99x here — peer sets differ slightly, treat as same-class, not a direct race).
- Our odds Brier 0.288 vs 0.326 base (radar-6 published 0.285 vs 0.326 — a wash).
- Coverage accounting identical to radar-6's. v2 is in the leader's class on every
  metric the field has published; the title now turns on judge taste, the dossier
  read and the human top-5 review.
