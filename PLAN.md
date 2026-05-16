# Thozempic — Major Update Plan

This plan covers the 7 features in your brief. Read top-to-bottom: features first,
then how each piece is built, then the ordered build sequence so you can stop me
at any milestone.

---

## 0. Open issues to resolve before coding

1. **`thomas-hoofd.jpg` is not in the project folder.** The current head asset is
   `thomas-head.png` (also inline-base64-embedded in `index.html`). I propose: keep
   using the existing base64 head for now. If you drop `thomas-hoofd.jpg` in the
   root, I'll switch to loading that file. **Need your call.**
2. **`background.png` (old asset) — what to do?** Brief says "IGNORE." I plan to
   remove it from the Dockerfile COPY list and leave the file on disk. **OK?**
3. **End-of-game on level 6 cleared:** brief doesn't specify. I'll treat
   "all 6 levels cleared" as a win → transitions to `SCENE_GAMEOVER` with a "YOU
   WIN" header and the same score breakdown. **OK?**
4. **Shoot pose trigger:** brief says "during rapid fire: hold shoot pose
   continuously" but is silent on normal-fire pose. Plan: also play a brief
   200ms shoot-pose pulse on each normal shot, then revert to walk. **OK?**

---

## 1. Scene state machine (Feature 7)

Add an outer `scene` variable, separate from the existing in-game `game.state`:

```
SCENE_START     → start screen (name input, PLAY)
SCENE_GAME      → active gameplay (existing PLAYING + LEVEL_CLEAR substates live inside)
SCENE_GAMEOVER  → score breakdown + leaderboard
```

Transitions:

- `SCENE_START` → `SCENE_GAME` on PLAY click (name ≥ 2 chars)
- `SCENE_GAME` → `SCENE_GAMEOVER` when Thomas hits 130kg, OR when level 6 is
  cleared (win)
- `SCENE_GAMEOVER` → `SCENE_START` on "Play Again"

Existing `game.state.LEVEL_CLEAR` stays as an *intra-game* overlay between levels
(tap to continue). It does not exit `SCENE_GAME`.

All scenes render onto the same `<canvas id="game">`. Only the **name input** is
a DOM `<input>` element absolutely positioned over the canvas — hidden unless
`scene === SCENE_START`. Everything else is canvas-drawn.

---

## 2. Asset preloader + loading bar

A single `assets` registry, all loaded before the start screen renders:

```
const assets = {
  thomasHead, torsoSlim, torsoMid, torsoDik, torsoShoot,
  armL, armR, armShoot, legL, legR,
  bgLvl1..bgLvl6, kroeg, hamburger, pizza, icon
}
```

- Each value is an `Image`. We count loaded vs total and render a loading bar on
  the canvas during preload.
