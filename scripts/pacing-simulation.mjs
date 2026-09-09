import {CAMPAIGN_TARGET,levelStart,gateScore,progressionForScore} from '../src/progression.js';

// Deterministic analytical flight, not a browser playtest. Models 60 Hz movement,
// nine gates/46-unit spacing, finite boost charge and sector refills, spawn-time
// gold assignment, misses resetting streaks, and a seeded capture probability.
// Ignores deaths, lateral travel, upgrade decision time and the 5-second finale.
// "held" resumes holding after each upgrade; "25%" holds 2 seconds every 8.
// Bounty strategy takes bounty for its first three choices, then neutral armor.
const oldThresholds=[0,1000,2500,4500,7000,10000,14000];
export function simulate({old=false,capture=1,boost='none',bounty=true,seed=7}={}){
  let time=0,score=0,level=1,energy=1,combo=0,bountyStacks=0,sequence=9,gateCount=0;
  const results=[],gates=Array.from({length:9},(_,i)=>({z:-65-i*46,passed:false,bonus:false}));
  const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  const thresholds=old?oldThresholds:[...Array.from({length:6},(_,i)=>levelStart(i+1)),CAMPAIGN_TARGET];
  for(let frame=0;frame<60*3600;frame++){
    const dt=1/60,requested=boost==='held'||(boost==='25%'&&time%8<2),boosted=requested&&energy>.01;
    const speed=progressionForScore(levelStart(level)).baseSpeed*(boosted?1.75:1);
    time+=dt;energy=Math.max(0,Math.min(1,energy+(boosted?-.31:.14)*dt));
    for(const gate of gates){
      gate.z+=speed*dt;
      if(!gate.passed&&gate.z>=-.4){
        gate.passed=true;gateCount++;
        if(random()<capture){
          combo++;
          const multiplier=1+bountyStacks*.15;
          score+=old?Math.round(100*Math.min(combo,8)*(boosted?2:1)*(gate.bonus?2:1)*multiplier):gateScore({combo,boosted,bonus:gate.bonus,scoreMultiplier:multiplier});
        }else combo=0;
        if(score>=thresholds[level]){
          results.push({sector:level,seconds:+time.toFixed(1),gates:gateCount,score});
          level++;energy=1;if(bounty)bountyStacks=Math.min(3,bountyStacks+1);
          if(level===7)return results;
        }
      }
      if(gate.z>22){gate.z-=414;gate.passed=false;gate.bonus=level>=4&&sequence%3===2;sequence++;}
    }
  }
  throw new Error('Simulation exceeded one hour');
}
console.log('Estimates only: excludes damage/death, choice time, and 5s finale. Seed7. 25% boost =2s every8s. Held resumes after upgrades.');
const rows=[];
for(const old of [true,false])for(const capture of old?[1]:[1,.75,.5])for(const boost of ['none','25%','held'])for(const bounty of [false,true]){
  const results=simulate({old,capture,boost,bounty});
  rows.push({rules:old?'old':'B',capture,boost,bounty,firstSeconds:results[0].seconds,sectorSeconds:results.map((r,i)=>(r.seconds-(results[i-1]?.seconds||0)).toFixed(1)).join(' / '),campaignMinutes:(results.at(-1).seconds/60).toFixed(2)});
}
console.table(rows);
