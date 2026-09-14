# EVENT HORIZON

A cinematic spaceflight arcade game built with Three.js and Blender assets. Fly a six-sector campaign, assemble your ship upgrades, and escape the black hole—or select endless mode to chase a record.

## Play

[Play Event Horizon](https://eventhorizon.pavelhov.com) in your desktop browser.

### Run locally

Use Node.js 22.12 or newer (Node.js 24 is recommended).

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
- Phone: drag to steer, or choose **Tilt** before launch or while paused.
- Tilt mode: hold the phone comfortably to calibrate, tilt to steer, and hold the screen to boost. **Recenter** in the menu or pause screen resets neutral.

Tilt is opt-in and requires usable motion sensors and a secure connection. Motion permission is requested only when selecting Tilt. If permission is denied or readings are unavailable, Touch remains available. Tilt stays tappable to retry; repeated denial reveals motion-permission help because Safari can remember Cancel and suppress its dialog. Sensor loss during flight pauses the game and returns to Touch. Rotating the phone recalibrates the neutral position.

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

The soundtrack, engine and effects are synthesized with WebAudio. On supporting browsers, explicit launch/resume/unmute actions request playback audio so iPhone silent mode does not suppress the game. This may pause other media apps. The sound button remembers your mute choice, and backgrounding the page silences game audio. Older browsers without Audio Session support retain their normal audio behavior. No accounts, backend or paid services are required.

Ring melodies follow the soundtrack's current chord. Streaks develop through different musical phrases, with richer harmonies and milestone flourishes; gold rings add a brighter bell accent. A missed ring or damage restarts the phrase, while sector-clear cues take priority.

## Production build

```sh
npm run build
npm run preview
```

## Deployment

Cloudflare Workers serves the Vite build in `dist` at
[eventhorizon.pavelhov.com](https://eventhorizon.pavelhov.com).
The worker name, assets directory, and custom domain are defined in `wrangler.jsonc`.

Connect this repository to the `event-horizon` Worker under **Settings → Builds**
with these settings:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Root directory | `/` (repository root) |
| Build command | `npm run build` |
| Deploy command | `npm run deploy` |
| Build environment variable | `NODE_VERSION=24` |

Enable automatic builds for `main`. Cloudflare installs the locked npm dependencies
before the build. Each push to `main` then builds and deploys the game. Keep the
Cloudflare Worker name equal to the name in `wrangler.jsonc`.

For a local deployment, authenticate Wrangler to the Cloudflare account that owns
the `pavelhov.com` zone, then run:

```sh
npm ci
npm test
npm run build
npm run deploy -- --dry-run
npm run deploy
```

The custom domain configuration lets Cloudflare manage the hostname's DNS and
certificate. See the official [Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
and [custom domains documentation](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).

## Pacing research and verification

See `docs/pacing.md` for sources, design reasoning and simulation assumptions. Run `node scripts/pacing-simulation.mjs` to reproduce the pacing estimates, and `npm test` for regression checks.
