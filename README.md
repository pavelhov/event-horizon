# EVENT HORIZON

A cinematic spaceflight arcade game built with Three.js and Blender assets. Fly a six-sector campaign, assemble your ship upgrades, and escape the black hole—or select endless mode to chase a record.

## Play

```sh
npm install
npm run dev -- --port 5187
```

Open http://localhost:5187 in a desktop browser with WebGL. On macOS, you can also double-click `Play Event Horizon.command`.

## Controls

- Mouse: exact screen-position steering
- WASD / arrow keys: keyboard steering
- Hold left mouse button or Space: boost
- Escape: pause
- Enter: launch / retry

## The run

Blue gates score points. Consecutive gates build a bonus of 10% per additional gate, capped at 50%, boosting doubles gate points, and golden gates provide another double bonus. Wing contact counts, with extra depth tolerance during fast passes.

Solid rocks and orbital structures damage your hull. Damage grants a brief protective window; an on-screen indicator shows when protection is active. A depleted hull ends the run.

Score thresholds unlock sectors at 8,000, 19,000, 35,000, 57,000 and 86,000 points. Each transition restores one hull segment and boost, then offers a permanent upgrade for that run:

- Armor: increase maximum hull and fully repair.
- Reactor: improve boost recovery.
- Bounty: increase points earned.

Reach 122,000 points in campaign mode to trigger the final escape. Endless mode continues with capped difficulty. Results include a performance rank and run statistics; records and campaign wins are stored locally in your browser.

## Assets and audio

The spacecraft and ruins are generated using Blender. Rebuild them with `scripts/blender_assets.py`; generated glTF assets and editable `.blend` files live in `public/assets`.

The soundtrack, engine and effects are synthesized with WebAudio. No accounts, backend or paid services are required.

Ring melodies follow the soundtrack's current chord. Streaks develop through different musical phrases, with richer harmonies and milestone flourishes; gold rings add a brighter bell accent. A missed ring or damage restarts the phrase, while sector-clear cues take priority.

## Production build

```sh
npm run build
npm run preview
```

## Pacing research and verification

See `docs/pacing.md` for sources, design reasoning and simulation assumptions. Run `node scripts/pacing-simulation.mjs` to reproduce the pacing estimates, and `npm test` for regression checks.
