import test from 'node:test';
import assert from 'node:assert/strict';
import { ringNotes } from '../src/ring-audio.js';

const harmonies = [[110,130.81,164.81],[87.31,103.83,130.81],[73.42,87.31,110],[82.41,98,123.47]];
const phrase = (start, harmony) => Array.from({length:5},(_,i)=>ringNotes(start+i,false,harmony)[0][0]);

test('authored phrases keep changing across short and long streaks',()=>{
  for(const start of [1,6,11,16,21,26,96,996,9996]) {
    assert.notDeepEqual(phrase(start,harmonies[0]),phrase(start+5,harmonies[0]));
  }
});

test('fundamentals and milestone chords follow each current harmony',()=>{
  for(const harmony of harmonies) {
    const pitches=harmony.flatMap(f=>[f*4,f*8]);
    for(let combo=1;combo<=35;combo++) {
      const notes=ringNotes(combo,false,harmony);
      assert.ok(pitches.includes(notes[0][0]));
      if(combo%5===0) {
        const cadence=notes.filter(n=>n[1]===.055);
        assert.equal(cadence.length,3);
        assert.ok(cadence.every(n=>pitches.includes(n[0])));
      }
    }
  }
  assert.notDeepEqual(ringNotes(5,false,harmonies[0]),ringNotes(5,false,harmonies[1]));
});

test('streak rewards remain bounded without identical adjacent loops',()=>{
  assert.ok(ringNotes(11).length>ringNotes(1).length);
  assert.ok(ringNotes(20).some(n=>n[1]>=.14));
  for(const harmony of harmonies)for(const combo of [1,5,6,10,11,15,20,100,999,10000,Number.MAX_SAFE_INTEGER]) {
    const notes=ringNotes(combo,true,harmony);
    assert.ok(notes.length<=11);
    assert.ok(notes.reduce((sum,n)=>sum+n[3],0)<.06);
    for(const [frequency,offset,duration,volume] of notes) {
      assert.ok(frequency>=140&&frequency<3200);
      assert.ok(offset>=0&&offset+duration<=.65);
      assert.ok(volume>0&&volume<=.02);
    }
  }
});

test('reset restores the first cue and gold has a quiet distinct accent',()=>{
  const first=ringNotes(1,false,harmonies[1]);
  ringNotes(100,true,harmonies[0]);
  assert.deepEqual(ringNotes(1,false,harmonies[1]),first);
  for(const combo of [1,5,11,20,100]) {
    const normal=ringNotes(combo),gold=ringNotes(combo,true);
    assert.deepEqual(gold.slice(0,normal.length),normal);
    assert.equal(gold.length-normal.length,2);
  }
});

test('invalid combos are silent and unavailable harmony uses a safe default',()=>{
  for(const combo of [0,-1,NaN,Infinity,undefined])assert.deepEqual(ringNotes(combo),[]);
  for(const harmony of [null,[],[NaN,1,2],[1,2,3],[Infinity,200,300]]) {
    assert.deepEqual(ringNotes(1,false,harmony),ringNotes(1));
  }
});
