// The token radar's model (radar-2): one snapshot of the protocol universe in, one ranked board out.
//
// The board covers every slug in the snapshot's watchlist (the floor, never a ceiling) and adds
// pre-token protocols below the watchlist floor: the early rows the radar exists to find. A protocol is
// pre-token when its index entry records no token (no market cap, no CoinGecko id, no symbol); the
// snapshot's live-token protocols are kept apart — they are the peer set the model prices from, and
// are shown as the market's own values, never mixed into the ranked board.
//
// Implied value follows only from the snapshot's own figures. Nothing is priced off a name:
//
//   peers      = the snapshot's live-token protocols (market cap and TVL both recorded, not a CEX),
//                each with multiple = mcap_usd / tvl_usd, winsorised at PEER_WINSOR_HI
//   globalMult = the median peer multiple across the whole snapshot (fallback: BASE_MULTIPLE)
//   peerMult   = a category's own median peer multiple, shrunk toward globalMult by the number of
//                live peers behind it: w = n / (n + PEER_SHRINK_K); peerMult = w x catMedian +
//                (1 - w) x globalMult, clamped to [PEER_FLOOR, PEER_CAP]. A category with no live
//                peers is priced at globalMult.
//   growth     = clamp(change_7d, -60, 120) per cent;  growthMult = 1 + (growth / 100) x GROWTH_WEIGHT
//   maturity   = 0.6 + min(age_days, 1095) / 1095 x 0.4   (age_days unknown: 365)
//   chains     = 1 + CHAIN_STEP x min(chains - 1, CHAIN_MAX_STEPS): breadth across chains is demand
//                the token would inherit, paid for at two points a chain, capped at ten chains
//   size       = 1 while tvl <= SIZE_ANCHOR_USD, else (SIZE_ANCHOR_USD / tvl) ^ SIZE_DECAY: past
//                $100M of TVL each further dollar is harder to re-rate, so size earns a discount,
//                never a bonus — the biggest book does not top the board on bulk alone
//   implied    = max(1, round(tvl x peerMult x growthMult x maturity x chains x size))
//
// The constants are stated in the dashboard and changeable in the model sandbox. No protocol name is
// ever special-cased: the same function scores every row.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them and the sandbox may change them. */
export interface ModelConstants {
  /** The multiple used only when the snapshot records no live peer at all to derive one from. */
  base_multiple: number;
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  /** Live peers needed before a category's own median is trusted halfway (shrinkage constant). */
  peer_shrink_k: number;
  /** A category peer multiple is never priced below this, however cheap its live peers trade. */
  peer_floor: number;
  /** Nor above this, however rich its live peers trade. */
  peer_cap: number;
  /** One peer's mcap/TVL above this is treated as an outlier and read as this. */
  peer_winsor_hi: number;
  /** The implied-value bonus per extra chain a protocol runs on. */
  chain_step: number;
  /** Extra chains past this many earn no further bonus. */
  chain_max_steps: number;
  /** TVL up to this size earns no size discount. */
  size_anchor_usd: number;
  /** How fast the size discount bites past the anchor (a power, not a rate). */
  size_decay: number;
}

export const MODEL: ModelConstants = {
  base_multiple: 0.2,
  growth_weight: 0.5,
  growth_floor: -60,
  growth_cap: 120,
  maturity_floor: 0.6,
  maturity_range: 0.4,
  maturity_days: 1095,
  unknown_age_days: 365,
  peer_shrink_k: 6,
  peer_floor: 0.03,
  peer_cap: 2.5,
  peer_winsor_hi: 5,
  chain_step: 0.02,
  chain_max_steps: 10,
  size_anchor_usd: 100_000_000,
  size_decay: 0.12,
};

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-2';

/** The early radar carries every rankable pre-token protocol at or above this TVL, floor be damned. */
export const EARLY_TVL_FLOOR_USD = 10_000_000;

/** Below the early floor, this many fast growers still make the board: the smallest, earliest rows. */
export const GROWTH_PICKS = 25;

/** A below-floor protocol counts as a fast grower at or above this 7-day change, per cent. */
export const GROWTH_PICK_MIN_PCT = 30;

