# NOTES-6a — M0 (screenshot tooling) + M1 (model v2), 2026-11-24

For 代理人 / parent agent. Chunk 6b (dashboard restyle) should read the "For 6b" section.

## M0 verdict: screenshots work ✅

- Installed **Chrome for Testing 158.0.8127.36, chrome-headless-shell** (stock, user-space) at
  `~/.makefun/work/tools/chrome-headless-shell-linux64/chrome-headless-shell` (~185 MB with the zip
  kept beside it). No system-wide install; the VM's libnss3/libatk/libcups were already present.
- Working command (run from the repo root after `node main.ts` has produced `out/`):

  ```sh
  ~/.makefun/work/tools/chrome-headless-shell-linux64/chrome-headless-shell \
    --no-sandbox --disable-gpu --hide-scrollbars --window-size=1440,900 \
    --virtual-time-budget=5000 --screenshot=<out.png> \
    "file://$PWD/out/dashboard/index.html"
  ```

- Proof: starter dashboard shot = PNG 1440×900, **139,828 bytes (~137 KiB)**, well under the
  512 KiB cap; visually verified rendering real board data. The DBus error line on stderr is noise.
- Shoot the `out/` layout (dashboard reads `../data.js`), never `dashboard/` alone. Detail and
  filtered views are driven by the page's URL hash — 6b/M3 picks the exact hashes.

## M1: model v2 (`lib/model.ts`, version label `radar-2`, commit ef07d26)

- **Peer multiples from the snapshot itself** (`peerMultiples`): live peers = token on record,
  mcap + TVL present, not CEX; multiple = mcap/TVL winsorised at 5. Category median shrunk toward
  the global median with w = n/(n+6), clamped to [0.03, 2.5]; no-peer categories price at the
  global median. On this snapshot: 126 peers, global median ≈ 0.23 (e.g. Bridge 0.40, Risk
  Curators 0.64, Liquid Staking 0.12 — the market's own pricing, not a constant).
- **Signals**: growth (as radar-1: clamp −60..120, weight 0.5) × maturity (as radar-1) ×
  **chain breadth** (1 + 0.02 per extra chain, capped at 10) × **size discount**
  ((100M/TVL)^0.12 past $100M TVL — bulk alone no longer tops the board).
- **Board composition**: all 40 watchlist + every rankable pre-token ≥ $10M TVL (including
  above-floor non-watchlist protocols — the uniform model ranks the giant bridge wrappers at the
  top on their own figures; no name is special-cased either way) + growth picks ($5–10M TVL,
  7d change ≥ +30%, top 25 — only 2 qualified in this snapshot). **232 rows.**
- **Farm playbooks**: 19 category families (`PLAYBOOKS`), 7 steps each, concrete costs/durations;
  chain-aware (preferred-chain selection so routes are runnable — no "USDC from Bitcoin";
  gas priced per chain: Ethereum $12, Bitcoin $5, else $2); capital tiered by TVL, hold by age.
- BoardRow.model now reports peer/growth/maturity/chain/size multipliers; RadarRow (data.js)
  carries the same breakdown. `base_multiple` survives as the no-peers fallback constant (0.2).

## Local run results

- `node main.ts` runs clean; kit `check` (no transcripts): **4 passed** (competition_open,
  snapshot, license_osi, entrypoint), transcripts_present fails as expected (bundle is a later
  chunk), the rest are submission-time/GitHub checks.
- Board: **232 rows, watchlist 40/40**, ranks 1..232, implied values all distinct and
  non-increasing, every farm plan 7 steps within 20–600 chars.
- **Determinism: two full runs byte-identical** (board.json, data.js, dossier.json all `cmp`-clean).
- Sizes: board.json 464 KB, data.js 90 KB, dossier.json 705 KB (still embeds the starter
  screenshots; recapture in M3).

## For 6b (dashboard restyle) — must know

1. **app.js still speaks radar-1.** Its sandbox recompute (app.js ~line 36) uses
   `tvl × base_multiple × growth × maturity` only, its formula text (~line 290) prints the old
   formula, and the detail view shows only growth/maturity multipliers. data.js rows already
   carry `peer_multiple`, `chain_multiplier`, `size_multiplier`, and `RADAR.model` carries the
   v2 constants. Rewrite the recompute/formula/detail breakdown to radar-2 or the page will
   disagree with board.json (judge criterion 1).
2. **Farm plans disagree between page and board.json.** The starter page generates its own
   generic steps in app.js; board.json now carries the model.ts playbooks. RadarRow does NOT
   include farm_steps — either port the playbook logic to app.js or add steps to data.js
   (watch the byte budget: data.js is already 90 KB; the dossier's dashboard-source cap is
   65,536 bytes total for index.html + css + js).
3. RadarRow has no watchlist flag (only `RADAR.watchlist_size`). If the restyle wants a visual
   watchlist/early separation, model.ts needs a small addition — flag it to the parent.
4. The repo's `screenshots/` are still the starter's shots of the starter page — stale by design
   until M3 recaptures them from the restyled page with the M0 command above.
5. `out/` is generated output; it is gitignored and must not be committed.
