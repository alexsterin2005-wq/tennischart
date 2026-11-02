# TennisChart — Full Product & Build Spec (v1.0)

Everything needed to rebuild TennisChart from scratch: purpose, rules, data model, scoring engine, every screen and component, design system, stats math, packaging, and acceptance tests. Describes the app as shipped in build 1.0.0 (7).

- **App Store name:** TennisChart: Match Stats
- **Publisher:** BaselineBook LLC
- **Bundle ID:** `com.baselinebook.tennischart`
- **Repo:** `alexsterin2005-wq/tennischart`
- **Related docs:** `docs/WIN_PROBABILITY_SPEC.md` (v1.1 live odds, not built)

---

## 1. Product

### 1.1 Purpose
A match charting app for parents of junior tennis players. A parent sits courtside, taps along each point, fixes any mistake instantly, and gets pro-style match statistics they can send to a coach as an image.

### 1.2 Users
- **Primary:** tennis parents, mostly non-coaches, often older, often in bright sun, phone in one hand.
- **Secondary:** coaches who receive the stats image.

### 1.3 Product principles (non-negotiable)
1. **Three taps per point minimum.** In → who won → how. Shot and rally are optional.
2. **No state you can get stuck in.** Every misclick is fixable in one or two taps (Undo, Let/Replay, Fix score, edit any past point).
3. **No confirm dialogs on scoring.** Every tap commits; Undo is the confirm. Confirms only for destructive actions (End match, New match).
4. **Score is never stored, only computed** from an event log. Editing anything re-scores the match.
5. **Nothing leaves the phone.** No account, login, server, analytics, ads, or network calls.
6. **Your player is the "good guy":** your player = yellow-green, opponent = light blue, everywhere.
7. **Readable for older eyes and in sunlight:** large type, high contrast, Sun mode.

### 1.4 Out of scope for v1.0
Accounts, cloud sync, match history list, payments, doubles, voice input, Apple Watch, coach web links, live win probability, opponent-side report, QR code on report.

---

## 2. Architecture

### 2.1 Stack
- One self-contained HTML file (`www/index.html`): markup, CSS, and vanilla JS. No framework, no build step.
- Wrapped as a native iOS app with **Capacitor 8** (Swift Package Manager).
- Plugins: `@capacitor/haptics`, `@capacitor/status-bar`, `@capacitor/splash-screen`.
- Fonts: Google Fonts **Barlow Condensed** (600, 700) for display, **Barlow** (400, 500, 600) for body. The app must look correct offline with system fallbacks (`Impact, "Arial Narrow", sans-serif` and `system-ui, -apple-system, sans-serif`).

### 2.2 Code layout inside the file
1. **Engine (pure functions):** `compute(match)`, `undoLabel(match)`, `computeStats(match, state, setFilter)`. No DOM access.
2. **App state:** `match` (the persisted match) and `ui` (transient: current step, pending winner, hints seen, stats tab, expanded rows).
3. **Screens:** setup, live, summary (stats). Exactly one visible at a time (`show(id)`).
4. **Sheets:** a single bottom-sheet component reused for every dialog.
5. **Report image:** canvas renderer, `reportImage()`.
6. **Native bridge:** `window.__haptic(kind)` when running inside Capacitor; no-op in a browser.

### 2.3 Persistence (localStorage, all reads/writes in try/catch)
| Key | Contents |
|---|---|
| `mc_match` | The current match JSON (or empty) — saved after every event |
| `mc_prev` | The last match, saved when "New match" is confirmed (one-level undo) |
| `mc_lastp1` | Last "your player" name, offered as a chip |
| `mc_hints` | Which first-use hints have been seen |
| `mc_sun` | `"1"` when Sun mode is on |

On launch: if `mc_match` holds a match → resume it (stats screen if it was ended, otherwise live scoring). Else → setup screen, with "Reopen last match" if `mc_prev` exists.

---

## 3. Data model