/** The smallest TVL a growth pick may carry: below it there is nothing to re-rate yet. */
export const GROWTH_PICK_TVL_USD = 5_000_000;

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  model: {
    /** The category peer multiple this row was priced with (named base_multiple in radar-1). */
    base_multiple: number;
    peer_multiple: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    chain_multiplier: number;
    size_multiplier: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row: the board's own figures and farm plan, carried verbatim. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  peer_multiple: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  chain_multiplier: number;
  size_multiplier: number;
  /** True when the snapshot's watchlist carries this slug; false for an early-radar row. */
  watchlist: boolean;
  /** The board's farm plan for this protocol, the same strings board.json carries. */
  farm_steps: string[];
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** Everything the dashboard needs: the board, the live set, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** The median of a non-empty list of numbers, or null for an empty one. */
function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** The peer multiples the snapshot's own live-token protocols imply: one global, one per category. */
export interface PeerMultiples {
  /** The median mcap/TVL of every live peer in the snapshot (or the fallback constant). */
  global: number;
  /** How many live peers stand behind the global median. */
  peers: number;
  /** The shrunk, clamped multiple for one category; the global when the category has no peers. */
  forCategory: (category: string | null) => number;
}

/**
 * Derive peer multiples from the snapshot itself: a live peer is a protocol with a token on record
 * (not pre-token), a market cap and a TVL, and not a centralised exchange — an exchange's token is
 * not a price for a protocol's book. Each category's median is shrunk toward the global median by
 * how many peers stand behind it, so a category priced off one rich peer borrows the market's
 * judgement instead of inheriting an accident.
 */
export function peerMultiples(snapshot: Snapshot, model: ModelConstants = MODEL): PeerMultiples {
  const winsor = (p: SnapshotProtocol): number => Math.min(p.mcap_usd! / p.tvl_usd, model.peer_winsor_hi);
  const peers = snapshot.protocols.filter(
    (p) => !isPreToken(p) && p.category !== 'CEX' && p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0,
  );
  const global = median(peers.map(winsor)) ?? model.base_multiple;
  const byCategory = new Map<string, number[]>();
  for (const p of peers) {
    if (p.category === null) continue;
    const list = byCategory.get(p.category) ?? [];
    list.push(winsor(p));
    byCategory.set(p.category, list);
  }
  const cache = new Map<string | null, number>();
  const forCategory = (category: string | null): number => {
    const hit = cache.get(category);
    if (hit !== undefined) return hit;
    const list = category === null ? undefined : byCategory.get(category);
    const catMedian = list === undefined ? null : median(list);
    let mult = global;
    if (catMedian !== null && list !== undefined) {
      const w = list.length / (list.length + model.peer_shrink_k);
      mult = w * catMedian + (1 - w) * global;
    }
    mult = Math.min(model.peer_cap, Math.max(model.peer_floor, mult));
    cache.set(category, mult);
    return mult;
  };
  return { global, peers: peers.length, forCategory };
}

/** Every multiplier and the implied value one protocol gets under `model`, priced off `peerMult`. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  model: ModelConstants,
  peerMult: number,
): { implied: number; growthPct: number; growthMult: number; maturityMult: number; chainMult: number; sizeMult: number; age: number | null } {
  const age = ageDays(asOf, protocol.listed_at);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult = model.maturity_floor + (Math.min(Math.max(ageForModel, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
  const chainMult = 1 + model.chain_step * Math.min(Math.max(protocol.chains.length - 1, 0), model.chain_max_steps);
  const sizeMult = protocol.tvl_usd <= model.size_anchor_usd ? 1 : Math.pow(model.size_anchor_usd / protocol.tvl_usd, model.size_decay);
  const implied = Math.max(1, Math.round(protocol.tvl_usd * peerMult * growthMult * maturityMult * chainMult * sizeMult));
  return { implied, growthPct, growthMult, maturityMult, chainMult, sizeMult, age };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Whether a protocol is one the board may rank: pre-token, not an exchange, not a versioned pool. */
export function isRankable(p: SnapshotProtocol): boolean {
  return isPreToken(p) && p.category !== 'CEX' && !VERSIONED.test(p.name);
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The headline sentence's figures: how many watchlist slugs, how many rows, how many live protocols. */
export interface BoardSummary {
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug, even one the snapshot no longer carries (it cannot, but the
  // board's coverage is the gate's row and is never gambled on a missing record).
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar, in two sweeps. First every rankable pre-token protocol at or above the early
  // TVL floor, wherever it sits against the watchlist floor: a $30M book with no token is a launch
  // candidate whether or not the watchlist's curators listed it. Then the growth picks: smaller
  // books whose TVL is compounding fastest, the rows a radar exists to catch before they are big.
  // Never a replacement for a watchlist row: a chosen protocol stays chosen.
  const byTvl = (a: SnapshotProtocol, b: SnapshotProtocol): number =>
    b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0);
  const early = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && isRankable(p) && p.tvl_usd >= EARLY_TVL_FLOOR_USD)
    .sort(byTvl);
  for (const p of early) chosen.set(p.slug, p);
  const growers = snapshot.protocols
    .filter(
      (p) =>
        !chosen.has(p.slug) &&
        isRankable(p) &&
        p.tvl_usd >= GROWTH_PICK_TVL_USD &&
        p.tvl_usd < EARLY_TVL_FLOOR_USD &&
        finite(p.change_7d, 0) >= GROWTH_PICK_MIN_PCT,
    )
    .sort((a, b) => finite(b.change_7d, 0) - finite(a.change_7d, 0) || byTvl(a, b))
    .slice(0, GROWTH_PICKS);
  for (const p of growers) chosen.set(p.slug, p);

  const peers = peerMultiples(snapshot, model);
  const scored = [...chosen.values()].map((p) => {
    const peerMult = peers.forCategory(p.category);
    const v = impliedValue(p, snapshot.as_of, model, peerMult);
    return { p, peerMult, ...v };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    age_days: s.age,
    implied_value_usd: s.implied,
    model: {
      base_multiple: round4(s.peerMult),
      peer_multiple: round4(s.peerMult),
      growth_pct: s.growthPct,
      growth_multiplier: round4(s.growthMult),
      maturity_multiplier: round4(s.maturityMult),
      chain_multiplier: round4(s.chainMult),
      size_multiplier: round4(s.sizeMult),
      age_days: s.age,
    },
    farm_steps: farmSteps(s.p, s.age).map(stepText),
  }));
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/**
 * The chains a plan should name, best first: the chains where a stablecoin position and cheap gas
 * are normal come first, the protocol's own order breaks the rest. A bridge whose book is wrapped
 * Bitcoin still gets a route a farmer can actually run, not "USDC from Bitcoin".
 */
const CHAIN_PREFERENCE = [
  'Ethereum', 'Base', 'Arbitrum', 'Solana', 'Optimism', 'Polygon', 'Avalanche', 'Binance',
  'Linea', 'zkSync Era', 'Sui', 'Tron', 'Hyperliquid L1', 'Monad', 'Sonic', 'World Chain',
  'Stellar', 'Mantle', 'Scroll', 'Blast', 'Mode', 'BOB', 'Astar', 'Pharos', 'HashKey Chain',
  '0G', 'Ronin', 'Bittensor EVM', 'Shibarium',
];

function preferredChains(p: SnapshotProtocol): string[] {
  const preferred = CHAIN_PREFERENCE.filter((c) => p.chains.includes(c));
  const rest = p.chains.filter((c) => !preferred.includes(c));
  return [...preferred, ...rest];
}

/** The chain a plan farms on: the most usable chain the protocol serves, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return preferredChains(p)[0] ?? 'its main chain';
}

/** The other end of a bridge route, or null when the protocol serves a single usable chain. */
function secondChainOf(p: SnapshotProtocol): string | null {
  return preferredChains(p)[1] ?? null;
}

/** What one transaction's gas honestly costs on a chain: Ethereum is dear, Bitcoin middling. */
function gasFor(chain: string): number {
  if (chain === 'Ethereum') return 12;
  if (chain === 'Bitcoin') return 5;
  return 2;
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The playbook family a category farms by: the DefiLlama label, read for the action it implies. */
type FarmFamily =
  | 'dex' | 'lending' | 'cdp' | 'staking' | 'restaking' | 'bridge' | 'derivatives'
  | 'curator' | 'yield' | 'basis' | 'rwa' | 'chain' | 'launchpad' | 'prediction'
  | 'insurance' | 'payments' | 'privacy' | 'governance' | 'generic';

function familyFor(category: string | null): FarmFamily {
  const c = (category ?? '').toLowerCase();
  if (c.includes('bridge')) return 'bridge';
  if (c.includes('liquid restaking') || c.includes('restaked') || c === 'restaking') return 'restaking';
  if (c.includes('liquid staking') || c.includes('staking pool')) return 'staking';
  if (c.includes('cdp') || c.includes('stablecoin') || c.includes('algo-stables')) return 'cdp';
  if (c.includes('lend') || c.includes('collateral markets')) return 'lending';
  if (c.includes('dex') || c.includes('liquidity')) return 'dex';
  if (c.includes('derivative') || c.includes('options') || c.includes('synthetic') || c.includes('perpetual')) return 'derivatives';
  if (c.includes('curator') || c.includes('allocator') || c.includes('collateral management') || c.includes('indexes')) return 'curator';
  if (c.includes('basis')) return 'basis';
  if (c.includes('yield') || c.includes('farm')) return 'yield';
  if (c.includes('rwa')) return 'rwa';
  if (c === 'chain') return 'chain';
  if (c.includes('launchpad')) return 'launchpad';
  if (c.includes('prediction')) return 'prediction';
  if (c.includes('insurance')) return 'insurance';
  if (c.includes('payment') || c.includes('card')) return 'payments';
  if (c.includes('privacy')) return 'privacy';
  if (c.includes('governance')) return 'governance';
  return 'generic';
}

/** The numbers a plan quotes: the position's size, and what gas costs on the protocol's first chain. */
interface PlanContext {
  name: string;
  chain: string;
  secondChain: string | null;
  capital: number;
  gas: number;
  hold: number;
}

/** One family's two signature actions and its weekly qualifying action, in a farmer's words. */
const PLAYBOOKS: Record<FarmFamily, { core: (x: PlanContext) => string; second: (x: PlanContext) => string; weekly: string }> = {
  dex: {
    core: (x) => `Provide $${x.capital} of liquidity to ${x.name}'s deepest pool on ${x.chain} — a stable or blue-chip pair, in range if the pool is concentrated — and keep the LP position open.`,
    second: (x) => `Route your own swaps through ${x.name} rather than an aggregator, so the wallet shows both sides of the venue: liquidity and volume.`,
    weekly: 'one swap of $25 or more through the venue',
  },
  lending: {
    core: (x) => `Supply $${x.capital} of USDC to ${x.name} on ${x.chain} in its main market and leave the supply position untouched.`,
    second: (x) => `Borrow no more than 40% against the supply, re-supply the borrowed asset once, then repay — one clean loop that registers as a real borrower, not leverage.`,
    weekly: 'one supply top-up or partial repay of $10 or more',
  },
  cdp: {
    core: (x) => `Deposit $${x.capital} of collateral into ${x.name} on ${x.chain} and mint its stablecoin at under half the maximum the vault allows, so the position survives a bad week.`,
    second: (x) => `Put the minted stablecoin to work in ${x.name}'s own stability pool or its main liquidity pool instead of selling it, and hold both sides.`,
    weekly: 'one mint, repay or pool deposit of $10 or more',
  },
  staking: {
    core: (x) => `Stake $${x.capital} of ${x.chain}'s staking asset through ${x.name} and keep the liquid receipt token in the same wallet.`,
    second: (x) => `Use the receipt token once — supply it to a lending market or pair it in a pool the protocol itself lists — without leverage, so the stake counts twice and risks once.`,
    weekly: 'one small top-up stake of $10 or more',
  },
  restaking: {
    core: (x) => `Deposit $${x.capital} of a supported staking or BTC asset into ${x.name} on ${x.chain} and keep the restaking receipt in the wallet.`,
    second: (x) => `If ${x.name} lets depositors pick operators or services, make one deliberate selection and leave it; if not, hold the receipt untouched — restaking points pay for duration, not clicks.`,
    weekly: 'one balance check only; add $10 or more once a month',
  },
  bridge: {
    core: (x) =>
      x.secondChain !== null
        ? `Bridge $${x.capital} of funds from ${x.chain} to ${x.secondChain} through ${x.name} — a route it lists itself — then put the bridged funds into one app on the far side the same day.`
        : `Bridge $${x.capital} of funds onto ${x.chain} through ${x.name} and put them to work in one app there the same day; a bridge position that never lands anywhere earns nothing.`,
    second: (x) => `Bridge a second, smaller amount back on a different day, so the wallet has real two-way route history rather than a single hop.`,
    weekly: 'one bridge transfer of $25 or more, alternating directions',
  },
  derivatives: {
    core: (x) => `Deposit $${x.capital} of USDC as margin on ${x.name} and open one small hedged trade — long the asset spot, short the same size on the perp — so the account is active without betting on direction.`,
    second: (x) => `Keep the hedge on and adjust it when it drifts: add margin before you add size, and never let the position sit one bad candle from liquidation.`,
    weekly: 'one hedge adjustment or new small trade',
  },
  curator: {
    core: (x) => `Deposit $${x.capital} of USDC into a ${x.name} vault on ${x.chain} — the vault with the deepest book, not the highest advertised yield — and keep the shares.`,
    second: (x) => `Split a second $${Math.max(25, Math.floor(x.capital / 2))} across another ${x.name} vault with a different risk profile, so the wallet follows the curator, not one pool.`,
    weekly: 'one deposit or rebalance of $10 or more',
  },
  yield: {
    core: (x) => `Deposit $${x.capital} of USDC into ${x.name}'s main vault on ${x.chain} and keep the vault shares in the wallet.`,
    second: (x) => `Compound whatever the vault pays back into the same position instead of withdrawing it — a growing balance reads as conviction, not tourism.`,
    weekly: 'one compound or top-up of $10 or more',
  },
  basis: {
    core: (x) => `Deposit $${x.capital} of USDC into ${x.name}'s basis strategy on ${x.chain} and hold the position token it issues.`,
    second: (x) => `Leave the position untouched through at least one full funding cycle; basis strategies reward the wallets still there when the cycle closes.`,
    weekly: 'one balance check only; add $10 or more once a month',
  },
  rwa: {
    core: (x) => `Complete ${x.name}'s onboarding or KYC if it asks, then mint $${x.capital} of its yield asset on ${x.chain} and hold it in the wallet.`,
    second: (x) => `Read the redemption terms before you need them — notice periods and minimums — and diarise the first date the position can actually be exited.`,
    weekly: 'no weekly action; check the position and its reports once a month',
  },
  chain: {
    core: (x) => `Bridge $${x.capital} of funds onto ${x.name} itself and make the wallet a resident: first transactions, a native swap and a small lend in its own apps.`,
    second: (x) => `Use two of ${x.name}'s native protocols — a DEX and a lending market — so the chain sees a user, not a pass-through.`,
    weekly: 'two or three ordinary transactions on the chain',
  },
  launchpad: {
    core: (x) => `Register the wallet with ${x.name}, complete whatever eligibility it publishes, and commit up to $${x.capital} to one launch you would hold anyway.`,
    second: (x) => `Follow the launch's own allocation and claim rules to the letter, and claim only from the page ${x.name} itself links.`,
    weekly: 'check for new launches once a week; commit only when one fits',
  },
  prediction: {
    core: (x) => `Fund $${x.capital} on ${x.name} and take small positions in its most liquid markets — size for activity, not for a view you do not hold.`,
    second: (x) => `Keep a written note of each position and why; a wallet that trades like a person outlasts one that sprays.`,
    weekly: 'one or two market positions of $10–$25',
  },
  insurance: {
    core: (x) => `Buy $${x.capital} of cover from ${x.name} against a position you genuinely hold on ${x.chain}, for the longest term it offers.`,
    second: (x) => `If ${x.name} takes stakers, place a small stake in its underwriting pool as well, so the wallet is both customer and capital.`,
    weekly: 'no weekly action; renew the cover before it lapses',
  },
  payments: {
    core: (x) => `Open the ${x.name} account, finish its KYC, and load $${x.capital} so the account is live and funded.`,
    second: (x) => `Route real, routine spending through it — the activity a payments protocol rewards is use, not deposits that sit still.`,
    weekly: 'ordinary spending through the account, as it comes',
  },
  privacy: {
    core: (x) => `Deposit $${x.capital} into ${x.name} on ${x.chain} using its own interface, and keep the deposit note somewhere only you can read.`,
    second: (x) => `Make one shielded transfer to your own second wallet after a delay of days, not minutes — privacy tools reward patience.`,
    weekly: 'at most one shielded action a week; quiet is the point',
  },
  governance: {
    core: (x) => `Take the position ${x.name} rewards — deposit $${x.capital} through its product on ${x.chain} — and register the wallet wherever it records participation.`,
    second: (x) => `Read each proposal before voting on it; a small wallet that votes with reasons is the user these programs say they want.`,
    weekly: 'vote in every open epoch or proposal',
  },
  generic: {
    core: (x) => `Deposit $${x.capital} of USDC into ${x.name} on ${x.chain} through its own app and keep the position open.`,
    second: (x) => `Use one more of ${x.name}'s features — a second pool, a borrow, a stake — so the wallet shows depth, not a single deposit.`,
    weekly: 'one qualifying action of $10 or more',
  },
};

/**
 * A protocol's farm plan: seven steps, each an action with a cost and a time. The plan is a
 * playbook for the protocol's category, priced and placed from its own record (chains, TVL, age) —
 * never from a hand-written list of names.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const x: PlanContext = {
    name: p.name,
    chain,
    secondChain: secondChainOf(p),
    capital: capitalFor(p),
    gas: gasFor(chain),
    hold: holdDaysFor(age),
  };
  const book = PLAYBOOKS[familyFor(p.category)];
  return [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm with ${x.name}, and keep its seed phrase offline.`,
      cost: 'nothing to create, under $3 of gas to fund',
      time: '5 minutes',
    },
    {
      text: `Fund the wallet on ${x.chain} before you start: bridge or buy in enough for the position plus a gas buffer, and do one tiny test transaction first.`,
      cost: `about $${x.gas} of gas on ${x.chain}`,
      time: '10 minutes',
    },
    {
      text: book.core(x),
      cost: `$${x.capital} of capital and about $${x.gas + 3} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: book.second(x),
      cost: `about $${x.gas} of gas, no new capital unless stated`,
      time: '10 minutes',
    },
    {
      text: `Keep a weekly cadence on ${x.name}: ${book.weekly}. Missed weeks are how farms quietly stop counting.`,
      cost: `about $${x.gas} of gas a week`,
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${x.hold} days so the activity is counted in more than one snapshot; younger protocols get the longer window because their books are thinner.`,
      cost: `the $${x.capital} stays in the position`,
      time: `${x.hold} days`,
    },
    {
      text: `Before you withdraw, open ${x.name}'s own points or rewards page and claim only from the link it publishes; then log the wallet, dates and transactions so the position can be repeated or unwound.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/**
 * A board row's compact form for data.js. The farm plan and the watchlist flag travel with the row
 * so the page renders board.json's own plan and scope, never a second derivation that could drift.
 */
export function radarRow(row: BoardRow, watchlist: boolean): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    peer_multiple: row.model.peer_multiple,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    chain_multiplier: row.model.chain_multiplier,
    size_multiplier: row.model.size_multiplier,
    watchlist,
    farm_steps: row.farm_steps,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    rows: board.map((r) => radarRow(r, snapshot.watchlist.includes(r.slug))),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
