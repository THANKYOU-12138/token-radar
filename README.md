# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/THANKYOU-12138/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/THANKYOU-12138/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar over a sealed DefiLlama snapshot: 232 pre-token protocols, each priced from its own category's live peers (median market-cap/TVL multiple, winsorised and shrunk toward the global median), adjusted for growth, maturity, chain breadth and size — never hardcoded. Every row carries a concrete farm plan of seven steps with costs and durations, and the full $50M+ TVL pre-token watchlist is covered. The dashboard is a dark, fully offline radar console: sortable, searchable, filterable, with a per-protocol factor breakdown that agrees with the board to the last digit.

## Run it

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json>
```

In the grader's container the snapshot is /input/snapshot.json and the output goes to /output: board.json, the dashboard, the screenshots and dossier.json — byte-identical across runs.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
