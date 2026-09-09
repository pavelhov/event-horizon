# Progression pacing — September 7, 2026

## Why upgrades fired too soon

The original first threshold was 1,000 points. Gate rewards grew linearly with the streak up to 8×. Four ordinary consecutive gates paid 100 + 200 + 300 + 400 = 1,000. Three boosted gates paid 200 + 400 + 600 = 1,200.

At the starting speed and gate spacing, a perfect player could trigger the first upgrade in approximately 3.28 seconds without boost or 1.45 seconds with boost. Each level refilled boost, creating a feedback loop: boost earned another upgrade before running out, and the upgrade refilled it again. Later gold and bounty bonuses amplified the problem.

## Research findings

- [Mike Lopez, Gameplay Design Fundamentals: Gameplay Progression](https://www.gamedeveloper.com/design/gameplay-design-fundamentals-gameplay-progression): structure duration, mechanics, practical rewards and difficulty together. His Road Rash example specifically increases course length to account for faster vehicles. Rewards must be understandable, and tuning needs playtesting.
- [Michael Booth, Valve: The AI Systems of Left 4 Dead, slides 80–81](https://valvearchive.com/archive/Other%20Files/Publications/ai_systems_of_l4d_mike_booth.pdf): separate build-up, peak and recovery; allow an encounter to resolve before treating the next stretch as a rest. This supports keeping frequent gate feedback distinct from major upgrade interruptions. It does not prescribe an ideal upgrade interval for our game.
- [GDC: Difficult Games by Data and Design](https://www.gdcvault.com/play/1034838/UX-Summit-Difficult-Games-by): combine player feedback, internal play, analytics and QA. No single test provides a complete picture of difficulty.

## Implemented curve

| Sector | Starts at score | Next objective |
| --- | ---: | ---: |
| Outer Rim | 0 | 8,000 |
| Shattered Belt | 8,000 | 19,000 |
| Ion Storm | 19,000 | 35,000 |
| Gravity Well | 35,000 | 57,000 |
| Event Horizon | 57,000 | 86,000 |
| Beyond | 86,000 | 122,000 / escape |

A gate still pays a 100-point base. The streak adds 10% per consecutive gate after the first, capped at +50% after six gates. Boost and gold each double points; bounty still adds 15% per upgrade. Even a maximized gold, boosted gate with three bounty upgrades pays 870 points, far less than a full sector.

Progression remains score-only. There is no minimum-time requirement, forced waiting or hidden gate-count condition. Quick gate rewards remain frequent; big upgrade choices require a sustained stretch of flight. Later sector budgets increase to accommodate faster movement, gold rewards and ship upgrades.

## Modeling and limits

The deterministic simulator uses seed 7, the game's speed, gate spacing, boost drain/refill and score formula. Example input assumptions:

- 75% of gates captured; misses break the streak.
- Occasional boost means holding for the first two seconds of each eight-second cycle.
- Bounty-focused play selects three bounty upgrades first. A comparison excludes bounty; actual mixed builds may differ, including reactor effects.
- Deaths, time choosing upgrades and the five-second finale are excluded. Numbers are estimates of active flight, not measured human performance or guaranteed completion times.

Under these assumptions the chosen curve produces a first upgrade around 42 seconds with occasional boost. Campaign flight is approximately 4m25s with bounty choices or 5m46s without bounty. An unboosted bounty run is about 7m12s. Perfect boosted players can finish much faster; that is an intentional reward for skill, not a pacing failure.

Run `node scripts/pacing-simulation.mjs` for the reproducible model. Further tuning should use actual play sessions: time to first upgrade, sector durations, gate accuracy, boost use, deaths and whether the player felt interrupted or stalled. These targets are a starting hypothesis, not a claim of universally optimal pacing.
