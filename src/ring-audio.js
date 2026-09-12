// Five-note C-major pentatonic phrase stays in one register as combo grows.
const MELODY=[523.25,587.33,659.25,783.99,880];

export function ringNotes(combo,bonus=false){
  if(!Number.isFinite(combo)||combo<1)return [];
  const streak=Math.floor(combo);
  const frequency=MELODY[(streak-1)%MELODY.length];
  const notes=[[frequency,0,.18,.03]];
  // Richness grows for the first two phrases, then caps instead of climbing.
  if(streak>5)notes.push([frequency/2,0,.21,.006]);
  if(streak>10)notes.push([frequency*2,0,.13,.004]);
  if(streak%5===0){
    for(const pitch of [523.25,659.25,783.99])notes.push([pitch,.045,.25,.007]);
  }
  if(bonus){
    // Quiet upper partials give gold rings a bright, bell-like attack.
    notes.push([frequency*2,.012,.22,.008],[frequency*3,.012,.12,.003]);
  }
  return notes;
}
