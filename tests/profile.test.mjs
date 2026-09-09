import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProfile, recordRun } from '../src/profile.js';
const data=new Map([['event-horizon-best','700']]);
globalThis.localStorage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
test('records migrate and completed runs are recorded once',()=>{
  assert.equal(loadProfile().bestScore,700);
  const summary={runId:'campaign-1',score:14000,level:6,mode:'campaign',win:true,rank:'A'};
  const profile=recordRun(summary);
  assert.equal(profile.runs,1);assert.equal(profile.wins,1);assert.equal(profile.bestRank,'A');
  assert.equal(recordRun(summary).runs,1);
  const endless=recordRun({runId:'endless-1',score:18000,level:8,mode:'endless',rank:'B'});
  assert.equal(endless.runs,2);assert.equal(endless.wins,1);assert.equal(endless.bestRank,'A');
  assert.equal(endless.bestCampaignScore,14000);assert.equal(endless.bestEndlessScore,18000);
});
