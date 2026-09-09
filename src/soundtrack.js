/**
 * Procedural cinematic spaceflight soundtrack.
 * No external assets — Web Audio oscillators, gain envelopes, and delay only.
 */
export function createSoundtrack() {
  const CHORDS = [
    { bass: 55.0, pad: [110.0, 130.81, 164.81], arp: [220.0, 261.63, 329.63, 392.0] },
    { bass: 43.65, pad: [87.31, 103.83, 130.81], arp: [174.61, 207.65, 261.63, 311.13] },
    { bass: 36.71, pad: [73.42, 87.31, 110.0], arp: [146.83, 174.61, 220.0, 261.63] },
    { bass: 41.2, pad: [82.41, 98.0, 123.47], arp: [164.81, 196.0, 246.94, 293.66] },
  ];

  const VICTORY = [261.63, 329.63, 392.0, 523.25];

  let ctx = null;
  let master = null;
  let dryBus = null;
  let wetBus = null;
  let delay = null;
  let delayReturn = null;
  let padFilter = null;

  let running = false;
  let paused = false;
  let muted = false;
  let finished = false;
  let level = 1;

  let chordIndex = 0;
  let beat = 0;
  let timers = [];
  let voices = [];

  function clampLevel(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 1;
    return Math.max(1, Math.min(6, Math.round(n)));
  }

  function safe(run) {
    try {
      return run();
    } catch {
      return undefined;
    }
  }

  function clearTimers() {
    for (const timer of timers) clearTimeout(timer);
    timers = [];
  }

  function scheduleTimer(fn, ms) {
    const timer = setTimeout(() => {
      const index = timers.indexOf(timer);
      if (index >= 0) timers.splice(index, 1);
      fn();
    }, Math.max(0, ms));
    timers.push(timer);
  }

  function stopVoices(fade = 0.12) {
    if (!ctx) {
      voices = [];
      return;
    }
    const now = ctx.currentTime;
    for (const voice of voices) {
      safe(() => {
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
        voice.gain.gain.linearRampToValueAtTime(0, now + fade);
        voice.osc.stop(now + fade + 0.02);
      });
    }
    voices = [];
  }

  function trackVoice(osc, gain, stopAt) {
    voices.push({ osc, gain, stopAt });
    const cleanupDelay = Math.max(0, (stopAt - ctx.currentTime) * 1000 + 80);
    scheduleTimer(() => {
      voices = voices.filter((voice) => voice.osc !== osc);
    }, cleanupDelay);
  }

  function masterTarget() {
    if (muted || paused || finished || !running) return 0;
    return 0.038 + (level - 1) * 0.007;
  }

  function rampMaster(target, duration = 0.55) {
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(target, now + duration);
  }

  function intensity() {
    return 0.72 + (level - 1) * 0.055;
  }

  function beatInterval() {
    return 620 - (level - 1) * 38;
  }

  function ensureContext() {
    if (ctx) return ctx;
    const AudioCtx = typeof window !== 'undefined'
      ? (window.AudioContext || window.webkitAudioContext)
      : null;
    if (!AudioCtx) return null;

    ctx = new AudioCtx();

    master = ctx.createGain();
    master.gain.value = 0;

    dryBus = ctx.createGain();
    dryBus.gain.value = 0.72;

    wetBus = ctx.createGain();
    wetBus.gain.value = 0.34;

    delay = ctx.createDelay(2.5);
    delay.delayTime.value = 0.42;

    delayReturn = ctx.createGain();
    delayReturn.gain.value = 0.24;

    padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 900;
    padFilter.Q.value = 0.35;

    padFilter.connect(dryBus);
    padFilter.connect(delay);

    delay.connect(delayReturn);
    delayReturn.connect(delay);
    delay.connect(wetBus);

    dryBus.connect(master);
    wetBus.connect(master);
    master.connect(ctx.destination);

    return ctx;
  }

  function resumeContext() {
    if (!ctx) return;
    if (ctx.state === 'suspended') safe(() => ctx.resume());
  }

  function shouldPlay() {
    return running && !paused && !finished && !muted && !!ctx;
  }

  function playPad(chord, start, duration) {
    const attack = 1.4;
    const release = 2.1;
    const levelScale = intensity();

    padFilter.frequency.setTargetAtTime(760 + level * 95, start, 0.8);

    for (const freq of chord.pad) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const peak = 0.011 * levelScale;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(peak, start + attack);
      gain.gain.setValueAtTime(peak * 0.9, start + duration - release);
      gain.gain.linearRampToValueAtTime(0, start + duration);
      osc.connect(gain);
      gain.connect(padFilter);
      osc.start(start);
      osc.stop(start + duration + 0.05);
      trackVoice(osc, gain, start + duration);
    }
  }

  function playBass(chord, start, duration) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = chord.bass;

    lfo.type = 'sine';
    lfo.frequency.value = 0.55 + level * 0.08;
    lfoGain.gain.value = 0.004 * intensity();
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);

    const peak = 0.02 * intensity();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(peak, start + 0.08);
    gain.gain.setValueAtTime(peak * 0.75, start + duration - 0.12);
    gain.gain.linearRampToValueAtTime(0, start + duration);

    osc.connect(gain);
    gain.connect(dryBus);
    osc.start(start);
    osc.stop(start + duration + 0.02);
    lfo.start(start);
    lfo.stop(start + duration + 0.02);
    trackVoice(osc, gain, start + duration);
  }

  function playArpNote(freq, start, duration) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const peak = 0.0075 * intensity();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(peak, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0008, start + duration);
    osc.connect(gain);
    gain.connect(dryBus);
    gain.connect(delay);
    osc.start(start);
    osc.stop(start + duration + 0.02);
    trackVoice(osc, gain, start + duration);
  }

  function scheduleCycle() {
    if (!shouldPlay()) return;

    const chord = CHORDS[chordIndex % CHORDS.length];
    const now = ctx.currentTime + 0.02;
    const bar = (beatInterval() / 1000) * 4;
    const padDuration = bar * (3.6 + (level >= 4 ? 0.4 : 0));

    playPad(chord, now, padDuration);

    if (beat % 2 === 0) {
      playBass(chord, now + 0.04, bar * 1.6);
    }

    const arpPattern = level >= 5 ? [0, 2, 1, 3, 2, 1] : level >= 3 ? [0, 2, 1, 3] : [0, 2, 1];
    const arpStep = beatInterval() / 1000;
    for (let i = 0; i < arpPattern.length; i += 1) {
      const idx = arpPattern[i];
      const freq = chord.arp[idx % chord.arp.length];
      playArpNote(freq, now + 0.35 + i * arpStep * 0.92, arpStep * 0.82);
    }

    chordIndex += 1;
    beat += 1;

    scheduleTimer(scheduleCycle, padDuration * 1000 - 420);
  }

  function beginPlayback() {
    if (!ctx) return;
    resumeContext();
    rampMaster(masterTarget(), 0.9);
    scheduleCycle();
  }

  function haltPlayback(fade = 0.35) {
    clearTimers();
    stopVoices(fade);
    rampMaster(0, fade);
  }

  function playFinish(win) {
    if (!ctx || muted) {
      rampMaster(0, 0.25);
      return;
    }

    resumeContext();
    const now = ctx.currentTime;
    const notes = win ? VICTORY : [110.0, 98.0, 87.31];
    const spacing = win ? 0.22 : 0.35;
    const noteLen = win ? 0.9 : 0.7;
    const peak = win ? 0.018 : 0.012;

    for (let i = 0; i < notes.length; i += 1) {
      const start = now + 0.05 + i * spacing;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = win ? 'sine' : 'triangle';
      osc.frequency.value = notes[i];
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(peak, start + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0008, start + noteLen);
      osc.connect(gain);
      gain.connect(dryBus);
      gain.connect(delay);
      osc.start(start);
      osc.stop(start + noteLen + 0.05);
      trackVoice(osc, gain, start + noteLen);
    }

    rampMaster(win ? masterTarget() * 0.55 : 0, win ? 0.4 : 0.8);
    scheduleTimer(() => rampMaster(0, 0.6), (win ? 2.4 : 1.6) * 1000);
  }

  function start() {
    finished = false;
    paused = false;
    chordIndex = 0;
    beat = 0;

    clearTimers();
    stopVoices(0.05);

    const audio = ensureContext();
    if (!audio) return;

    running = true;
    resumeContext();
    rampMaster(muted ? 0 : masterTarget(), 0.05);
    if (!muted) beginPlayback();
  }

  function pause() {
    if (!running || paused) return;
    paused = true;
    haltPlayback(0.3);
  }

  function resume() {
    if (!running || finished) return;
    const wasPaused = paused;
    paused = false;
    if (!wasPaused) return;

    if (muted) {
      rampMaster(0, 0.05);
      return;
    }

    resumeContext();
    beginPlayback();
  }

  function setLevel(nextLevel) {
    level = clampLevel(nextLevel);
    if (shouldPlay()) rampMaster(masterTarget(), 0.35);
  }

  function setMuted(value) {
    muted = !!value;
    if (muted) {
      haltPlayback(0.25);
      return;
    }
    if (running && !paused && !finished) {
      resumeContext();
      rampMaster(masterTarget(), 0.45);
      if (!timers.length) beginPlayback();
    }
  }

  function finish(win = false) {
    if (!running) return;
    finished = true;
    clearTimers();
    stopVoices(0.1);
    playFinish(!!win);
  }

  return {
    start,
    pause,
    resume,
    setLevel,
    setMuted,
    finish,
  };
}
