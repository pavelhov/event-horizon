const MUTE_KEY = 'event-horizon-muted';

// Invoke inside an explicit sound/launch/resume gesture. Unsupported browsers
// retain their native audio behavior; this is deliberately not an autoplay hack.
export function requestPlaybackAudio(platform = globalThis.navigator) {
  try {
    if (!platform?.audioSession) return false;
    platform.audioSession.type = 'playback';
    return platform.audioSession.type === 'playback';
  } catch { return false; }
}

export function readMutedPreference(storage) {
  try { return (storage ?? globalThis.localStorage)?.getItem(MUTE_KEY) === 'true'; }
  catch { return false; }
}

export function saveMutedPreference(value, storage) {
  try { (storage ?? globalThis.localStorage)?.setItem(MUTE_KEY, String(!!value)); }
  catch { /* Private browsing/storage restrictions must not break sound controls. */ }
}
