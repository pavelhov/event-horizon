const thresholds = [0, 8000, 19000, 35000, 57000, 86000];
export const CAMPAIGN_TARGET = 122000;
export const FIRST_SECTOR_TARGET = thresholds[1];
export function streakMultiplier(combo){return 1 + .1 * Math.min(Math.max(combo - 1, 0), 5);}
export function gateScore({combo,boosted=false,bonus=false,scoreMultiplier=1}){
  return Math.round(100 * streakMultiplier(combo) * (boosted?2:1) * (bonus?2:1) * scoreMultiplier);
}
const stages = [
  {name:'Outer Rim', hint:'Build a streak through the calm outer gates.', color:0x27dbff, speed:62, hazards:4},
  {name:'Shattered Belt', hint:'Follow the slalom through broken orbital towers.', color:0x69f6bc, speed:72, hazards:6},
  {name:'Ion Storm', hint:'Watch the drifting debris. Keep your streak alive.', color:0xb48aff, speed:82, hazards:8},
  {name:'Gravity Well', hint:'Ride the gate waves. Gold gates score double.', color:0xfc80bb, speed:92, hazards:9},
  {name:'Event Horizon', hint:'Dense debris ahead. Use boost between hazards.', color:0xff8353, speed:102, hazards:12},
  {name:'Beyond', hint:'The ascent continues. Chain gold gates for massive scores.', color:0x7bcaff, speed:108, hazards:13},
];
export function levelStart(level){return level<=6?thresholds[Math.max(0,level-1)]:CAMPAIGN_TARGET+(level-7)*40000;}
export function progressionForScore(score){
  let level=1;
  while(level<6&&score>=levelStart(level+1))level++;
  if(score>=CAMPAIGN_TARGET)level=7+Math.floor((score-CAMPAIGN_TARGET)/40000);
  const stage=stages[Math.min(level-1,5)], levelStartScore=levelStart(level),nextLevelScore=levelStart(level+1);
  return {level,levelName:stage.name,levelStartScore,nextLevelScore,levelHint:stage.hint,progress:Math.max(0,Math.min(1,(score-levelStartScore)/(nextLevelScore-levelStartScore))),baseSpeed:Math.min(115,stage.speed+Math.max(0,level-6)*2),activeHazards:stage.hazards,color:stage.color};
}
