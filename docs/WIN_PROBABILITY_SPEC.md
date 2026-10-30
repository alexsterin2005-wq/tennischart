# Live Win Probability — Build Spec (v1.1)

Reviewer-facing explanation: "TennisChart Live Win Probability" doc. This file is the build contract.
Reference math (Python, verified numbers below): `docs/win_probability_reference.py`.

## Scope
- Show each player's live chance of winning the match, recomputed after every finished point.
- Pure function of: UTRs (optional), match config, event log. No network, no storage beyond the match record.
- Ships as v1.1, after v1.0 is approved. Do not touch the v1.0 build in review.

## Inputs
| Input | Source | Required |
|---|---|---|
| `p1Utr`, `p2Utr` | Setup screen (moved back from summary), numbers 1.00–16.50 | No |
| `config.scoring` | `ad` / `no_ad` | Yes |
| `config.thirdSet` | `match_tiebreak_10` / `full_set` | Yes |
| `config.firstServer` | `p1` / `p2` | Yes |
| Event log | Existing engine | Yes |

## Constants (tunable, keep in one object)
```ts
const WP = {
  utrScale: 2,        // Win% = 1 / (1 + 10^(-gap/utrScale))
  gapCap: 2.5,        // |gap| clamped to this
  baseServe: 0.60,    // generic junior serve-point win rate
  priorWeight: 40,    // UTR guess counts as this many serve points
};
```

## Algorithm
1. **Pre-match target.** If both UTRs present: `gap = clamp(p1Utr - p2Utr, -gapCap, gapCap)`, `target = 1/(1+10^(-gap/utrScale))`. Else `target = 0.5`.
2. **Starting serve numbers.** Find `edge` in [-0.4, 0.4] by binary search (60 iterations) so that `matchWin(base+edge/2, base-edge/2, config, startState) = target`. `p1Serve0 = base+edge/2`, `p2Serve0 = base-edge/2`. Compute once per match (cache on config + UTRs).
3. **Live blend (every point).** From the engine's computed points (exclude lets/replays; double faults count as server lost):
   `p1Serve = (priorWeight*p1Serve0 + p1ServeWon) / (priorWeight + p1ServePlayed)`; same for p2. Clamp to [0.30, 0.90].
4. **Live probability.** `p1Win = matchWin(p1Serve, p2Serve, config, currentState)`. `p2Win = 1 - p1Win`. Match over → 1 or 0.

### `matchWin(pA, pB, config, state)` — exact, memoized
- **Game** (server serves every point, server win prob `p`): standard recursion on (a, b) points. Ad: deuce closed form `p² / (p² + (1-p)²)`. No-ad: at 3-3 return `p`.
- **Tiebreak** (target 7 for set TB, 10 for match TB, win by 2): first server serves point 0, then alternate every 2 points. Tied at ≥ target-1: closed form over a 2-point cycle `w/(w+l)`, `w = pA(1-pB)`, `l = (1-pA)pB` (from A's perspective).
- **Set:** recursion on games with alternating server; 6-6 → set tiebreak (first server = whoever is due).
- **Match:** best of 3; at 1-1 sets → match tiebreak (if configured) or a full set.
- Current state comes from the engine (`sets`, `g`, `p`, `tb`, `mtb`, `tbIdx`, `curServer`). Memoize per (pA, pB) pair rounded to 4 decimals.
- Performance budget: < 5 ms per point on an iPhone 12.

## Verified reference numbers (must match within ±0.5 pt)
Alex UTR 9.0 vs Aaron 8.5, ad, 10-pt MTB, Alex serves first, no blend (0 points played):
| State | p1Win |
|---|---|
| Start target | 0.640 |
| p1Serve0 / p2Serve0 | 0.616 / 0.584 |
| Hold rates | 0.769 / 0.701 |
| 15-0 first game (Alex serving) | 0.653 |
| 0-15 first game | 0.619 |
| Set 1 4-4, Aaron serving, Alex up 40-30 (BP) | 0.693 |
| → 5-4, Alex to serve | 0.781 |
| → deuce, Aaron serving | 0.631 |
Blend check: 40 Alex serve points, 20 won → p1Serve = 0.558.

## UI
- Setup screen: two optional UTR inputs (decimal keypad), under the names.
- Settings toggle "Show live odds" (default OFF; persisted in localStorage).
- Live bar under the scoreboard when ON: two-color bar (player color / opponent color) + "Alex 64%". Whole percentages.
- Stats page: line chart of p1Win by point index (0–100% y-axis, 50% gridline), markers at break points converted and sets won. Shown regardless of toggle. Included in the Copy stats image.
- Never show odds if fewer than 1 point AND no UTRs? → Show 50% anyway; label "No UTR — learning from the match" under the bar.

## Edge cases
| Case | Behavior |
|---|---|
| No / one UTR | target 0.5 |
| Gap > 2.5 | clamp |
| fix_score / server_swap / undo / edit point | recompute from engine state; blend counts come from the corrected point list |
| unsure marker | no special handling |
| Let / replay | not a point; ignored |
| Ended early | freeze last value, chart ends there |

## Tests (Vitest, in /engine)
1. Each reference number above.
2. Symmetry: swapping players gives 1 - p.
3. Equal players, equal serve → 0.5 at start; no-ad and ad both.
4. Monotonic: winning a point never lowers the winner's probability.
5. Terminal: match over → exactly 1 / 0.
6. No-ad 40-40 game win prob = p.
7. Match tiebreak at 9-9 alternation correct.
8. Performance: 200-point match recompute < 1 s total in Node.

## Calibration (later)
Store `{gap, p1Serve0, final winner, per-point p1Win}` per finished match (local only until a backend exists). After 50+ matches, refit `utrScale`, `baseServe`, `priorWeight` by minimizing log loss on final outcomes. Brier score target < 0.20.
