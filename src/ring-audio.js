const DEFAULT_HARMONY = [110, 130.81, 164.81];
// Ascend, answer, turn, unfold, lift, resolve — then repeat the larger form.
// Each five-gate phrase has a different contour within the same warm register.
const PHRASES = [
  [0, 1, 2, 3, 4],
  [2, 4, 3, 2, 1],
  [1, 2, 0, 3, 2],
  [0, 2, 1, 4, 3],
  [1, 3, 2, 3, 4],
  [4, 2, 3, 1, 0],
];

export function ringNotes(combo, bonus = false, harmony = DEFAULT_HARMONY) {
  if (!Number.isFinite(combo) || combo < 1) return [];
  // The soundtrack supplies its three pad frequencies (D2–E3 range).
  const chord = Array.isArray(harmony) && harmony.length === 3
    && harmony.every(f => Number.isFinite(f) && f >= 70 && f <= 165)
    ? harmony : DEFAULT_HARMONY;
  const streak = Math.floor(combo);
  const phrase = Math.floor((streak - 1) / 5) % PHRASES.length;
  const pitches = [...chord.map(f => f * 4), chord[0] * 8, chord[1] * 8];
  const frequency = pitches[PHRASES[phrase][(streak - 1) % 5]];
  // A round sine body and a fast, quiet octave partial give a soft mallet attack.
  const notes = [[frequency, 0, .24, .017], [frequency * 2, 0, .075, .002]];
  if (streak > 5) notes.push([frequency / 2, 0, .28, .003]);
  if (streak > 10) notes.push([chord[0] * 2, .018, .30, .002]);
  if (streak % 5 === 0) {
    // Vary the voicing, but always resolve into the sounding soundtrack chord.
    for (let i = 0; i < 3; i++) {
      notes.push([chord[i] * (i === phrase % 3 ? 8 : 4), .055, .28, .003]);
    }
    if (streak >= 10) notes.push([pitches[(phrase + 2) % 5], .14, .22, .004]);
    if (streak >= 20) notes.push([pitches[(phrase + 3) % 5], .25, .24, .003]);
  }
  if (bonus) {
    notes.push([frequency * 2, .012, .18, .003], [frequency * 3, .012, .09, .001]);
  }
  return notes;
}