- Once `loaded === total`, transition to `SCENE_START`.
- Failures: any image that fails to load gets flagged; we don't block startup
  forever — after a 5s timeout, fall back to whatever is loaded and start anyway
  (so a missing asset doesn't brick the game).

---

## 3. Start screen (Feature 1)

Canvas-drawn, mimicking `icon.png`:

- Background: red diagonal stripes (`#C8102E` base, lighter stripes at ~30°)
- "Thozempic" title — large white sans-serif, slight black stroke
- Head image (`thomas-head` or `thomas-hoofd.jpg` once provided) centered, ~200px
- DOM `<input>` overlay positioned at canvas-relative ~58% Y. Styled white
  rounded rectangle with placeholder "Enter your name".
- PLAY button — canvas-drawn gold/red, click-zone tracked via canvas click
  coordinates. Disabled (greyed) until `name.trim().length >= 2`.
- Submitted name lives in `playerName` module variable, used at game over for
  leaderboard.

The DOM input is the only non-canvas UI element in the whole game (per brief).
On scene transition, we hide it (`display: none`).

---

## 4. Thomas animated body (Feature 3)

Replace the entire current procedural `drawThomas*` block with an image-based
system.

### Render order (back to front, every frame)

```
1. back leg   (rotated)
2. back arm   (rotated)
3. torso      (weight-dependent)
4. front leg  (rotated)
5. front arm  (rotated; replaced when shooting)
6. head       (fixed offset above torso, no rotation)
```

The terms "front" and "back" follow Thomas's facing direction:
- facing right: `front = R`, `back = L`
- facing left:  `front = L`, `back = R` (we mirror with negative scaleX)
- facing forward (idle): `front = R`, `back = L` (arbitrary but stable)

### Pivot points

| Part | Pivot | Why |
|------|-------|-----|
| Arms | top-center of arm image (shoulder) | Image is drawn so the top edge sits at the shoulder y, then rotated |
| Legs | top-center of leg image (hip)      | Same logic at hip y |
| Torso| centered horizontally on body axis | No rotation |
| Head | fixed offset above torso center    | No rotation |

Implementation pattern per limb:

```js
ctx.save();
ctx.translate(shoulderX, shoulderY);
ctx.rotate(swing);
ctx.drawImage(armImg, -w/2, 0, w, h);  // top edge at y=0 → pivot at shoulder
ctx.restore();
```

### Torso by weight

| Weight (kg) | Torso image            |
|-------------|------------------------|
| 80–96       | `thomas-torso.png`     |
| 97–113      | `thomas-torso-midden.png` |
| 114–130     | `thomas-torso-dik.png` |

Updates live each frame as `t.weight` changes.

### Walk animation

- `walkPhase` advances continuously; full stride cycle = 500ms.
- `swingMax = 20° (= π/9)`.
- Left arm swing = `sin(walkPhase) * swingMax`
- Right leg swing = `sin(walkPhase) * swingMax` (in phase with left arm)
- Right arm swing = `-sin(walkPhase) * swingMax`
- Left leg swing  = `-sin(walkPhase) * swingMax`
- When `walkSpeed ≈ 0` (Thomas not actually moving), suppress swing and apply
  idle bob: `y += sin(t × 2π / 1s) × 3px`.

### Shoot pose

Active when: `t.shootPoseTimer > 0` OR `game.rapidFireRemaining > 0`.

- Torso: `thomas-torso-shoot.png` instead of weight-based torso.
- Front arm: `thomas-arm-shoot.png` instead of neutral arm; no swing.
- Back arm + legs: still play walk animation.
- Each fired shot sets `t.shootPoseTimer = 0.2s`.

### Sizing

Current body height = ~175px. Each Thomas image will be drawn at a fixed scale
derived from a single `BODY_SCALE` constant; offsets are tuned once and locked.
I'll target the same on-screen footprint as today so existing road bounds and
collision radii keep working without retuning.

---

## 5. Level backgrounds (Feature 4)

```
Level 1 → lvl-eindhoven.png
Level 2 → lvl-amsterdam.png
Level 3 → lvl-dublin.png
Level 4 → lvl-denhaag.png
Level 5 → lvl-basicfit.png
Level 6 → lvl-hell.png
```

### Fade transition

On `level → level+1`:
- Store `prevBgImg` and `currentBgImg`.
- Track `fadeT` from 0 → 1 over 300ms.
- `drawBackground` draws `prevBgImg` at `1 - fadeT`, then `currentBgImg` at
  `fadeT`, both stretched to full canvas.

### Road bounds

Brief: "If backgrounds have similar perspective, reuse the same bounding box."
I'll start with the existing `ROAD_TOP/ROAD_BOTTOM/ROAD_LEFT/ROAD_RIGHT`
constants (the current city-street box) for **all** levels. If any background
clearly demands a different bound (hell, basicfit interior), we tune per-level
later via a `LEVEL_BOUNDS[level]` lookup — but not in this pass.

---

## 6. Kroeg obstacle (Feature 5)

Replaces the current café slide-in/out behavior. Same gameplay penalty (Thomas
collides → beer cutscene → weight gain), new visuals:

- Spawn: random x on the road, y just above the canvas (e.g. `y = -200`).
- Fall: constant downward velocity (start ~180 px/s, can tune).
- Wobble: rotation = `sin(fallT × 2π / 0.6s) × 10°` (10° amplitude, ~600ms cycle).
- Hitbox: rectangle around the image at its current y.
- On Thomas collision: trigger existing beer-cutscene flow (no logic change there).
- On reaching `y > LOGICAL_H + 100` without hitting: despawn.
- Spawn interval: keep existing `CAFE_BASE_INTERVAL_MIN/MAX` (12–25s, scaled by
  level).

### Shoot-down

The current café can be destroyed by an Ozempic shot. Brief is silent on
whether kroeg behaves the same. Plan: **keep the same behavior** (shootable,
gives a puff). Confirm if you want it removed.

---

## 7. Power-up trigger fix (Feature 6)

Today: collision between Thomas and the gold syringe triggers rapid fire.
Change: only an Ozempic projectile hit on the gold syringe triggers it.

- Remove the Thomas↔powerup collision check from `updatePowerups`.
- In `updateProjectiles`, after the existing café-collision check, add a
  powerup-collision check: if projectile hits any `game.powerups[i]`, set
  `rapidFireRemaining = 10s`, spawn particles at impact, remove both projectile
  and powerup.
- Visual: keep the pulsing gold glow and 2mg label so the player knows what to
  shoot.

---

## 8. Game-over screen + leaderboard (Feature 2)

Triggered when `SCENE_GAME` → `SCENE_GAMEOVER`.

### Score formula

```
score = (levelReached × 1000) + (secondsSurvived × 10) + (kgLost × 50)
```

Where:
- `levelReached` = highest level entered before death (or 6 on win).
- `secondsSurvived` = wall-clock seconds in `SCENE_GAME` (excluding pause/cutscene
  if we want strict; for simplicity I'll use total time in `SCENE_GAME`).
- `kgLost` = max(0, `WEIGHT_START - finalWeight`). Clamped to ≥0; losing weight
  is the goal.

### On screen

1. "GAME OVER" (or "YOU WIN" if level 6 cleared) — large header
2. Score breakdown rows:
   - Level: 3 × 1000 = 3000
   - Time: 47s × 10 = 470
   - Kg lost: 8 × 50 = 400
   - **TOTAL: 3870**
3. Leaderboard table (top 10) drawn on canvas:
   - Columns: Rank · Name · Score
   - Current player's row highlighted in `#FFD700`
   - `🏆` emoji next to rank #1
4. "Play Again" button → back to `SCENE_START` (input cleared so a new name can
   be entered; current name pre-filled as default)

### Persistence

`localStorage.thozempic_scores` stores a JSON array of `{name, score, date}`.
On game over: insert current entry, sort desc by score, slice top 10, save.
On load: parse with try/catch; on failure, treat as empty.

---

## 9. State, render order, and update flow

### Per-frame top level

```
update(dt):
  if scene === SCENE_START:    handle start-screen input (button click etc.)
  if scene === SCENE_GAME:     existing updatePlaying / cutscene logic
                               + new powerup-by-projectile check
                               + new kroeg fall update
  if scene === SCENE_GAMEOVER: nothing (static, except button hit-test)

render():
  clear canvas
  if scene === SCENE_START:    drawStartScreen()
  if scene === SCENE_GAME:     drawBackgroundFade()
                               drawEntitiesSorted(food, powerups, kroeg, thomas)
                               drawProjectiles(); drawParticles(); drawPad(); drawHUD()
                               drawLevelClear overlay if applicable
  if scene === SCENE_GAMEOVER: drawGameOverScreen()
```

### Entity render order in SCENE_GAME

Same as today (Y-sort), but Thomas's internal layers (legs, arms, torso, head)
follow the strict order from Feature 3.

---

## 10. Build sequence (order I'll implement, you can stop me at any step)

Each step keeps the game playable so you can preview as we go.

1. **Asset preloader skeleton** — register all assets, draw a loading bar; once
   loaded, immediately enter `SCENE_GAME` (no start screen yet). Sanity check:
   game runs as today.
2. **Scene state machine + start screen** — DOM name input, PLAY button. PLAY
   transitions to `SCENE_GAME`.
3. **Level backgrounds + fade** — replace single background with level-mapped
   images and 300ms fade on level-up.
4. **Thomas body parts** — new `drawThomasBody` replaces procedural draw.
   Includes torso-by-weight, walk anim, idle bob, shoot pose timer.
5. **Power-up shoot-only fix** — remove walk-over trigger, add projectile-hit
   trigger.
6. **Kroeg obstacle** — swap café visual and motion to falling-wobble kroeg
   (keep beer cutscene logic untouched).
7. **Game over + leaderboard** — score formula, breakdown screen, top-10
   localStorage, "Play Again" wiring.
8. **Dockerfile update** — append COPY lines for every new asset; remove old
   `background.png` line.
9. **Cleanup pass** — delete dead procedural-Thomas code (`drawDetailedHair`,
   `drawDetailedBeard`, etc.) and the old `drawField`. Verify in preview.

---

## 11. What this plan does NOT touch

- `docker-compose.yml` (per your instruction)
- Existing food spawning, food timeout, scoring weight system, pendulum
  shooting mechanics, rapid-fire cooldown logic, gold glow on the pendulum
  syringe, particle systems, HUD weight meter — all preserved.
- The existing inline base64 Thomas head (kept as fallback if
  `thomas-hoofd.jpg` is missing).

---

## 12. Commit

Final commit at the end (only when you ask):
```
startscreen, leaderboard, thomas body, levels, kroeg
```

---

**Awaiting approval before any code changes.** Please answer the 4 open issues
in §0 (or just say "go" and I'll take the defaults proposed there).
