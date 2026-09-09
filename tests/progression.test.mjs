import test from 'node:test';
import assert from 'node:assert/strict';
import {CAMPAIGN_TARGET,FIRST_SECTOR_TARGET,levelStart,progressionForScore,streakMultiplier,gateScore} from '../src/progression.js';

test('sector thresholds transition exactly at the documented score',()=>{
  const thresholds=[0,8000,19000,35000,57000,86000,122000,162000,202000];
  thresholds.forEach((score,i)=>{
    assert.equal(levelStart(i+1),score);
    assert.equal(progressionForScore(score).level,i+1);
    assert.equal(progressionForScore(score).progress,0);
    if(i)assert.equal(progressionForScore(score-1).level,i);
  });
  assert.equal(FIRST_SECTOR_TARGET,8000);
});
test('streak grows gently and stops at 50% bonus',()=>{
  assert.equal(streakMultiplier(0),1);assert.equal(streakMultiplier(1),1);
  assert.equal(streakMultiplier(3),1.2);assert.equal(streakMultiplier(6),1.5);
  assert.equal(streakMultiplier(10000),1.5);assert.equal(streakMultiplier(-10),1);
});
test('boost, gold and bounty remain actual multipliers with bounded awards',()=>{
  assert.equal(gateScore({combo:1}),100);
  assert.equal(gateScore({combo:6,boosted:true}),300);
  assert.equal(gateScore({combo:6,bonus:true}),300);
  const maximum=gateScore({combo:1000,boosted:true,bonus:true,scoreMultiplier:1.45});
  assert.equal(maximum,870);
  for(let level=1;level<=20;level++)assert.ok(maximum<levelStart(level+1)-levelStart(level));
});
test('campaign final sector remains six while endless crosses its finish score',()=>{
  assert.equal(CAMPAIGN_TARGET,122000);
  const finalSector=progressionForScore(CAMPAIGN_TARGET-1);
  assert.equal(finalSector.level,6);assert.equal(finalSector.nextLevelScore,CAMPAIGN_TARGET);
  assert.equal(progressionForScore(CAMPAIGN_TARGET).level,7);
  assert.equal(progressionForScore(CAMPAIGN_TARGET+40000).level,8);
  assert.equal(progressionForScore(99999999).baseSpeed,115);
});