```ts
type PlayerId = "p1" | "p2";   // p1 = your player, p2 = opponent

type MatchConfig = {
  scoring: "ad" | "no_ad";
  thirdSet: "match_tiebreak_10" | "full_set";
  firstServer: PlayerId;
};

type Match = {
  id: string;
  createdAt: number;           // ms
  p1Name: string;
  p2Name: string;
  p1Utr?: number;
  p2Utr?: number;
  tournament?: string;
  surface?: string;
  ended?: boolean;             // ended early via End match
  config: MatchConfig;
  events: Event[];
};

// every event also carries id (string) and ts (ms)
type Event =
  | { type: "serve_fault" }
  | { type: "serve_in" }
  | { type: "point"; winner: PlayerId; how: "winner" | "forced_error" | "unforced_error" }
  | { type: "shot"; shot: "fh" | "bh" | "slice_drop" | "overhead" | "volley" | "serve" | "return" }   // attaches to the last point
  | { type: "rally"; rally: "short" | "medium" | "long" }                                            // attaches to the last point
  | { type: "let" }                       // net let: replay the serve
  | { type: "replay" }                    // replay whole point from 1st serve
  | { type: "note"; text: string }
  | { type: "fix_score"; unsure: boolean; games?: [number, number]; points?: [string, string]; server?: PlayerId }
  | { type: "server_swap" };
```

Derived meanings:
- **Ace** = `serve_in` → `point{winner: server, how: "winner"}` → `shot: "serve"`.
- **Double fault** = two `serve_fault` in a row → point to the returner (engine records `how: "double_fault"`).
- `serve_in`/`serve_fault` before a point decide whether it was played on 1st or 2nd serve.

---

## 4. Scoring engine

`compute(match)` replays every event in order and returns the full state:
`sets[]`, `setIdx`, `g` (games), `p` (points), `tb`, `mtb`, `tbIdx`, `tbFirst`, `server`, `serveNum (1|2)`, `awaiting` (serve is in, outcome pending), `points[]` (every finished point with its context), `games[]`, `markers[]` (lets, replays, fixes, unsure, notes), `over`, `winner`, `disp` (display points), `curServer`, `scoreStr` (server-first), `setsWon`, `inTiebreak`, `flags` (break/set/match point).

### 4.1 Rules
- **Best of 3 sets.** Sets to 6 games, win by 2; **7-point tiebreak at 6-6** (first to 7, win by 2).
- **Ad scoring:** deuce, AD, game. **No-ad:** at 40-40 the next point wins the game.
- **Third set:** `match_tiebreak_10` = first to 10, win by 2, counts as the third set; `full_set` = a normal set.
- **Serve rotation:** alternates every game. In a tiebreak: first server serves 1 point, then players alternate every 2 points. After a tiebreak set, the player who did NOT serve first in the tiebreak serves first in the next set.
- **Display:** in-game points as `0/15/30/40/AD`; tiebreak points as integers.

