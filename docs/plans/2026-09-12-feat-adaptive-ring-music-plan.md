---
title: Adaptive ring music
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
date: 2026-09-12
---

# Adaptive ring music

## Goal Capsule

Make successive gates feel like a developing musical performance, matching the sounding soundtrack harmony while remaining immediate and warm. Scoring, gate pacing, controls, and sector priority remain unchanged.

## Product Contract

- R1. Vary authored five-hit phrases throughout a streak; adjacent phrases must differ rather than repeat the same ascending loop.
- R2. Gate fundamentals, answers, and milestone chords follow the soundtrack's effective sounding chord, including chord transitions and pause/resume.
- R3. Add bounded warm supporting layers and milestone answers as streaks grow. Gold retains a distinct bell accent; avoid endlessly increasing register or gain.
- R4. Misses/damage restart phrase progression. Mute, pause, restart, and sector transitions cancel scheduled ring tails; sector/escape cues retain priority.

## Planning Contract

- KTD1. session-settled: user-approved. Use chord-aware authored variants and bounded streak progression rather than the existing repeated C-major phrase; the accepted research identified repetition and F-minor clashes.
- KTD2. session-settled: user-approved. Keep immediate gate feedback with short answering flourishes rather than delaying the primary hit to a beat; gameplay responsiveness takes priority over a transport overhaul.
- KTD3. Keep procedural Web Audio and existing tracked celebration voices. Use a dedicated ring timbre option with restrained harmonics, and a soundtrack harmony callback injected at game creation. A shared audio engine, sample downloads, and a new music transport are outside scope.
- The soundtrack exposes a copy of the currently effective chord frequencies; maintain current and pending entries using its own audio clock. Select the new chord when its scheduled start becomes audible, and preserve the prior chord through cancellation until a resumed chord takes effect. Existing short pad overlap is treated as a transition to the incoming dominant chord.

## Implementation Units

### U1. Compose, integrate, and verify adaptive cues

Files: `src/ring-audio.js`, `src/soundtrack.js`, `src/game.js`, `src/main.js`, `tests/ring-audio.test.mjs`, `tests/soundtrack.test.mjs`.

Keep the pure frequency/offset/duration/gain recipe interface, extended with harmony input. Compose multiple bounded contours over chord tones, with lower harmonies and short milestone answers. Integrate a restrained bell timbre without changing sector recipes. Expose effective harmony from the soundtrack and inject it into game cue generation. Cancel ring tails through existing voice cleanup at lifecycle boundaries.

Test scenarios: distinct adjacent phrases across long combos; fundamentals and cadences agree with each soundtrack chord; invalid combo silence and deterministic reset; capped note count/gain/register/duration; gold distinction; harmony before and after scheduled change; cancelled pending changes; pause/resume/mute/restart timing. Inspect current ring and game integration tests before changing them; update old repetition assertions and observe expected failures before implementation.

## Verification Contract

Run `npm test` and `npm run build`. Use fake Web Audio/time only at browser API boundaries while testing the real soundtrack-to-ring recipe chain. Caller owns browser verification of scheduling, lifecycle cancellation, sector priority, and an audible mix check. Automated tests cannot judge perceived timbre quality.

## Definition of Done

All U1 behavior and lifecycle checks pass; production build succeeds. Changes contain no scoring or pacing adjustments, no new dependencies, and no unbounded pitch/voice escalation. Caller performs final review/browser/shipping.
