import test from 'node:test';
import assert from 'node:assert/strict';
import { createRenderSizeSync } from '../src/render-size.js';

function setup() {
  const canvas = { clientWidth: 300, clientHeight: 150 };
  const viewport = { innerWidth: 1440, innerHeight: 900, devicePixelRatio: 2 };
  const calls = [];
  const renderer = {
    setPixelRatio(value) { this.ratio = value; calls.push('renderer ratio'); },
    setSize(w, h, style) { this.size = [w, h]; this.buffer = [Math.floor(w * this.ratio), Math.floor(h * this.ratio)]; assert.equal(style, false); calls.push('renderer size'); },
  };
  const composer = {
    setPixelRatio(value) { this.ratio = value; calls.push('composer ratio'); },
    setSize(w, h) { this.size = [w, h]; calls.push('composer size'); },
  };
  const camera = { updateProjectionMatrix() { calls.push('camera'); } };
  const sync = createRenderSizeSync(canvas, renderer, composer, camera, viewport, () => calls.push('bounds'));
  return { canvas, viewport, renderer, composer, camera, calls, sync };
}

test('late canvas CSS recovers full render resolution without a window resize', () => {
  const s = setup();
  s.sync();
  assert.deepEqual(s.renderer.buffer, [510, 255]);
  // A stylesheet finishes loading after startup; the viewport never changes.
  s.canvas.clientWidth = 1440;
  s.canvas.clientHeight = 900;
  assert.equal(s.sync(), true);
  assert.deepEqual(s.renderer.buffer, [2448, 1530]);
  assert.deepEqual(s.composer.size, [1440, 900]);
  assert.equal(s.composer.ratio, 1.7);
  assert.equal(s.camera.aspect, 1.6);
  assert.equal(s.calls.filter(c => c === 'bounds').length, 2);
});

test('unchanged frames do not reallocate buffers or update projection', () => {
  const s = setup();
  s.sync();
  s.calls.length = 0;
  for (let i = 0; i < 60; i++) assert.equal(s.sync(), false);
  assert.deepEqual(s.calls, []);
});

test('display density changes update renderer and postprocessing together', () => {
  const s = setup();
  s.sync();
  s.viewport.devicePixelRatio = 1;
  assert.equal(s.sync(), true);
  assert.equal(s.renderer.ratio, 1);
  assert.equal(s.composer.ratio, 1);
  assert.deepEqual(s.renderer.buffer, [300, 150]);
  // Both displays exceed the performance cap; no new allocation is needed.
  s.viewport.devicePixelRatio = 2;
  s.sync();
  s.calls.length = 0;
  s.viewport.devicePixelRatio = 3;
  assert.equal(s.sync(), false);
  assert.deepEqual(s.calls, []);
});

test('a temporarily unlaid-out canvas uses the viewport', () => {
  const s = setup();
  s.canvas.clientWidth = s.canvas.clientHeight = 0;
  s.sync();
  assert.deepEqual(s.renderer.size, [1440, 900]);
  assert.deepEqual(s.composer.size, [1440, 900]);
});