### 4.2 Event handling
| Event | Effect |
|---|---|
| `serve_fault` | 1st serve → becomes 2nd serve. 2nd serve → double fault, point to returner. |
| `serve_in` | Sets `awaiting = true` (outcome pending). |
| `point` | Records the point (see 4.3), updates score, resets to 1st serve. |
| `shot` / `rally` | Attached to the most recent point. |
| `let` | Marker only. Score and serve number unchanged. |
| `replay` | Back to 1st serve, `awaiting = false`. Any fault already logged on that point no longer counts. Marker added. |
| `note` | Marker with text, set, games, score, and timestamp. |
| `fix_score` | Overrides games / points / server from here on. `unsure:true` → adds an "unsure" marker and flags the next point. |
| `server_swap` | Flips the server from here on (tiebreak: flips who served first in the tiebreak). Supported by the engine; no v1.0 button creates it (the Fix score sheet's "Who is serving" toggle is the UI path). |

Events after the match is over are ignored (except `fix_score`).

### 4.3 Per-point record
`{ setIdx, server, serveNum, winner, how, shot, rally, before (score string, server first), bp, sp, mp, bpFor, spFor, mpFor, unsure }`

### 4.4 Break / set / match point
- **Break point:** not in a tiebreak, and the returner wins the game if they win this point. Covers 0-40, 15-40, 30-40, 40-AD, and no-ad 40-40.
- **Set point:** a player wins the set if they win this point.
- **Match point:** a set point for a player who already has one set.

### 4.5 Undo
- Undo removes the last *scoring* event. Trailing `shot`/`rally` events are removed together with it, so one tap undoes a whole point.
- Label (`undoLabel`) skips shot/rally and names the event: `Undo fault`, `Undo serve`, `Undo point`, `Undo let`, `Undo replay`, `Undo note`, `Undo server`, `Undo score fix`. Disabled when there are no events.

### 4.6 Double-tap guard
Ignore any second event pushed within **250 ms** of the previous one (notes excluded).

---

## 5. Screens and components

### 5.1 Global layout
- App column: max width **560 px**, centered; side padding `max(16px, safe-area)`; 12 px gaps.
- Respect iPhone safe areas top and bottom.
- Live screen is **locked**: no page scroll, no rubber-band (`overflow:hidden; overscroll-behavior:none; touch-action:manipulation`).
- **Toast:** small pill above the bottom edge, fades out after 1.6 s.

### 5.2 Setup screen
Top to bottom:
1. **Header row:** eyebrow "TENNISCHART", title "NEW MATCH"; on the right a **☀️ Sun mode** pill (toggles Sun mode; reads "☀️ Sun mode on" and fills yellow when on).
2. **Court card** (brand blue, rounded 16): label "OPPONENT" + text input (placeholder "Opponent name"); a dashed white line (the net); label "YOUR PLAYER" + text input (placeholder "Your player's name").
   - Under "Your player": a chip **"Use {last name}"** when a previous name exists. Tap fills the field and hides the chip. The field always starts empty.
   - Keyboard: Opponent field "Next" → jumps to Your player; Your player "Done" → closes keyboard. Focusing either field scrolls Start match into view.
3. **START MATCH** (big primary button, directly under the court so the keyboard never hides it).
4. **↩ Reopen last match ({p1} vs {p2})** (ghost button), only when `mc_prev` exists. Restores that match exactly.
5. **Match format card:** eyebrow "MATCH FORMAT · BEST OF 3 SETS", then two segmented toggles:
   - `Ad scoring` (default) | `No-ad`
   - `10-pt match tiebreak` (default) | `Full third set`
- Empty names default to "My player" / "Opponent".
- Start match → **"Who serves first?"** sheet with two big buttons (player names). Tapping one creates the match and opens the live screen.

### 5.3 Live scoring screen
Three regions: scoreboard (top), stage (middle, fills space, buttons pinned to the bottom of it), edit bar (bottom).

#### 5.3.1 Scoreboard (whole card is tappable → Fix score)
A 3-column grid (`left | middle | right`):
| Row | Left | Middle | Right |
|---|---|---|---|
| Names | 🎾 + your player name (yellow-green) | "SETS" label + sets score `0–0` | opponent name (light blue) + 🎾 |
| Games | your games (44 px) | `SET 1 · GAMES` (or `SET 2 · TB · GAMES`, `MATCH TB · GAMES`, `FINAL · GAMES`) | opponent games |
| Points | your points (64 px) | `POINTS` (or `TB POINTS`) | opponent points |
| Alert | — | Big-point pill (see below), spans all columns | — |
| Edit | — | **✎ FIX SCORE** outlined pill, spans all columns | — |

- **Ball:** a 22 px yellow circle beside the server's name. Only the server's ball is visible.
- **Names** shrink with screen width (15–22 px) before truncating with an ellipsis.
- **Big-point pill:** `BREAK POINT · {returner}` (red #d6382c) · `SET POINT · {player}` (orange, warn token) · `MATCH POINT · {player}` (purple #7b1fa2). Match point outranks set point outranks break point. Hidden otherwise.
- **Point-won animation:** the winner's name and points number scale up and flash in their color for 0.6 s. Disabled under reduced motion.

#### 5.3.2 Stage (one step at a time, same area)
| Step | Label (28 px display) | Buttons |
|---|---|---|
| Serve | `1ST SERVE · {server}` (2nd serve label turns orange) | **IN** (solid blue) · **FAULT** (blue outline), side by side, filling the stage |
| Who won | `WHO WON THE POINT?` | **{your player}** (yellow-green) · **{opponent}** (light blue), side by side |
| How | `{winner} WON. HOW?` | **WINNER** · **FORCED ERROR** · **UNFORCED ERROR**, three across (blue outline); link "← Change who won" below |
| Shot | `{hitter} · {how}. WHICH SHOT?` | Chips in a grid: FH · BH · SLICE/DROP · OVERHEAD · VOLLEY · SERVE · RETURN · then full-width dashed **Skip** |
| Rally | `RALLY LENGTH?` | Short (1–4) · Medium (5–8) · Long (9+) · **Skip** |
| Match over | `GAME, SET, MATCH {winner}` | **SEE STATS** |

Rules:
- The point is committed when "how" is tapped; shot and rally only add detail.
- **Hitter** = the winner if "Winner", otherwise the loser.
- **Shot availability:** `SERVE` only when the hitter is the server AND how = Winner. `RETURN` only when the hitter is the returner.
- Choosing **Serve** or **Return** skips the rally step and auto-logs rally = short.
- Buttons stretch to fill the space between the label and the edit bar (max ~52% of viewport height), so targets are as big as possible in the thumb zone.

#### 5.3.3 Hint line
One line of muted text under the stage:
- Very first serve of the app: "Tap In when the serve lands, Fault when it misses."
- First time on the How step: the definitions of each unseen option, e.g. "Forced error: The other player made them miss".
- After the first point, once: "Ace? Tap In, then the server's name, then Winner, then Serve."
Seen hints are remembered (`mc_hints`).

#### 5.3.4 Edit bar (always visible)
| Button | Style | Action |
|---|---|---|
| **Undo {thing}** | orange outline, widest | Removes the last scoring event (+ its shot/rally). Disabled at 0 events. |
| **Let / Replay** | neutral | Opens the Let sheet |
| **Note** | neutral | Opens the Note sheet |
| **Stats** | neutral, muted text | Opens the stats screen (match keeps going) |
| **☀️** | neutral, narrow | Toggles Sun mode |

Below the bar, centered red text button: **End match** → confirm sheet.

#### 5.3.5 Banners
A 1.3 s centered card (inverted colors, 40 px display text) when:
- a game ends: `GAME · {winner}` + new games score
- a set ends: `SET · {winner}` + set score
- the match ends: `MATCH · {winner}` + final set score
Also fires the "game" haptic.

#### 5.3.6 Tap feedback
- Haptics (inside the app): medium impact on a point or fault, light on other events, success notification on a banner.
- Browser fallback: `navigator.vibrate` where supported.

### 5.4 Sheets (bottom sheet component)
Dim backdrop (tap outside to close), panel slides from the bottom, max 85% height, scrolls. Every sheet ends with a red-outlined **CLOSE** button.

| Sheet | Contents |
|---|---|
| **Who serves first?** | Two big buttons with the player names |
| **Fix the score** | Games inputs for each player (number keypad), points dropdowns (0/15/30/40/AD) for each player, "Who is serving" toggle, **SAVE SCORE**, and **Not sure, just mark it and keep going** (logs `fix_score{unsure:true}`). In a tiebreak: a warning that only games can be fixed; use Undo for tiebreak points. |
| **Let** | **NET LET** — "Serve clipped the net. Replay the serve, still {1st/2nd} serve." · **REPLAY THE POINT** — "Ball rolled on or interruption. Start over from 1st serve." (adds "The fault already logged is erased." on 2nd serve) |
| **Note · Set N · games · score** | Textarea (placeholder "e.g. started rushing 2nd serves, looked tired") + **SAVE NOTE** |
| **End the match here?** | Explains it's for retirements/time limits; scoring can't resume; **END MATCH** (red) |
| **Point at {score}** (edit) | Who won toggle, How toggle (Winner / Forced / Unforced), Shot chips, Rally chips, **SAVE CHANGES**, **Delete this point** (orange). For a double fault: only **Delete this fault**. |
| **Start a new match?** | "This match is not saved. Copy the stats first if you need it." + **NEW MATCH** |
| **Match stats** (fallback) | When the clipboard can't take an image: "Press and hold the image → Copy" + the report image |

### 5.5 Stats screen (summary)
Scrollable column, top to bottom:
1. **Final card** (brand blue): both names (uppercase) on the left; on the right the completed set scores (`6–4  3–6`, tiebreak loser's points in parentheses, match tiebreak as `10–8`); if in progress, the current set's games plus a small "{points} now" line. Footer: `{winner} WINS` / `ENDED EARLY` / `MATCH IN PROGRESS` · `AD`/`NO-AD` · `FULL 3RD SET`/`10-PT MATCH TB`.
2. If the match is still going and not ended: **← BACK TO SCORING** (primary) and **END MATCH** (red outline), side by side.
3. **Set tabs:** `Match · Set 1 · Set 2 · Set 3` (only sets that exist). Filter everything below.
4. **MATCH STATS** heading + the **stats table** (5.6).
5. Warning line if the parent lost track: "⚠ Parent lost track N times this match. Score may be off near those points."
6. **KEY MOMENTS:** every break point, set point, and match point: tag (`BREAK PT · SET 1`), `{score} · {what happened}`, who won it. "None yet." when empty.
7. **Fields:** Your player UTR, Opponent UTR (decimal keypad), Tournament, Surface. Saved on change; all optional.
8. **EVERY POINT:** "Tap a point to change or delete it." Rows: score before the point (server first) · description (e.g. "Aaron unforced error · BH · long rally", "Alex ace", "Alex double fault") with "⚠ score may be off here" when flagged · tag `1st`/`2nd` + `· BP`. Tap → Edit point sheet.
9. **NOTES:** each note shows `SET 1 · 4-3 · 30-15 · 38 MIN IN` and the text. "No notes yet." when empty. A textarea + **ADD** button below adds a note stamped with the current score.
10. Bottom bar (outside the scroll area, always visible): **COPY STATS** (primary) · **NEW MATCH** (primary).

### 5.6 Stats table component
- **Header row:** avatar circle with your player's initial (yellow-green) + name on the left; set label centered; name + avatar (light blue) on the right.
- **Section bands** (solid brand blue, white text): `{your player} | SERVE | {opponent}`, and the same for RETURN, POINTS, RALLY LENGTH.
- **Row** = 3 columns: `[value + bar growing LEFT] | [STAT NAME on a light cell, 96 px] | [bar growing RIGHT + value]`.
  - Your bar = yellow-green, opponent bar = light blue, 12 px tall, on a grey track.
  - Percentage stats show `64% 21/33` (the fraction smaller and dimmer) and the bar = the percentage.
  - Count stats show the number; the bar = that player's share of the two combined.
  - Nothing recorded shows `0`, never `0/0`.
- **Expandable rows:** Winners ▾, Forced errors ▾, Unforced errors ▾ (dotted underline). Tap to show sub-rows by shot type.

**Rows, in order**
| Section | Row | Type |
|---|---|---|
| Serve | Aces | count |
| | Double faults | count |
| | 1st serve in | % made/attempted |
| | 1st serve pts won | % |
| | 2nd serve pts won | % |
| | Break pts saved | % saved/faced |
| | Service games | count |
| Return | 1st serve return pts won | % |
| | 2nd serve return pts won | % |
| | Break pts converted | % converted/had |
| | Return games | count |
| Points | Net pts won (approx) | % |
| | Winners ▾ | count (+ by shot) |
| | Forced errors ▾ | count (+ by shot) |
| | Unforced errors ▾ | count (+ by shot) |
| | Service pts won | % |
| | Return pts won | % |
| | Total pts won | % |
| Rally length | Short (1–4) won | % |
| | Medium (5–8) won | % |
| | Long (9+) won | % |

### 5.7 Stats definitions (per player X, opponent O, within the set filter)
- **Serve points:** points where X served. **Return points:** points where O served.
- **1st serve in:** serve points played on 1st serve ÷ all serve points.
- **1st / 2nd serve pts won:** of X's serve points on that serve, % X won.
- **Aces:** points X served and won with how = Winner and shot = Serve.
- **Double faults:** X's serve points with how = double fault.
- **Break pts saved:** of X's serve points that were break points, % X won.
- **Break pts converted:** of O's serve points that were break points, % X won.
- **Service / return games:** completed games where X / O served.
- **1st / 2nd serve return pts won:** of O's serve points on that serve, % X won.
- **Hitter:** winner if how = Winner, else the loser.
- **Winners / forced errors / unforced errors:** points with that how where X is the hitter; by shot when tagged.
- **Net pts won (approx):** points ending on X's volley or overhead, % X won.
- **Service / return / total pts won:** % of those points X won.
- **Rally length won:** of points with that rally tag, % X won.

### 5.8 Copy stats (report image)
One tap renders a PNG on a canvas and writes it to the clipboard (`navigator.clipboard.write` + `ClipboardItem`). If that's refused, show the fallback sheet with the image for press-and-hold copy.

**Layout** (canvas 1080 px wide, always light colors, height fits the content, max 15,000 px):
1. **Header band** (brand blue #1a56a0): "MATCH REPORT" left, date right; big centered score; your player's name left, opponent right; centered meta line: result · tournament · `UTR x vs y` · Ad/No-ad.
2. **Legend:** green square + your player name (left); opponent name + blue square (right).
3. **Section bands** with both names (SERVE, RETURN, POINTS, RALLY LENGTH · PTS WON if any rally data), and stat rows drawn exactly like the in-app table (mirrored bars, center label cell).
4. **BY SHOT:** for winners / forced / unforced, one line per player listing shots ("FH 3, Overhead 2").
5. **KEY MOMENTS:** every break, set, and match point (no cap), colored by who won it.
6. **NOTES:** stamp line + note text.
7. Footer: "Charted with TennisChart".

All long text wraps to the available width; nothing is truncated.

---

## 6. Design system

### 6.1 Color tokens
| Token | Light | Dark | Sun mode |
|---|---|---|---|
| `--bg` | #f4f6f9 | #0c1322 | #ffffff |
| `--surface` | #ffffff | #182439 | #ffffff |
| `--fg` | #0b1526 | #f6f8fc | #000000 |
| `--muted` | #3f4b61 | #c3cddd | #1f2937 |
| `--line` | #b8c2d1 | #3b4c6b | #6b7280 |
| `--court` (brand blue / actions) | #1a56a0 | #5a9cf0 | #0b3f80 |
| `--ball` (tennis ball, focus ring) | #b9d52a | #e2f55a | #d4ea00 |
| `--me` (your player) | #4fa81f | #c9ef6a | #2e7d0f |
| `--opp` (opponent) | #3a86d6 | #74b9ff | #0b5fb8 |
| `--warn` (undo, 2nd serve, set point) | #a6420a | #ffb067 | #8a3200 |

Fixed colors: close/end/break point red **#d6382c**; match point purple **#7b1fa2**.

- The theme follows the phone's light/dark setting. **Sun mode** forces the Sun column regardless and thickens borders (2.5 px), outlines stat bars, and darkens labels.

### 6.2 Color rules
| Meaning | Color |
|---|---|
| Your player | yellow-green (`--me`) |
| Opponent | light blue (`--opp`) |
| Neutral actions (In, Fault, How, chips) | brand blue (`--court`) — In solid, the rest outlined |
| Undo | orange (`--warn`) |
| Close / End match / destructive | red #d6382c |

### 6.3 Typography
- **Display:** Barlow Condensed 700, uppercase: titles (34 px), step labels (28 px), big buttons (26–34 px), scoreboard numbers (games 44 px, points 64 px, sets 30 px).
- **Body:** Barlow, 17 px base; labels 12–13 px uppercase with letter-spacing.
- All numbers use tabular figures.

### 6.4 Shapes and sizes
- Big buttons: min 64 px tall, 14 px radius. Edit bar buttons: 54 px. Chips: 44–60 px.
- Cards: 14–16 px radius, 1.5 px borders.
- Focus ring: 3 px `--ball` outline.

### 6.5 Motion
Point-won flash (0.6 s), banners (1.3 s), toast fade. All respect `prefers-reduced-motion`.

---

## 7. Native and platform behavior
- **Screen wake lock** requested while on the live screen, re-requested when the app returns to the foreground. *(Unverified inside the iOS web view; confirm on device before claiming it.)*
- **Haptics** via Capacitor Haptics (see 5.3.6).
- **Status bar** default style; splash screen 0.8 s on brand blue.
- Works fully **offline** (everything is bundled).

---

## 8. Edge cases
| Case | Behavior |
|---|---|
| Empty names | "My player" / "Opponent" |
| Double tap | Second tap within 250 ms ignored |
| Ball rolls on court mid-point | Let/Replay → Replay the point (back to 1st serve, logged fault erased) |
| Serve clips net | Let/Replay → Net let (serve number unchanged) |
| Parent lost track | Fix score → "Not sure, just mark it" (⚠ marker on the timeline, stats, and report) |
| Wrong server | Tap the scoreboard → Fix score → change "Who is serving" → Save |
| Wrong past point | Stats → Every point → tap row → edit or delete; everything recomputes |
| Tiebreak score wrong | Undo (Fix score only edits games in a tiebreak) |
| Retirement / time limit | End match (locks scoring, "Ended early" everywhere) |
| App closed mid-match | Resumes exactly where it was |
| New match by mistake | "Reopen last match" on setup |
| Very long match with many notes | Report image grows to fit (tested: 164 points, 18 long notes → 1080×5064) |
| Clipboard refused | Fallback sheet with press-and-hold image |

---

## 9. iOS packaging and release

### 9.1 Project
- `capacitor.config.json`: `appId com.baselinebook.tennischart`, `appName TennisChart`, `webDir www`, iOS `contentInset never`, background `#f4f6f9`; SplashScreen 800 ms, `#1a56a0`.
- Icon: brand-blue square, white court lines (outline, net, service boxes), yellow ball top-right. Generated sizes via `@capacitor/assets`.
- `Info.plist`: display name TennisChart; `ITSAppUsesNonExemptEncryption = false`.
- Shared Xcode scheme `App` committed (`ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme`).
- Marketing version 1.0.0.

### 9.2 Build (no Mac) — Codemagic `codemagic.yaml`
- Mac mini M2, Node 22, Xcode latest (26+ required by Apple since Apr 28, 2026).
- Steps: `npm ci` → `npx cap sync ios` → resolve Swift packages → `xcode-project use-profiles` → build number = `$BUILD_NUMBER + 1` (`agvtool`) → `xcode-project build-ipa --project ios/App/App.xcodeproj --scheme App`.
- Signing: App Store Connect API key integration + Apple Distribution certificate + App Store provisioning profile `tennischart_appstore`.
- Publishing: uploads to App Store Connect (no auto-submit).

### 9.3 Store listing
- Name: TennisChart: Match Stats · Subtitle: Chart your kid's match, easy · Category: Sports · Age 4+ · Free · all countries.
- Privacy: Data Not Collected. Policy: `https://alexsterin2005-wq.github.io/tennischart/privacy.html`. Support: `https://alexsterin2005-wq.github.io/tennischart/`.
- Screenshots: iPhone 1179×2556 and iPad 13" 2064×2752, dark theme, Alex vs Aaron sample match.
- Review notes: the six-answer template + a screen recording from a real iPhone (see the app-store-submission workflow).

### 9.4 Known gaps to close
- **No privacy policy link inside the app** (Apple guideline 5.1.1(i) expects one in the app too).
- Wake lock not verified on device.
- iPad shows the phone-width column centered.

---

## 10. Acceptance tests
1. A parent who has never charted can finish a full match without getting stuck.
2. Every misclick is fixable in one or two taps.
3. Ad, no-ad, 7-point tiebreak, 10-point match tiebreak, and full third set all score correctly, including tiebreak serve rotation.
4. Break, set, and match point pills appear at exactly the right scores.
5. Deleting or editing an old point re-scores the match and all stats.
6. Undo after a point with shot + rally removes the whole point in one tap.
7. Force-quitting mid-match and reopening restores the match exactly.
8. No text is clipped on the smallest supported iPhone (375 pt wide) in all three themes.
9. Copy stats pastes a complete image into Messages; a 3-set match with many notes is fully readable.
10. The app works in airplane mode.

---

## 11. Saved ideas (not built)
- **v1.1 Live win probability** — full spec in `docs/WIN_PROBABILITY_SPEC.md` (UTR → starting odds → exact score math → live blend, weight 80, backtested on 1,970 matches).
- QR code + "Free on the App Store" on the report image, with an App Store campaign link (`ct=stats-image`) to count downloads from shared images.
- "Send to opponent" report built from the other player's side.
- Match history and season trends; coach link with "seen" receipts.
- Pricing later: keep charting and sharing free; subscription + annual plan for history, trends, coach link, live odds (competitor MatchTrack: $2.99/mo or $9.99/yr).
