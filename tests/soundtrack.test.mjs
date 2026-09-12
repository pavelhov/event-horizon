import test from 'node:test';
import assert from 'node:assert/strict';
import { createSoundtrack } from '../src/soundtrack.js';
import { ringNotes } from '../src/ring-audio.js';

// Fake browser boundaries only: the soundtrack scheduler and ring composer are real.
function audioHarness(t) {
  let now=0,id=0;
  const timers=new Map();
  const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){}});
  const node=()=>({gain:param(),frequency:param(),Q:param(),delayTime:param(),connect(){},disconnect(){},start(){},stop(){}});
  class AudioContext {
    constructor(){this.state='running';this.destination={};}
    get currentTime(){return now/1000;}
    createGain(){return node();} createOscillator(){return node();}
    createDelay(){return node();} createBiquadFilter(){return node();}
    resume(){return Promise.resolve();}
  }
  const previousWindow=globalThis.window;
  globalThis.window={AudioContext};
  t.after(()=>{if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;});
  t.mock.method(globalThis,'setTimeout',(fn,ms)=>{timers.set(++id,{fn,at:now+ms});return id;});
  t.mock.method(globalThis,'clearTimeout',id=>timers.delete(id));
  return {advance(ms){const end=now+ms;for(;;){const next=[...timers].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;now=next[1].at;timers.delete(next[0]);next[1].fn();}now=end;},timers};
}

const am=[110,130.81,164.81],fm=[87.31,103.83,130.81],dm=[73.42,87.31,110];

test('ring harmony changes at audible start, not when the next cycle is scheduled',t=>{
  const clock=audioHarness(t),music=createSoundtrack();
  music.start();
  assert.deepEqual(music.getHarmony(),am);
  clock.advance(8508); // second cycle queues a new chord 20 ms ahead
  assert.deepEqual(music.getHarmony(),am);
  clock.advance(19);
  assert.deepEqual(music.getHarmony(),am);
  clock.advance(2);
  assert.deepEqual(music.getHarmony(),fm);
  const notes=ringNotes(5,false,music.getHarmony());
  assert.ok(notes.filter(n=>n[1]===.055).every(n=>fm.flatMap(f=>[f*4,f*8]).includes(n[0])));
  const copy=music.getHarmony();copy[0]=0;
  assert.deepEqual(music.getHarmony(),fm);
});

test('pause cancels pending harmony; resume installs only the newly audible chord',t=>{
  const clock=audioHarness(t),music=createSoundtrack();music.start();clock.advance(8508);
  music.pause();clock.advance(1000);assert.deepEqual(music.getHarmony(),am);
  music.resume();assert.deepEqual(music.getHarmony(),am);
  clock.advance(21);assert.deepEqual(music.getHarmony(),dm);
  music.pause();const held=music.getHarmony();clock.advance(1000);
  assert.deepEqual(music.getHarmony(),held);
});

test('mute, restart and finish discard pending changes without stale timers',t=>{
  const clock=audioHarness(t),music=createSoundtrack();music.start();clock.advance(8508);
  music.setMuted(true);clock.advance(1000);assert.deepEqual(music.getHarmony(),am);
  assert.equal(clock.timers.size,0);
  music.setMuted(false);clock.advance(21);assert.deepEqual(music.getHarmony(),dm);
  music.start();assert.deepEqual(music.getHarmony(),am);clock.advance(21);
  assert.deepEqual(music.getHarmony(),am);
  clock.advance(8487);music.finish();clock.advance(30);
  assert.deepEqual(music.getHarmony(),am);
});
