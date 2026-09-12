---
title: Progressive ring audio
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
date: 2026-09-12
---

# Progressive ring audio

Passing consecutive rings should produce a rising musical phrase that rewards momentum. The existing descending generic sound obscures that feedback.

## Requirements and decisions

- R1: Ring cues ascend through a harmonious scale, then repeat within a bounded register. Use a C-major pentatonic phrase compatible with the existing sector cue, adding at most two quiet supporting layers as the streak grows.
- R2: Every fifth ring adds a short major chord; gold rings add a brighter bell harmonic accent. Bound each cue's duration, gain, frequency, and note count.
- R3: Derive notes directly from combo so missed rings and damage naturally restart the phrase. Keep damage audio distinct and preserve sector-clear and upgrade sounds.
- R4: Reuse `positiveCue` and `celebrationVoices` for mute and cancellation. Suppress the ring cue when progression changes level or phase, including late sectors without remaining upgrades.

## U1 — Compose and integrate ring cues

Files: `src/ring-audio.js`, `src/game.js`, `tests/ring-audio.test.mjs`.

Add a pure note recipe returning the existing frequency/offset/duration/gain tuples. Integrate after progression evaluation, retaining phase and level priority. No new persisted audio state, dependencies, controls, or scoring changes.

Test scenarios: first phrase ascends; milestone chords repeat every five; long combos remain bounded while adding capped layers; restarting combo restores the initial recipe; gold adds higher quiet harmonics; invalid/zero combos produce no notes. Existing regression suites remain unchanged. Run `npm test` and `npm run build`; the caller owns browser verification of actual scheduling, mute, cancellation, damage, and transition priority.

## Risks and validation

Synthesized timbre is subjective; listen in-browser alongside the engine. Keep summed scheduled gains below 0.08, durations below 0.4 seconds and frequencies below 3200 Hz. Existing Web Audio errors remain nonfatal. Confidence: high; local audio and progression seams are already available. Document review: requirements and implementation unit checked for completeness; no unresolved decisions.
