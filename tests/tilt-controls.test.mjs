import test from 'node:test';
import assert from 'node:assert/strict';
import { createTiltControls } from '../src/tilt-controls.js';

function fixture(permission) {
  const win = new EventTarget();
  const timers = new Map();
  let next = 0, now = 0;
  win.DeviceOrientationEvent = permission ? { requestPermission: permission } : {};
  win.isSecureContext = true;
  win.screen = { orientation: Object.assign(new EventTarget(), { angle: 0 }) };
  win.document = Object.assign(new EventTarget(), { hidden: false });
  win.performance = { now: () => now };
  win.setTimeout = fn => { timers.set(++next, fn); return next; };
  win.clearTimeout = id => timers.delete(id);
  const changes = [], steering = [];
  const controls = createTiltControls({ window: win, onChange: s => changes.push(s), onSteer: (x,y) => steering.push([x,y]) });
  return { win, controls, changes, steering,
    sample(beta,gamma) { now += 50; win.dispatchEvent(Object.assign(new Event('deviceorientation'), { beta, gamma })); },
    expire() { for(const fn of [...timers.values()]) fn(); },
    async listen() { await Promise.resolve(); },
  };
}

test('requests permission synchronously and waits for finite sensor readings', async () => {
  let requested = false;
  const f = fixture(() => { requested = true; return Promise.resolve('granted'); });
  const enabled = f.controls.enable();
  assert.equal(requested, true);
  await f.listen();
  f.sample(null, null); f.sample(NaN, 5);
  assert.equal(f.controls.getState().status, 'requesting');
  f.sample(45, 3);
  assert.equal(await enabled, true);
  assert.equal(f.controls.getState().status, 'active');
  assert.deepEqual(f.steering.at(-1), [0,0]);
  f.controls.destroy();
});

test('denial, rejection, unsupported APIs and empty sensor streams fall back to touch', async () => {
  for (const permission of [() => Promise.resolve('denied'), () => Promise.reject(Error('blocked'))]) {
    const f = fixture(permission);
    assert.equal(await f.controls.enable(), false);
    assert.equal(f.controls.getState().status, 'touch');
  }
  const unsupported = fixture(); delete unsupported.win.DeviceOrientationEvent;
  const controls = createTiltControls({ window: unsupported.win });
  assert.equal(await controls.enable(), false);
  const f = fixture(); const enabled = f.controls.enable(); await f.listen();
  f.expire(); assert.equal(await enabled, false);
  assert.match(f.controls.getState().message, /No motion/);
});

test('cancelled permission cannot enable sensors later', async () => {
  let grant;
  const f = fixture(() => new Promise(resolve => { grant = resolve; }));
  const enabled = f.controls.enable(); f.controls.disable();
  assert.equal(await enabled, false);
  grant('granted'); await f.listen(); f.sample(0,0);
  assert.equal(f.controls.getState().status, 'touch');
});

test('calibrates current hold, applies deadzone and smooths toward bounded full-screen steering', async () => {
  const f = fixture(); const enabled = f.controls.enable(); await f.listen(); f.sample(50,10); await enabled;
  f.sample(51,11); assert.deepEqual(f.steering.at(-1), [0,0]);
  f.sample(26,34);
  const [x,y] = f.steering.at(-1);
  assert.ok(x > 0 && x < 1 && y > 0 && y < 1);
  for(let i=0;i<30;i++) f.sample(26,34);
  assert.ok(f.steering.at(-1).every(n => n > .99 && n <= 1));
  assert.equal(f.controls.recenter(), true); assert.deepEqual(f.steering.at(-1), [0,0]);
  f.sample(26,34); assert.deepEqual(f.steering.at(-1), [0,0]);
});

test('screen rotation recalibrates and transforms landscape axes', async () => {
  const f = fixture(); const enabled = f.controls.enable(); await f.listen(); f.sample(40,0); await enabled;
  f.win.screen.orientation.angle = 90;
  f.win.screen.orientation.dispatchEvent(new Event('change'));
  f.sample(40,0); assert.deepEqual(f.steering.at(-1), [0,0]);
  f.sample(64,0);
  assert.ok(f.steering.at(-1)[0] > 0);
  assert.ok(Math.abs(f.steering.at(-1)[1]) < 1e-10);
});

test('hidden page neutralizes, returning recalibrates, lost readings disable tilt', async () => {
  const f = fixture(); const enabled = f.controls.enable(); await f.listen(); f.sample(40,0); await enabled;
  f.win.document.hidden = true; f.win.document.dispatchEvent(new Event('visibilitychange'));
  f.sample(10,25); assert.deepEqual(f.steering.at(-1), [0,0]);
  f.expire(); assert.equal(f.controls.getState().status, 'active');
  f.win.document.hidden = false; f.win.document.dispatchEvent(new Event('visibilitychange'));
  f.sample(10,25); assert.deepEqual(f.steering.at(-1), [0,0]);
  f.expire(); assert.equal(f.controls.getState().status, 'touch');
});


test('repeated denial requests permission again and offers help; a later grant clears it', async () => {
  let attempts = 0;
  const f = fixture(() => Promise.resolve(++attempts < 3 ? 'denied' : 'granted'));
  assert.equal(await f.controls.enable(), false);
  assert.match(f.controls.getState().message, /Tap Tilt to retry/);
  assert.equal(f.controls.getState().showPermissionHelp, false);
  assert.equal(await f.controls.enable(), false);
  assert.equal(attempts, 2);
  assert.equal(f.controls.getState().supported, true);
  assert.equal(f.controls.getState().showPermissionHelp, true);
  const enabled = f.controls.enable(); await f.listen(); f.sample(40, 0);
  assert.equal(await enabled, true);
  assert.equal(attempts, 3);
  assert.equal(f.controls.getState().showPermissionHelp, false);
  f.controls.destroy();
});
