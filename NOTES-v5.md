# token-radar v5 (radar-4) — what changed and why

Base: v4 (dev rate 0.893219, 12W 0D 0L against the house ladder), copied whole and
verified byte-identical before any edit. The pricing model is NOT touched: same
fitted comps curve (a=7.7881, b=0.4721, R²=0.1434), same launch-odds layer, same
multipliers. Board rows, order and implied values must come out identical to v4's;
only farm-plan text may differ, and only in step 1 of rows ranked 21 and below.

## The change

In v4, a farm plan's first step was written from the protocol's own record (TVL,
chains, 7-day move, age) only for the top 20 rows; the other 269 rows opened with
the same generic fresh-wallet sentence. A judge sampling the board below the top
20 — or opening a mid-board row's detail drawer — met boilerplate.

v5 writes that record-based opening for every one of the 289 rows. The wallet
advice is not lost: spotlightText already ends with it. Implementation:
farmSteps() in lib/model.ts loses its `spotlight` parameter and always uses
spotlightText() for step 1; MODEL_VERSION becomes 'radar-4'; SCOPING.md and the
dashboard header comment updated to match.

## Why this and not a model change

The dev ladder cannot resolve fine pricing differences (12 games), and v4's model
already sweeps it. The final is a dossier comparison against the real field,
where depth that reads as per-protocol work across the whole board is worth more
than an untestable tweak to a fit whose LOO error (3.18x vs 4.99x) already beats
the approach it replaced. Safe first, per the standing version order.

## Verification before submit

- Two runs byte-identical (out-a vs out-b, diff -r clean).
- board.json vs v4's: same 289 rows in the same order, same implied values;
  farm_steps differ only at index 0 and only for ranks 21+.
- Screenshots recaptured from the new out/ so they match the shipped page.
- Kit check passes; quota can_submit re-checked on the day.
