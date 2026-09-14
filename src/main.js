import './style.css';
import { createIcon, initializeIcons } from './icons.js';
initializeIcons();
import { createGame } from './game.js';
import { levelStart } from './progression.js';
import { loadProfile, recordRun } from './profile.js';
import { createSoundtrack } from './soundtrack.js';
import { createTiltControls } from './tilt-controls.js';
import { requestPlaybackAudio, readMutedPreference, saveMutedPreference } from './audio-session.js';
const music = createSoundtrack();

const el = (id) => document.getElementById(id);
let mode = 'loading', selectedMode = 'campaign', muted = readMutedPreference(), game;
let lastEventTime = null, lastScore = 0, lastLevelEvent = null, startingFlight = false, recorded = false;
let hullMaximum = 0, currentPhase = 'intro', choosingUpgrade = false, upgradeGeneration = 0;
let profile = loadProfile();
const touchDevice = navigator.maxTouchPoints > 0 || matchMedia('(any-pointer: coarse)').matches;
document.body.classList.toggle('touch-controls', touchDevice);
let steeringStatus = 'touch';
const tilt = createTiltControls({
  onChange: renderSteering,
  onSteer: (x, y) => game?.setTiltInput(x, y),
});
function renderSteering(state) {
  if (steeringStatus === 'active' && state.status === 'touch' && mode === 'playing') {
    game?.pause(); music.pause(); setMode('paused');
  }
  steeringStatus = state.status;
  const active = state.status === 'active', pending = state.status === 'requesting';
  game?.setTiltMode(active);
  for (const panel of document.querySelectorAll('.steering-settings')) {
    panel.classList.toggle('hidden', !touchDevice);
    panel.querySelector('[data-steering="touch"]').setAttribute('aria-pressed', String(!active && !pending));
    const button = panel.querySelector('[data-steering="tilt"]');
    button.setAttribute('aria-pressed', String(active));
    button.disabled = pending || !state.supported;
    button.textContent = pending ? 'CHECKING…' : 'TILT';
    panel.querySelector('[data-recenter]').classList.toggle('hidden', !active);
    const help = panel.querySelector('.motion-help');
    help.classList.toggle('hidden', !state.showPermissionHelp);
    if (!state.showPermissionHelp) help.open = false;
    button.classList.toggle('retry-available', !pending && state.supported && !active);
    panel.querySelector('.steering-status').textContent = state.message || (active ? 'Tilt to steer · Hold the screen to boost.' : 'Drag to steer.');
  }
  if (touchDevice) {
    el('steering-tutorial').textContent = active ? 'TILT TO STEER · HOLD THE SCREEN TO BOOST' : 'DRAG TO STEER';
    document.querySelector('.controls').textContent = active ? 'TILT TO STEER · HOLD TO BOOST · TAP PAUSE FOR RECENTER' : 'DRAG TO STEER · TAP PAUSE FOR CONTROLS';
    document.querySelector('.boost-label span:last-child').textContent = active ? 'HOLD SCREEN' : 'TILT: HOLD SCREEN';
    document.querySelector('#intro .enter-hint').textContent = 'TAP TO LAUNCH';
  }
  // Keep launch/resume in the menu until the sensor check completes.
  el('start').disabled = pending || mode === 'loading';
  el('resume').disabled = pending;
}
for (const button of document.querySelectorAll('[data-steering]')) {
  button.addEventListener('click', () => {
    if (button.dataset.steering === 'tilt') void tilt.enable();
    else tilt.disable();
  });
}
for (const button of document.querySelectorAll('[data-recenter]')) {
  button.addEventListener('click', () => {
    if (tilt.recenter()) for (const status of document.querySelectorAll('.steering-status')) status.textContent = 'Centered. This holding position is now neutral.';
  });
}
renderSteering(tilt.getState());
function show(id, visible) { el(id).classList.toggle('hidden', !visible); }
function setMode(next) {
  mode = next;
  show('intro', next === 'intro' || next === 'loading');
  show('hud', ['playing', 'paused', 'escape'].includes(next));
  show('pause-screen', next === 'paused');
  show('end-screen', next === 'ended');
  show('upgrade-screen', next === 'upgrade');
  show('escape-screen', next === 'escape');
  show('pause', next === 'playing' || next === 'paused');
  document.body.classList.toggle('playing', ['playing', 'paused', 'escape', 'upgrade'].includes(next));
  document.body.classList.toggle('escaping', next === 'escape');
}
function refreshRecords() {
  el('personal-records').textContent = profile.runs ? `BEST ${Number(profile.bestScore || 0).toLocaleString()} · SECTOR ${String(profile.bestLevel || 1).padStart(2,'0')} · ${profile.wins || 0} ESCAPES` : 'FLIGHT RECORD / FIRST FLIGHT AWAITS';
}
function selectMode(value) {
  selectedMode = value;
  for (const name of ['campaign', 'endless']) {
    el(`mode-${name}`).classList.toggle('selected', value === name);
    el(`mode-${name}`).setAttribute('aria-pressed', String(value === name));
  }
}
function clearPresentation() {
  el('flight-feedback').classList.remove('flash', 'impact', 'bonus');
  el('level-announcement').classList.remove('announce');
  el('flight-tutorial').classList.remove('teach');
  document.body.classList.remove('hull-critical');
  el('score').classList.remove('score-pop');
}
function launch(value = selectedMode) {
  if (!game || mode === 'loading' || steeringStatus === 'requesting') return;
  if (steeringStatus === 'active') tilt.recenter();
  selectMode(typeof value === 'string' ? value : selectedMode);
  lastScore = 0; lastEventTime = null; lastLevelEvent = null; recorded = false;
  currentPhase = 'playing'; hullMaximum = 0; clearPresentation();
  startingFlight = true;
  setMode('playing');
  if (!muted) requestPlaybackAudio();
  music.start();
  game.start({ mode: selectedMode });
  startingFlight = false;
  void el('flight-tutorial').offsetWidth;
  el('flight-tutorial').classList.add('teach');
  el('scene').focus();
}
function togglePause() {
  if (currentPhase !== 'playing') return;
  if (mode === 'playing') { game.pause(); music.pause(); setMode('paused'); }
  else if (mode === 'paused' && steeringStatus !== 'requesting') { if (steeringStatus === 'active') tilt.recenter(); if (!muted) requestPlaybackAudio(); game.resume(); music.resume(); setMode('playing'); }
}
function normalized(value, fallback=1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(1, number > 1 ? number / 100 : number));
}
function update(data) {
  if (startingFlight) { lastEventTime = data.eventTime ?? null; lastLevelEvent = data.levelEvent ?? 0; }
  if (data.phase) currentPhase = data.phase;
  music.setLevel(data.level || 1);
  if (currentPhase === 'escape' && mode !== 'escape' && mode !== 'ended') {
    clearPresentation(); setMode('escape');
  }
  if (currentPhase === 'escape') el('escape-progress').style.width = `${normalized(data.escapeProgress, 0) * 100}%`;
  if (mode === 'playing' && ['gate', 'hit', 'bonus'].includes(data.lastEvent) && Number.isFinite(data.eventTime) && data.eventTime !== lastEventTime) {
    lastEventTime = data.eventTime;
    const impact = data.lastEvent === 'hit', bonus = data.lastEvent === 'bonus';
    const feedback = el('flight-feedback');
    feedback.classList.remove('flash', 'impact', 'bonus');
    if (impact) feedback.classList.add('impact');
    if (bonus) feedback.classList.add('bonus');
    el('feedback-message').textContent = impact ? 'HULL IMPACT  −1 HULL' : `${bonus ? 'GOLD GATE' : 'GATE SYNC'}  +${Math.max(0, Math.round((data.score || 0) - lastScore))}`;
    void feedback.offsetWidth; feedback.classList.add('flash');
    if (!impact) { el('score').classList.remove('score-pop'); void el('score').offsetWidth; el('score').classList.add('score-pop'); }
  }
  if (data.levelEvent != null) lastLevelEvent = data.levelEvent;
  lastScore = Number(data.score) || 0;
  el('score').textContent = String(Math.floor(data.score || 0)).padStart(6, '0');
  el('speed').textContent = String(Math.round(data.speed || 0)).padStart(3, '0');
  el('combo').textContent = data.combo > 1 ? `${data.combo} GATE STREAK · +${Math.round(((data.streakMultiplier || 1) - 1) * 100)}%` : 'FIND YOUR LINE';
  const maxShield = Math.max(1, Number(data.maxShield) || 3), shield = Math.max(0, Number(data.shield) || 0);
  if (hullMaximum !== maxShield) {
    hullMaximum = maxShield;
    el('shield').replaceChildren(...Array.from({length:maxShield}, () => document.createElement('i')));
  }
  [...el('shield').children].forEach((segment,index) => segment.classList.toggle('lost', index >= shield));
  el('shield-label').textContent = `${shield} / ${maxShield}`;
  el('shield').setAttribute('aria-label', `${shield} of ${maxShield} hull points`);
  const critical = shield <= 1 && mode === 'playing', protectedNow = data.invincible > 0;
  document.body.classList.toggle('hull-critical', critical);
  el('hull-condition-label').textContent = protectedNow ? 'SHIELD ACTIVE' : critical ? 'CRITICAL — AVOID DEBRIS' : 'HULL STABLE';
  el('hull-condition').querySelector('[data-icon="shield"]').classList.toggle('hidden', !protectedNow);
  el('hull-condition').querySelector('[data-icon="warning"]').classList.toggle('hidden', protectedNow || !critical);
  el('hull-condition').classList.toggle('protected', protectedNow);
  el('boost').style.width = `${normalized(data.boost) * 100}%`;
  el('progress').style.width = `${normalized(data.progress, 0) * 100}%`;
  const level = Math.max(1, Number(data.level) || 1);
  el('level-number').textContent = String(level).padStart(2, '0');
  el('level-name').textContent = data.levelName || 'OUTER RIM';
  const remaining = Math.max(0, (Number(data.nextLevelScore) || levelStart(2)) - (Number(data.score) || 0));
  const finalSector = (data.mode || selectedMode) === 'campaign' && level >= 6;
  el('level-remaining').textContent = `${Math.ceil(remaining).toLocaleString()} TO ${finalSector ? 'ESCAPE' : 'NEXT SECTOR'}`;
  el('level-target-label').textContent = finalSector ? 'EXIT' : String(level + 1).padStart(2, '0');
  el('level-target').querySelector('[data-icon="forward"]').classList.toggle('hidden', finalSector);
  el('level-target').querySelector('[data-icon="arrow"]').classList.toggle('hidden', !finalSector);
  el('level-hint').textContent = data.levelHint || 'Thread gates. Build your streak.';
}
function upgrade(data) {
  const generation = ++upgradeGeneration;
  clearPresentation(); music.pause(); currentPhase = 'upgrade'; choosingUpgrade = false;
  el('upgrade-sector').textContent = `${String(data.level).padStart(2,'0')} / ${data.levelName}`;
  el('upgrade-reward').textContent = data.reward || 'SHIP SYSTEMS RESTORED';
  const container = el('upgrade-choices'); container.replaceChildren();
  const icons = { armor: 'shield', reactor: 'reactor', bounty: 'sparkle' };
  for (const choice of data.choices || []) {
    const button = document.createElement('button'); button.className = 'upgrade-card';
    const icon = document.createElement('span'); icon.className = 'upgrade-icon'; icon.append(createIcon(icons[choice.id] || 'sparkle'));
    const name = document.createElement('strong'); name.textContent = choice.name;
    const description = document.createElement('span'); description.className = 'upgrade-description'; description.textContent = choice.description;
    const select = document.createElement('span'); select.className = 'upgrade-select'; select.append('INSTALL UPGRADE', createIcon('arrow'));
    button.append(icon, name, description, select);
    button.addEventListener('click', () => {
      if (choosingUpgrade || mode !== 'upgrade') return;
      choosingUpgrade = true;
      for (const item of container.children) item.disabled = true;
      if (!muted) requestPlaybackAudio();
      const accepted = game.chooseUpgrade(choice.id);
      if (!accepted) {
        choosingUpgrade = false;
        for (const item of container.children) item.disabled = false;
        return;
      }
      if (generation !== upgradeGeneration) return;
      music.resume();
      currentPhase = 'playing'; setMode('playing');
      el('announcement-number').textContent = String(data.level).padStart(2, '0');
      el('announcement-name').textContent = data.levelName;
      el('announcement-hint').textContent = `${choice.name} installed`;
      el('announcement-reward').textContent = data.reward || '';
      void el('level-announcement').offsetWidth; el('level-announcement').classList.add('announce');
      el('scene').focus();
    });
    container.append(button);
  }
  setMode('upgrade');
  container.querySelector('button')?.focus();
}
function end(data = {}) {
  if (recorded) return;
  recorded = true; music.finish(!!data.win); clearPresentation(); currentPhase = 'ended';
  const score = Math.floor(data.score || 0), oldBest = Number(profile.bestScore) || 0;
  profile = recordRun(data); refreshRecords();
  el('final-score').textContent = String(score).padStart(6, '0');
  el('final-gates').textContent = String(data.gates || 0).padStart(2, '0');
  el('final-best').textContent = Number(profile.bestScore || score).toLocaleString();
  el('final-rank').textContent = data.rank || 'C';
  el('final-combo').textContent = `${data.maxCombo || 0} GATES`;
  el('final-hits').textContent = data.hits || 0;
  const seconds = Math.floor(data.elapsed || 0);
  el('final-elapsed').textContent = `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
  el('end-title').innerHTML = data.win ? 'YOU BROKE<br />THE HORIZON.' : 'THE VOID<br />CALLS AGAIN.';
  el('end-eyebrow').textContent = data.win ? 'CAMPAIGN COMPLETE / PILOT EXTRACTED' : 'FLIGHT RECORDER / SIGNAL LOST';
  el('end-note').textContent = data.win ? 'Six sectors behind you. Infinity still ahead.' : 'Rebuild. Find your line. Go further.';
  el('end-screen').classList.toggle('victory', !!data.win);
  el('retry').firstElementChild.textContent = data.win ? 'FLY THE CAMPAIGN AGAIN' : 'RETRY CAMPAIGN';
  el('final-level').textContent = String(data.level || 1).padStart(2, '0');
  el('final-level-name').textContent = data.levelName || 'OUTER RIM';
  show('new-record', score > oldBest);
  setMode('ended');
}
function ready() { setMode('intro'); renderSteering(tilt.getState()); el('start-label').textContent = 'ENTER THE VOID'; refreshRecords(); }
el('start').addEventListener('click', () => launch());
el('retry').addEventListener('click', () => launch('campaign'));
el('play-endless').addEventListener('click', () => launch('endless'));
el('restart-paused').addEventListener('click', () => launch());
el('return-menu').addEventListener('click', () => { clearPresentation(); game.returnToMenu?.(); music.pause(); currentPhase = 'intro'; setMode('intro'); refreshRecords(); });
el('mode-campaign').addEventListener('click', () => selectMode('campaign'));
el('mode-endless').addEventListener('click', () => selectMode('endless'));
el('pause').addEventListener('click', togglePause);
el('resume').addEventListener('click', togglePause);
function updateSoundControl() {
  el('sound-icon').replaceChildren(createIcon(muted ? 'muted' : 'sound'));
  el('mute').setAttribute('aria-label', muted ? 'Enable sound' : 'Mute sound');
  el('mute').setAttribute('aria-pressed', String(muted));
  el('mute').title = muted ? 'Sound off — tap to enable' : 'Sound on — tap to mute';
}
music.setMuted(muted);
updateSoundControl();
el('mute').addEventListener('click', () => {
  muted = !muted;
  saveMutedPreference(muted);
  if (!muted) requestPlaybackAudio();
  game?.setMuted(muted); music.setMuted(muted);
  updateSoundControl();
});
el('fullscreen').addEventListener('click', async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch {} });
el('reload').addEventListener('click', () => location.reload());
document.querySelector('.brand').addEventListener('click', (event) => { event.preventDefault(); if (mode === 'playing') togglePause(); });
window.addEventListener('keydown', (event) => {
  if (event.code === 'Enter' && ['intro','ended'].includes(mode)) { event.preventDefault(); launch(mode === 'ended' ? 'campaign' : selectedMode); }
  if (event.code === 'Escape' && ['playing','paused'].includes(mode)) { event.preventDefault(); togglePause(); }
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code) && ['playing','paused','escape'].includes(mode)) event.preventDefault();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && mode === 'playing') togglePause();
  game?.setAudioHidden(document.hidden);
  music.setAudioHidden(document.hidden);
});
try { game = createGame(el('scene'), { onReady: ready, onUpdate: update, onEnd: end, onUpgrade: upgrade, getHarmony: music.getHarmony }); game.setMuted(muted); game.setAudioHidden(document.hidden); music.setAudioHidden(document.hidden); }
catch (error) { console.error(error); show('intro', false); show('error-screen', true); el('error-message').textContent = 'The flight renderer could not initialize. Try a browser with WebGL enabled, then reload.'; }
