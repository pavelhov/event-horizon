const KEY = 'event-horizon-profile-v1';
const ranks = ['C', 'B', 'A', 'S'];
const count = value => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;

function clean(value = {}) {
  return {
    bestScore: count(value.bestScore),
    bestLevel: count(value.bestLevel),
    wins: count(value.wins),
    runs: count(value.runs),
    bestRank: ranks.includes(value.bestRank) ? value.bestRank : '—',
    bestCampaignScore: count(value.bestCampaignScore),
    bestEndlessScore: count(value.bestEndlessScore),
    lastRunId: typeof value.lastRunId === 'string' ? value.lastRunId : '',
  };
}

let memory = clean();

export function loadProfile() {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || '{}');
    memory = clean(stored && typeof stored === 'object' ? stored : {});
    memory.bestScore = Math.max(memory.bestScore, count(localStorage.getItem('event-horizon-best')));
  } catch { /* Records still work for this session if storage is unavailable. */ }
  return { ...memory };
}

export function recordRun(summary = {}) {
  const profile = loadProfile();
  if (summary.runId && profile.lastRunId === summary.runId) return profile;
  const score = count(summary.score);
  const bestRank = ranks.indexOf(summary.rank) > ranks.indexOf(profile.bestRank) ? summary.rank : profile.bestRank;
  memory = {
    ...profile,
    bestScore: Math.max(profile.bestScore, score),
    bestLevel: Math.max(profile.bestLevel, count(summary.level)),
    runs: profile.runs + 1,
    wins: profile.wins + (summary.win && summary.mode !== 'endless' ? 1 : 0),
    bestRank,
    bestCampaignScore: Math.max(profile.bestCampaignScore, summary.mode === 'endless' ? 0 : score),
    bestEndlessScore: Math.max(profile.bestEndlessScore, summary.mode === 'endless' ? score : 0),
    lastRunId: typeof summary.runId === 'string' ? summary.runId : '',
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(memory));
    localStorage.setItem('event-horizon-best', String(memory.bestScore));
  } catch { /* Keep the in-memory record when storage is unavailable. */ }
  return { ...memory };
}
