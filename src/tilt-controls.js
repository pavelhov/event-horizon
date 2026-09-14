// Device orientation is opt-in: detecting the API is only a hint; a real sample
// is required before steering is enabled (some devices expose an empty API).
export function createTiltControls({ onChange = () => {}, onSteer = () => {}, window: win = globalThis.window, timeoutMs = 5000 } = {}) {
  const supported = !!win?.DeviceOrientationEvent && win.isSecureContext !== false;
  let status = 'touch', message = '', generation = 0, timer, resolveEnable;
  let deniedAttempts = 0;
  let baseline = null, latest = null, previousTime = null, x = 0, y = 0;
  const getState = () => ({ status, message, supported, showPermissionHelp: status === 'touch' && deniedAttempts >= 2 && !!message });
  const publish = () => onChange(getState());
  const neutral = () => { x = y = 0; previousTime = null; onSteer(0, 0); };
  const clearTimer = () => { win.clearTimeout(timer); timer = undefined; };
  const angle = () => Number(win.screen?.orientation?.angle ?? win.orientation ?? 0);
  const settle = value => { const resolve = resolveEnable; resolveEnable = undefined; resolve?.(value); };
  function stop(reason = '') {
    generation++;
    clearTimer();
    win.removeEventListener('deviceorientation', sample);
    win.removeEventListener('orientationchange', rotate);
    win.screen?.orientation?.removeEventListener?.('change', rotate);
    win.document?.removeEventListener('visibilitychange', visibility);
    baseline = latest = null;
    status = 'touch'; message = reason;
    neutral(); settle(false); publish();
  }
  function armTimeout() {
    clearTimer();
    if (!win.document?.hidden) timer = win.setTimeout(() => stop('No motion readings. Touch controls are ready.'), timeoutMs);
  }
  function rotate() { baseline = latest = null; neutral(); }
  function visibility() {
    rotate();
    if (win.document?.hidden) clearTimer(); else armTimeout();
  }
  function sample(event) {
    if (win.document?.hidden || !Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return;
    const reading = { beta: event.beta, gamma: event.gamma, angle: angle() };
    latest = reading;
    armTimeout();
    if (!baseline || baseline.angle !== reading.angle) {
      baseline = reading;
      neutral();
      if (status === 'requesting') { deniedAttempts = 0; status = 'active'; message = 'Tilt to steer · hold the screen to boost'; publish(); settle(true); }
      return;
    }
    const wrap = value => ((value + 180) % 360 + 360) % 360 - 180;
    const beta = wrap(reading.beta - baseline.beta), gamma = wrap(reading.gamma - baseline.gamma);
    const radians = reading.angle * Math.PI / 180;
    const horizontal = gamma * Math.cos(radians) + beta * Math.sin(radians);
    const vertical = gamma * Math.sin(radians) - beta * Math.cos(radians);
    // A small neutral zone keeps the ship steady; 24 degrees reaches the edge.
    const normalize = value => Math.sign(value) * Math.min(1, Math.max(0, Math.abs(value) - 1.5) / 22.5);
    const now = win.performance?.now() ?? Date.now();
    const dt = previousTime === null ? 1 / 60 : Math.min(.1, Math.max(0, (now - previousTime) / 1000));
    previousTime = now;
    const blend = 1 - Math.exp(-dt / .07);
    x += (normalize(horizontal) - x) * blend;
    y += (normalize(vertical) - y) * blend;
    onSteer(x, y);
  }
  function enable() {
    stop();
    if (!supported) { message = 'Motion steering is unavailable here. Use touch controls.'; publish(); return Promise.resolve(false); }
    status = 'requesting'; message = 'Allow motion access, then hold your phone comfortably.'; publish();
    const token = generation;
    const result = new Promise(resolve => { resolveEnable = resolve; });
    // Do not await anything before this call: iOS requires the original tap gesture.
    let permission;
    try { permission = win.DeviceOrientationEvent.requestPermission?.(); }
    catch { stop('Motion access could not be requested. Use touch controls.'); return result; }
    Promise.resolve(permission ?? 'granted').then(value => {
      if (token !== generation) return;
      if (value !== 'granted') {
        deniedAttempts++;
        stop(deniedAttempts === 1 ? 'Motion access wasn’t allowed. Tap Tilt to retry.' : 'Your browser is still denying motion access. See how to enable it below, or use Touch.');
        return;
      }
      message = 'Checking motion sensors… hold your phone comfortably.'; publish();
      win.addEventListener('deviceorientation', sample);
      win.addEventListener('orientationchange', rotate);
      win.screen?.orientation?.addEventListener?.('change', rotate);
      win.document?.addEventListener('visibilitychange', visibility);
      armTimeout();
    }, () => { if (token === generation) stop('Motion access failed. Touch controls are ready.'); });
    return result;
  }
  function recenter() {
    if (status !== 'active') return false;
    baseline = latest;
    neutral();
    return true;
  }
  return { enable, disable: () => stop(), recenter, getState, destroy: () => stop() };
}
