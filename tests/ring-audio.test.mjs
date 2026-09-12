import test from 'node:test';
import assert from 'node:assert/strict';
import { ringNotes } from '../src/ring-audio.js';

test('first five rings climb a harmonious phrase',()=>{
  const pitches=Array.from({length:5},(_,i)=>ringNotes(i+1)[0][0]);
  assert.deepEqual(pitches,[523.25,587.33,659.25,783.99,880]);
});

test('every fifth ring adds a major milestone chord',()=>{
  for(const combo of [5,10,15,100]){
    const notes=ringNotes(combo);
    assert.equal(notes.filter(note=>note[1]===.045).length,3);
    assert.deepEqual(notes.filter(note=>note[1]===.045).map(note=>note[0]),[523.25,659.25,783.99]);
  }
  for(const combo of [1,4,6,11,99])assert.equal(ringNotes(combo).filter(note=>note[1]===.045).length,0);
});

test('long streaks repeat their melody and add only bounded layers',()=>{
  assert.equal(ringNotes(1)[0][0],ringNotes(6)[0][0]);
  assert.ok(ringNotes(6).length>ringNotes(1).length);
  assert.ok(ringNotes(11).length>ringNotes(6).length);
  for(const combo of [1,5,6,10,11,15,100,999,10000,Number.MAX_SAFE_INTEGER]){
    const notes=ringNotes(combo,true);
    assert.ok(notes.length<=8);
    assert.ok(notes.reduce((sum,note)=>sum+note[3],0)<.08);
    for(const [frequency,offset,duration,volume] of notes){
      assert.ok(frequency>=250&&frequency<3200);
      assert.ok(offset>=0&&offset+duration<.4);
      assert.ok(volume>0&&volume<=.035);
    }
  }
  assert.deepEqual(ringNotes(16),ringNotes(10001));
});

test('combo reset restores the initial cue without retained streak state',()=>{
  const first=ringNotes(1);
  ringNotes(100,true);
  assert.deepEqual(ringNotes(0),[]);
  assert.deepEqual(ringNotes(1),first);
});

test('gold keeps the melody and adds higher quiet bell partials',()=>{
  for(const combo of [1,5,11,100]){
    const normal=ringNotes(combo),gold=ringNotes(combo,true);
    assert.deepEqual(gold.slice(0,normal.length),normal);
    const accent=gold.slice(normal.length);
    assert.equal(accent.length,2);
    assert.ok(accent.every(note=>note[0]>normal[0][0]&&note[3]<normal[0][3]));
  }
});

test('invalid combos are silent',()=>{
  for(const combo of [-1,NaN,Infinity,undefined])assert.deepEqual(ringNotes(combo),[]);
});
