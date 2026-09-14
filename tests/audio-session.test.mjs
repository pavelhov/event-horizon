import test from 'node:test';
import assert from 'node:assert/strict';
import { requestPlaybackAudio, readMutedPreference, saveMutedPreference } from '../src/audio-session.js';

test('playback audio is opt-in and unsupported or rejected APIs are harmless', () => {
  const platform = { audioSession: { type: 'auto' } };
  assert.equal(platform.audioSession.type, 'auto');
  assert.equal(requestPlaybackAudio(platform), true);
  assert.equal(platform.audioSession.type, 'playback');
  assert.equal(requestPlaybackAudio({}), false);
  assert.equal(requestPlaybackAudio({ get audioSession() { throw new Error('denied'); } }), false);
  assert.equal(requestPlaybackAudio({ audioSession: { set type(_) { throw new Error('unsupported'); } } }), false);
});

test('mute preference persists safely without making storage a requirement', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  assert.equal(readMutedPreference(storage), false);
  saveMutedPreference(true, storage);assert.equal(readMutedPreference(storage), true);
  saveMutedPreference(false, storage);assert.equal(readMutedPreference(storage), false);
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(readMutedPreference(blocked), false);
  assert.doesNotThrow(() => saveMutedPreference(true, blocked));
});
