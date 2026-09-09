import * as THREE from 'three';
import { progressionForScore, levelStart, CAMPAIGN_TARGET, streakMultiplier, gateScore } from './progression.js';
import { sweptSolidContact } from './collision.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function createGame(canvas, callbacks = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.setClearColor(0x02050c);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x030914, .0027);
  const camera = new THREE.PerspectiveCamera(66, 1, .1, 1800);
  camera.position.set(0, 2.8, 12);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1,1), .8, .55, .65);
  composer.addPass(bloom);
  const clock = new THREE.Clock();
  const state = { running: false, paused: false, score: 0, speed: 0, combo: 0, shield: 3, progress: 0, boost: 1, gates: 0, distance: 0, elapsed: 0, muted: false, ended: false };
  Object.assign(state, progressionForScore(0), {levelEvent:0,levelReward:'',phase:'intro',mode:'campaign',maxShield:3,hits:0,maxCombo:0,gatesMissed:0,upgrades:{armor:0,reactor:0,bounty:0},scoreMultiplier:1,escapeProgress:0,invincible:0});
  window.__game = { state, scene, renderer, camera, progressionForScore, levelStart };
  let targetX = 0, targetY = 0, time = 0, invincible = 0, shake = 0, lastUI = 0;
  let pointerActive = false;
  let mouseBoostHeld = false;
  const pointerClient = new THREE.Vector2(), pointerNDC = new THREE.Vector2();
  const pointerRay = new THREE.Raycaster();
  const steeringPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -2);
  const pointerHit = new THREE.Vector3();
  function updatePointerNDC() {
    const rect = canvas.getBoundingClientRect();
    pointerNDC.set((pointerClient.x - rect.left) / rect.width * 2 - 1,
      1 - (pointerClient.y - rect.top) / rect.height * 2);
  }
  function trackPointer(e) {
    if(e.pointerType !== 'touch' && !(e.buttons & 1)) mouseBoostHeld=false;
    if (state.phase !== 'playing' || !state.running || state.paused || (e.pointerType === 'touch' && !e.buttons)) return;
    const rect = canvas.getBoundingClientRect();
    if(e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;
    pointerActive = true;
    pointerClient.set(e.clientX, e.clientY);
    updatePointerNDC();
  }
  const keys = {};
  window.addEventListener('keydown', e => { keys[e.code] = true; if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault(); });
  window.addEventListener('keyup', e => keys[e.code] = false);
  window.addEventListener('blur', () => { mouseBoostHeld=false; for (const k in keys) keys[k] = false; });
  window.addEventListener('pointermove', trackPointer);
  canvas.addEventListener('pointerdown', e => {
    trackPointer(e);
    if(e.button===0 && e.pointerType!=='touch' && state.phase==='playing' && state.running && !state.paused) mouseBoostHeld=true;
  });
  window.addEventListener('pointerup', e => {if(e.button===0)mouseBoostHeld=false;});
  canvas.addEventListener('pointercancel', () => {mouseBoostHeld=false;});
  canvas.addEventListener('lostpointercapture', () => {mouseBoostHeld=false;});
  const ambient = new THREE.HemisphereLight(0x7ebcfa, 0x241329, 2.1); scene.add(ambient);
  const sunlight = new THREE.DirectionalLight(0xff9560, 3); sunlight.position.set(-8, 7, -20); scene.add(sunlight);
  const cyan = new THREE.PointLight(0x42e8ff, 35, 35); cyan.position.set(0,2,7); scene.add(cyan);
  const starGeometry = new THREE.BufferGeometry();
  const starPositions = [], starColors = [];
  for(let i=0;i<2400;i++){ const a=Math.random()*Math.PI*2, r=55+Math.random()*420; starPositions.push(Math.cos(a)*r,Math.sin(a)*r,-800+Math.random()*950); const c=new THREE.Color().setHSL(.55+Math.random()*.13,.3,.35+Math.random()*.6); starColors.push(c.r,c.g,c.b); }
  starGeometry.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3)); starGeometry.setAttribute('color',new THREE.Float32BufferAttribute(starColors,3));
  const stars = new THREE.Points(starGeometry,new THREE.PointsMaterial({size:.5,vertexColors:true,transparent:true,opacity:.8,sizeAttenuation:true,fog:false})); scene.add(stars);
  const holeUniforms = { uTime:{value:0} };
  const holeMat = new THREE.ShaderMaterial({ uniforms:holeUniforms, transparent:true, depthWrite:false, fog:false, vertexShader:`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 vUv; uniform float uTime; void main(){vec2 p=(vUv-.5)*2.; float r=length(p); float a=atan(p.y,p.x); float edge=smoothstep(.285,.315,r);float bands=sin(r*230.-uTime*1.8+sin(a*3.+uTime*.18)*2.)*.5+.5; float ring=exp(-abs(r-.34)*24.)*2.2+exp(-abs(r-.49)*9.)*.62;float flare=pow(max(0.,1.-abs(p.y)*15.),3.)*exp(-abs(p.x)*2.)*edge; vec3 col=mix(vec3(1.,.15,.025),vec3(1.,.76,.3),bands*.5+.35)*ring;col+=vec3(1.,.38,.08)*flare*1.6;float alpha=clamp(ring+flare,0.,1.)*edge*smoothstep(1.,.78,r);gl_FragColor=vec4(col,alpha);}` });
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(330,330),holeMat); hole.position.set(0, 36, -470); scene.add(hole);
  const voidMesh = new THREE.Mesh(new THREE.CircleGeometry(48,96),new THREE.MeshBasicMaterial({color:0x000003,fog:false})); voidMesh.position.set(0,36,-469.5); scene.add(voidMesh);
  const disk = new THREE.Mesh(new THREE.TorusGeometry(66, .55, 8, 180),new THREE.MeshBasicMaterial({color:0xffab65,fog:false})); disk.position.copy(hole.position); disk.rotation.z=-.15; disk.scale.y=.27; disk.position.z+=3; scene.add(disk);
  const ship = new THREE.Group(); ship.position.set(0,0,2); scene.add(ship); window.__game.ship = ship;
  const hullMat=new THREE.MeshStandardMaterial({color:0xb6c3d6,metalness:.85,roughness:.28});
  const body=new THREE.Mesh(new THREE.ConeGeometry(.48,2.7,5),hullMat); body.rotation.x=-Math.PI/2; ship.add(body);
  const wings=new THREE.Mesh(new THREE.BoxGeometry(2.1,.09,.75),hullMat); wings.position.z=.55; wings.rotation.z=.02; ship.add(wings);
  const cockpit=new THREE.Mesh(new THREE.SphereGeometry(.28,12,8),new THREE.MeshStandardMaterial({color:0x092b43,metalness:.7,roughness:.15,emissive:0x006a94,emissiveIntensity:1.5})); cockpit.scale.set(1,.6,1.8); cockpit.position.set(0,.26,0); ship.add(cockpit);
  const flameMat=new THREE.MeshBasicMaterial({color:0x58e5ff,transparent:true,opacity:.95});
  const flames=[];
  for(const x of [-.65,.65]){ const flame=new THREE.Mesh(new THREE.ConeGeometry(.15,2.1,10),flameMat);flame.rotation.x=Math.PI/2;flame.position.set(x,0,1.65);ship.add(flame);flames.push(flame); }
  new GLTFLoader().load('/assets/ship.glb', gltf => {const model=gltf.scene;const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());model.scale.setScalar(2.6/Math.max(size.x,size.y,size.z));box.setFromObject(model);model.position.sub(box.getCenter(new THREE.Vector3()));ship.remove(body,wings,cockpit);ship.add(model);}, undefined, ()=>{});
  const gateMat=new THREE.MeshStandardMaterial({color:0x37dfff,emissive:0x19cfff,emissiveIntensity:3,roughness:.2,metalness:.4});
  const goldGateMat=new THREE.MeshStandardMaterial({color:0xffd869,emissive:0xffb525,emissiveIntensity:3.5,roughness:.2,metalness:.65});
  let gateSequence=0;
  const gateOuterMat=new THREE.MeshStandardMaterial({color:0x526679,metalness:.9,roughness:.3});
  const gates=[];
  window.__game.gates = gates;
  const gateHitRadius = 4.4; // Ring radius 2.9 + ship half-width 1.3 + 0.2 grace.
  const gateDepthGrace = 2.4;
  window.__game.gateRules = { radius: gateHitRadius, depthGrace: gateDepthGrace };
  const gateBounds = {minX:-6,maxX:6,minY:-3,maxY:3};
  const gateBoundsCamera = new THREE.PerspectiveCamera(66,1,.1,100);
  const gateBoundsRay = new THREE.Raycaster();
  const gateBoundsPlane = new THREE.Plane(new THREE.Vector3(0,0,1),-2);
  function updateGateBounds(){
    // The narrower, unboosted neutral view defines an area reachable on every device.
    gateBoundsCamera.aspect=camera.aspect;
    gateBoundsCamera.position.set(0,2.6,12);
    gateBoundsCamera.lookAt(0,.8,-35);
    gateBoundsCamera.updateProjectionMatrix();gateBoundsCamera.updateMatrixWorld(true);
    const low=new THREE.Vector3(), high=new THREE.Vector3();
    gateBoundsRay.setFromCamera(new THREE.Vector2(-.72,-.72),gateBoundsCamera);
    gateBoundsRay.ray.intersectPlane(gateBoundsPlane,low);
    gateBoundsRay.setFromCamera(new THREE.Vector2(.72,.72),gateBoundsCamera);
    gateBoundsRay.ray.intersectPlane(gateBoundsPlane,high);
    Object.assign(gateBounds,{minX:Math.max(-6.8,low.x),maxX:Math.min(6.8,high.x),minY:Math.max(-3.7,low.y),maxY:Math.min(3.7,high.y)});
    for(const gate of gates){gate.position.x=THREE.MathUtils.clamp(gate.position.x,gateBounds.minX,gateBounds.maxX);gate.position.y=THREE.MathUtils.clamp(gate.position.y,gateBounds.minY,gateBounds.maxY);}
  }
  function placeGate(gate,xWave,yWave,z){
    gate.position.set(THREE.MathUtils.lerp(gateBounds.minX,gateBounds.maxX,(xWave+1)/2),THREE.MathUtils.lerp(gateBounds.minY,gateBounds.maxY,(yWave+1)/2),z);
  }
  function configureGate(gate,sequence,z){
    let x=Math.sin(sequence*.85)*.42,y=Math.cos(sequence*.7)*.4;
    if(state.level>=2){x=(sequence%2?1:-1)*.8;y=Math.sin(sequence*.75)*.65;}
    if(state.level>=4){x=Math.sin(sequence*.9)*.92;y=Math.cos(sequence*.9)*(sequence%2?-.85:.85);}
    placeGate(gate,x,y,z);
    gate.userData.bonus=state.level>=4&&sequence%3===2;
    gate.children[0].material=gate.userData.bonus?goldGateMat:gateMat;
    gate.userData.passed=false;gate.visible=true;
  }
  for(let i=0;i<9;i++){
    const gate=new THREE.Group();const torus=new THREE.Mesh(new THREE.TorusGeometry(2.9,.085,8,64),gateMat);gate.add(torus);
    for(let j=0;j<8;j++){const piece=new THREE.Mesh(new THREE.BoxGeometry(.24,.72,.32),gateOuterMat);const a=j/8*Math.PI*2;piece.position.set(Math.cos(a)*3.05,Math.sin(a)*3.05,0);piece.rotation.z=a-Math.PI/2;gate.add(piece);}
    placeGate(gate,Math.sin(i*1.13),Math.cos(i*.87),-65-i*46);if(i===0)gate.position.set(0,0,-65);gate.userData={passed:false,index:i,bonus:false};scene.add(gate);gates.push(gate);
  }
  const stoneMat=new THREE.MeshStandardMaterial({color:0x101b2c,metalness:.65,roughness:.55});
  const rimMat=new THREE.MeshStandardMaterial({color:0x29475d,emissive:0xc25c21,emissiveIntensity:1.2,metalness:.9,roughness:.4});
  const debris=[];
  for(let i=0;i<68;i++){
    const g=new THREE.Group(); const height=3+Math.random()*16, width=1+Math.random()*3;
    const rock=new THREE.Mesh(new THREE.BoxGeometry(width,height,width*1.4),stoneMat);g.add(rock);
    const trim=new THREE.Mesh(new THREE.BoxGeometry(width+.03,.055,width*1.4+.03),rimMat);trim.position.y=height*.28;g.add(trim);
    g.position.set((Math.random()<.5?-1:1)*(12+Math.random()*34),(Math.random()-.5)*42,-30-Math.random()*490);g.rotation.set(Math.random()*.35,Math.random(),Math.random()*.5);g.userData.spin=(Math.random()-.5)*.07;scene.add(g);debris.push(g);
  }
  new GLTFLoader().load('/assets/ruin.glb', gltf => {
    const source = gltf.scene;
    source.traverse(mesh=>{if(mesh.isMesh&&mesh.material?.emissive&&mesh.material.emissive.getHex()!==0){mesh.material=mesh.material.clone();mesh.material.emissive.set(0xe2652e);}});
    const size = new THREE.Box3().setFromObject(source).getSize(new THREE.Vector3());
    source.scale.setScalar(14 / Math.max(size.x,size.y,size.z));
    const center = new THREE.Box3().setFromObject(source).getCenter(new THREE.Vector3());
    source.position.sub(center);
    for (let i=0;i<12;i++) {
      const carrier = new THREE.Group();carrier.add(source.clone(true));
      carrier.position.set((i%2?-1:1)*(17+(i%3)*9), (i%3-1)*11,-60-i*40);
      carrier.rotation.set(i*.23,i*.72,i*.32);carrier.userData.spin=(i%2?1:-1)*.025;
      scene.add(carrier);debris.push(carrier);
    }
  },undefined,()=>{});
  const hazards=[];
  for(let i=0;i<13;i++) {const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(1,0),stoneMat);mesh.scale.set(1.1+Math.random(),1+Math.random()*1.3,1.5);mesh.position.set((Math.random()-.5)*19,(Math.random()-.5)*11,-75-i*38);mesh.userData.hit=false;scene.add(mesh);hazards.push(mesh);const edge=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry),new THREE.LineBasicMaterial({color:0xff693d,transparent:true,opacity:.9}));mesh.add(edge);}
  window.__game.hazards=hazards;window.__game.debris=debris;
  const previousShipPosition=new THREE.Vector3(),obstacleDelta=new THREE.Vector3();
  function respawnHazard(h,index,z){
    const x=(Math.random()-.5)*16,y=(Math.random()-.5)*9;
    h.position.set(x,y,z);
    Object.assign(h.userData,{hit:false,baseX:x,baseY:y,phase:index*1.9,active:index<state.activeHazards});
    h.visible=h.userData.active;
  }
  function syncHazards(){
    hazards.forEach((h,i)=>{
      const enabled=i<state.activeHazards;
      if(enabled&&!h.userData.active)respawnHazard(h,i,-180-i*23);
      h.userData.active=enabled;h.visible=enabled;
    });
  }
  hazards.forEach((h,i)=>respawnHazard(h,i,-150-i*38));
  const paletteTarget=new THREE.Color(state.color);
  let levelPulse=0,pendingUpgrades=0,lastHullWarning=-10;
  function snapshot(){state.streakMultiplier=streakMultiplier(state.combo);return {...state,upgrades:{...state.upgrades},invincible};}
  function publish(){state.invincible=invincible;callbacks.onUpdate?.(snapshot());}
  function upgradeChoices(){
    return [
      {id:'armor',name:'Hull plating',description:'+1 maximum hull and repair all damage.'},
      {id:'reactor',name:'Overdrive reactor',description:'+25% boost recovery. Stacks up to three times.'},
      {id:'bounty',name:'Bounty scanner',description:'+15% score from every gate. Stacks up to three times.'}
    ].filter(choice=>state.upgrades[choice.id]<3);
  }
  function chooseUpgrade(id){
    if(state.phase!=='upgrade'||!upgradeChoices().some(choice=>choice.id===id))return false;
    state.upgrades[id]++;
    if(id==='armor'){state.maxShield=Math.min(6,state.maxShield+1);state.shield=state.maxShield;}
    state.scoreMultiplier=1+state.upgrades.bounty*.15;
    pendingUpgrades=Math.max(0,pendingUpgrades-1);
    invincible=2;state.boost=1;
    if(pendingUpgrades>0&&upgradeChoices().length){publish();callbacks.onUpgrade?.({level:state.level,levelName:state.levelName,choices:upgradeChoices(),reward:state.levelReward});return true;}
    state.phase='playing';state.paused=false;
    clock.getDelta();upgradeInstallSound();publish();return true;
  }
  function beginEscape(){
    if(state.phase==='escape'||state.ended)return;
    Object.assign(state,progressionForScore(CAMPAIGN_TARGET-1),{progress:1});state.phase='escape';mouseBoostHeld=false;state.paused=false;state.escapeProgress=0;pointerActive=false;
    invincible=6;state.boost=1;state.lastEvent='escape';state.eventTime=time;
    levelPulse=2;sound(180,'sine',2,.1);sound(720,'triangle',2,.025);publish();
  }
  function updateProgression(reward=true){
    if(state.phase==='escape'||state.phase==='ended'||state.phase==='upgrade')return;
    if(state.mode==='campaign'&&state.score>=CAMPAIGN_TARGET){beginEscape();return;}
    const previousLevel=state.level;
    Object.assign(state,progressionForScore(state.score));
    if(state.level>previousLevel&&reward){
      const gained=state.level-previousLevel,previousShield=state.shield;
      state.shield=Math.min(state.maxShield,state.shield+gained);state.boost=1;invincible=2;
      state.levelEvent+=gained;
      state.levelReward=state.shield>previousShield?`+${state.shield-previousShield} HULL · BOOST REFILLED`:'HULL FULL · BOOST REFILLED';
      levelPulse=1.5;paletteTarget.set(state.color);
      burst(ship.position,state.color);sectorClearSound();
      syncHazards();
      const choices=upgradeChoices();
      if(choices.length){pendingUpgrades=gained;state.phase='upgrade';mouseBoostHeld=false;state.paused=true;silenceEngine();publish();callbacks.onUpgrade?.({level:state.level,levelName:state.levelName,choices,reward:state.levelReward});}
    }
  }
  function damage(obstacle){
    if(state.phase!=='playing'||!state.running||invincible>0||obstacle.userData.hit)return false;
    obstacle.userData.hit=true;obstacle.visible=false;
    state.shield=Math.max(0,state.shield-1);state.hits++;state.combo=0;invincible=1.05;shake=.85;
    state.lastEvent='hit';state.eventTime=time;
    burst(ship.position,0xff5935);sound(55,'sawtooth',.5,.14);publish();
    if(state.shield===0)end(false);
    return true;
  }
  window.__game.updateProgression=updateProgression;
  const trailPos=new Float32Array(180*6);for(let i=0;i<180;i++){let x=(Math.random()-.5)*70,y=(Math.random()-.5)*40,z=-Math.random()*220;trailPos.set([x,y,z,x,y,z-1.5],i*6);}
  const trailGeo=new THREE.BufferGeometry();trailGeo.setAttribute('position',new THREE.BufferAttribute(trailPos,3));const trailMat=new THREE.LineBasicMaterial({color:0x6cb9d9,transparent:true,opacity:.23});const trails=new THREE.LineSegments(trailGeo,trailMat);scene.add(trails);
  const particles=[];const particleGeo=new THREE.SphereGeometry(.055,4,4);const particleMat=new THREE.MeshBasicMaterial({color:0x68efff});
  function burst(pos,color){for(let i=0;i<20;i++){const m=new THREE.Mesh(particleGeo,particleMat.clone());m.material.color.set(color);m.position.copy(pos);scene.add(m);particles.push({mesh:m,vel:new THREE.Vector3((Math.random()-.5)*14,(Math.random()-.5)*14,Math.random()*15),life:1});}}
  let audio, engineGain, engineOsc, engineSub;
  function ensureEngine(){
    try {
      audio ||= new (window.AudioContext||window.webkitAudioContext)();
      if(audio.state==='suspended') audio.resume();
      if(engineGain) return;
      engineGain=audio.createGain();engineGain.gain.value=0;
      const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=260;filter.Q.value=.5;
      engineOsc=audio.createOscillator();engineOsc.type='sawtooth';engineOsc.frequency.value=49;
      engineSub=audio.createOscillator();engineSub.type='sine';engineSub.frequency.value=36.7;
      engineOsc.connect(filter);engineSub.connect(filter);filter.connect(engineGain).connect(audio.destination);engineOsc.start();engineSub.start();
    } catch {}
  }
  const celebrationVoices=new Set();
  function positiveCue(notes){
    if(state.muted)return;
    try{
      audio ||= new (window.AudioContext||window.webkitAudioContext)();
      if(audio.state==='suspended')audio.resume().catch(()=>{});
      const now=audio.currentTime;
      for(const [frequency,offset,duration,volume] of notes){
        const oscillator=audio.createOscillator(),gain=audio.createGain();
        const at=now+offset;
        oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,at);
        gain.gain.setValueAtTime(.0001,at);
        gain.gain.exponentialRampToValueAtTime(volume,at+.012);
        gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
        oscillator.connect(gain).connect(audio.destination);
        const voice={oscillator,gain};celebrationVoices.add(voice);
        oscillator.onended=()=>{celebrationVoices.delete(voice);oscillator.disconnect();gain.disconnect();};
        oscillator.start(at);oscillator.stop(at+duration+.015);
      }
    }catch{}
  }
  function sectorClearSound(){
    // C5–E5–G5–C6 ascends into a soft C-major resolution; no falling pitch.
    positiveCue([
      [523.25,0,.24,.025],[659.25,.13,.24,.025],
      [783.99,.26,.28,.024],[1046.5,.39,.35,.022],
      [523.25,.58,.62,.008],[659.25,.58,.62,.008],[783.99,.58,.62,.009]
    ]);
  }
  function upgradeInstallSound(){
    positiveCue([[659.25,0,.16,.022],[783.99,.075,.18,.023],[1046.5,.15,.23,.024]]);
  }
  function silenceCelebration(){
    for(const voice of celebrationVoices){
      try{voice.gain.gain.cancelScheduledValues(audio.currentTime);voice.gain.gain.setValueAtTime(.0001,audio.currentTime);voice.oscillator.stop(audio.currentTime+.01);}catch{}
    }
    celebrationVoices.clear();
  }
  function silenceEngine(){if(engineGain)engineGain.gain.setTargetAtTime(0,audio.currentTime,.08);}
  function sound(freq,type='sine',duration=.15,volume=.06){if(state.muted)return;try{audio ||= new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(freq*.45,audio.currentTime+duration);g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}catch{}}
  function end(win=false){
    if(state.ended)return;mouseBoostHeld=false;silenceEngine();state.running=false;state.paused=false;state.ended=true;state.phase='ended';
    let best=state.score;try{best=Math.max(state.score,Number(localStorage.getItem('event-horizon-best')||0));localStorage.setItem('event-horizon-best',best);}catch{}
    const accuracy=state.gates/Math.max(1,state.gates+state.gatesMissed);
    const rank=win&&state.hits<=2&&accuracy>=.85?'S':win&&state.hits<=5?'A':win||state.level>=4?'B':'C';
    const summary=Object.freeze({runId:state.runId,score:state.score,gates:state.gates,distance:Math.round(state.distance),best,win,mode:state.mode,level:state.level,levelName:state.levelName,name:state.levelName,hits:state.hits,maxCombo:state.maxCombo,gatesMissed:state.gatesMissed,elapsed:state.elapsed,rank,maxShield:state.maxShield,shield:state.shield,upgrades:Object.freeze({...state.upgrades}),scoreMultiplier:state.scoreMultiplier});
    window.__game.lastSummary=summary;publish();callbacks.onEnd?.(summary);
  }
  function start(options={}){
    mouseBoostHeld=false;
    ensureEngine();Object.assign(state,{runId:globalThis.crypto?.randomUUID?.()||`run-${Date.now()}-${Math.random()}`,running:true,paused:false,ended:false,phase:'playing',mode:options.mode==='endless'?'endless':'campaign',score:0,speed:310,combo:0,shield:3,maxShield:3,hits:0,maxCombo:0,gatesMissed:0,upgrades:{armor:0,reactor:0,bounty:0},scoreMultiplier:1,escapeProgress:0,boost:1,gates:0,distance:0,elapsed:0,levelEvent:0,levelReward:'',lastEvent:null,eventTime:0},progressionForScore(0));
    pendingUpgrades=0;lastHullWarning=-10;paletteTarget.set(state.color);gateMat.color.set(state.color);gateMat.emissive.set(state.color);levelPulse=0;
    ship.position.set(0,0,2);ship.rotation.set(0,0,0);previousShipPosition.copy(ship.position);targetX=targetY=0;pointerActive=false;shake=0;invincible=1;gateSequence=9;
    for(const key in keys)keys[key]=false;
    camera.position.set(0,2.6,12);camera.fov=66;camera.updateProjectionMatrix();renderer.toneMappingExposure=1.15;bloom.strength=.8;
    gates.forEach((g,i)=>{configureGate(g,i,-65-i*46);if(i===0)g.position.set(0,0,-65);});
    hazards.forEach((h,i)=>respawnHazard(h,i,-150-i*38));
    debris.forEach((g,i)=>{g.userData.hit=false;g.visible=true;g.position.z=-40-(i*29)%480;});
    for(const p of particles){scene.remove(p.mesh);p.mesh.material.dispose();}particles.length=0;
    window.__game.lastSummary=null;sound(160,'sine',.6);publish();
  }
  function resize(){const w=canvas.clientWidth||innerWidth,h=canvas.clientHeight||innerHeight;renderer.setSize(w,h,false);composer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();if(pointerActive)updatePointerNDC();updateGateBounds();}window.addEventListener('resize',resize);resize();
  function tick(){requestAnimationFrame(tick);const dt=Math.min(clock.getDelta(),.04);if(state.paused)return;time+=dt;holeUniforms.uTime.value=time;
    if(state.phase==='playing')updateProgression();
    if(state.paused)return;
    previousShipPosition.copy(ship.position);
    const escaping=state.phase==='escape';const active=state.running&&state.phase==='playing';const boosting=active&&(keys.Space||mouseBoostHeld)&&state.boost>.01;const velocity=escaping?180+state.escapeProgress*400:active?(state.baseSpeed)*(boosting?1.75:1):13;
    state.speed=active?Math.round(velocity*5):0;
    if(engineGain){engineGain.gain.setTargetAtTime((active||escaping)&&!state.muted?(escaping?.045:boosting?.035:.02):0,audio.currentTime,.12);engineOsc.frequency.setTargetAtTime(escaping?100+state.escapeProgress*100:boosting?82:49+Math.min(state.level,10)*2,audio.currentTime,.2);engineSub.frequency.setTargetAtTime(boosting?51:36.7,audio.currentTime,.2);}
    if(active){state.elapsed+=dt;state.distance+=velocity*dt;state.boost=THREE.MathUtils.clamp(state.boost+(boosting?-.31:.14*(1+.25*state.upgrades.reactor))*dt,0,1);invincible=Math.max(0,invincible-dt);
      const keyX=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0),keyY=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0);
      if(keyX||keyY){
        if(pointerActive){targetX=ship.position.x;targetY=ship.position.y;}
        pointerActive=false;targetX+=keyX*15*dt;targetY+=keyY*12*dt;
      }
      if(!pointerActive){
        targetX=THREE.MathUtils.clamp(targetX,-10,10);targetY=THREE.MathUtils.clamp(targetY,-5.8,5.8);
        const dx=targetX-ship.position.x;
        ship.position.x+=dx*(1-Math.exp(-8*dt));ship.position.y+=(targetY-ship.position.y)*(1-Math.exp(-8*dt));
        ship.rotation.z=THREE.MathUtils.lerp(ship.rotation.z,-dx*.11,dt*8);ship.rotation.x=THREE.MathUtils.lerp(ship.rotation.x,(targetY-ship.position.y)*.05,dt*8);
      }
    } else if(state.phase==='intro'){ship.position.x=Math.sin(time*.45)*1.4;ship.position.y=Math.sin(time*.8)*.45;ship.rotation.z=Math.cos(time*.45)*-.12;}
    // Finalize the camera before projection and collision checks. In pointer mode
    // the camera follows a neutral anchor, so steering cannot move its own target.
    const mouseSteering=active&&pointerActive;
    const cameraAnchorX=mouseSteering?0:ship.position.x;
    const cameraAnchorY=mouseSteering?0:ship.position.y;
    shake=Math.max(0,shake-dt);
    camera.position.x=THREE.MathUtils.lerp(camera.position.x,cameraAnchorX*.42,dt*3);
    camera.position.y=THREE.MathUtils.lerp(camera.position.y,cameraAnchorY*.42+2.6,dt*3);
    camera.position.z=THREE.MathUtils.lerp(camera.position.z,boosting?13.8:12,dt*3);
    camera.lookAt(cameraAnchorX*.6,cameraAnchorY*.6+.8,-35);
    if(!mouseSteering)camera.rotation.z+=ship.rotation.z*.12;
    if(shake){camera.position.x+=(Math.random()-.5)*shake;camera.position.y+=(Math.random()-.5)*shake;}
    camera.fov=THREE.MathUtils.lerp(camera.fov,boosting?78:66,dt*4);
    camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
    if(mouseSteering){
      updatePointerNDC();
      pointerRay.setFromCamera(pointerNDC,camera);
      steeringPlane.constant=-ship.position.z;
      if(pointerRay.ray.intersectPlane(steeringPlane,pointerHit)){
        const dx=pointerHit.x-ship.position.x;
        ship.position.copy(pointerHit);
        targetX=ship.position.x;targetY=ship.position.y;
        ship.rotation.z=THREE.MathUtils.lerp(ship.rotation.z,THREE.MathUtils.clamp(-dx*.11,-.4,.4),dt*8);
        ship.rotation.x=THREE.MathUtils.lerp(ship.rotation.x,0,dt*8);
      }
    }
    if(escaping){
      state.escapeProgress=Math.min(1,state.escapeProgress+dt/5);
      ship.position.x=THREE.MathUtils.lerp(ship.position.x,0,dt*2);ship.position.y=THREE.MathUtils.lerp(ship.position.y,0,dt*2);ship.position.z=2-state.escapeProgress*55;
      ship.rotation.z=Math.sin(time*2)*.1;
      camera.position.set(Math.sin(time)*state.escapeProgress*.35,2.6,12+state.escapeProgress*8);
      camera.lookAt(0,0,ship.position.z-30);camera.fov=66+state.escapeProgress*36;camera.updateProjectionMatrix();
      renderer.toneMappingExposure=1.15+Math.pow(state.escapeProgress,5)*3.5;
    }
    ship.visible=true;
    ship.traverse(mesh=>{if(mesh.isMesh&&mesh.material){mesh.material.transparent=true;mesh.material.opacity=active&&invincible>0?.55+.35*Math.abs(Math.sin(time*14)):1;}});
flames.forEach(f=>{f.scale.y=(boosting?2.2:1)+Math.random()*.25;});
    for(const g of gates){
      const previousZ=g.position.z;
      g.position.z+=velocity*dt;g.rotation.z+=dt*.12;
      if(state.phase==='playing'&&state.running&&!g.userData.passed){
        // Sweep through the entire grace slab so boosted frames cannot skip a gate.
        const overlapsDepth=previousZ<=ship.position.z+gateDepthGrace&&g.position.z>=ship.position.z-gateDepthGrace;
        const overlapsShip=Math.hypot(g.position.x-ship.position.x,g.position.y-ship.position.y)<=gateHitRadius;
        if(overlapsDepth&&overlapsShip){
          g.userData.passed=true;
          g.visible=false;state.combo++;state.maxCombo=Math.max(state.maxCombo,state.combo);state.gates++;state.lastEvent=g.userData.bonus?"bonus":"gate";state.eventTime=time;
          state.score+=gateScore({combo:state.combo,boosted:boosting,bonus:g.userData.bonus,scoreMultiplier:state.scoreMultiplier});
          publish();updateProgression();
          burst(new THREE.Vector3(ship.position.x,ship.position.y,-1),g.userData.bonus?0xffce55:state.color);if(state.phase==='playing')sound(360+state.combo*50,'sine',.2);
        }else if(g.position.z>ship.position.z+gateDepthGrace){
          // A near miss can still be rescued until the gate has fully passed.
          g.userData.passed=true;state.combo=0;state.gatesMissed++;publish();
        }
      }
      if(g.position.z>22){
        configureGate(g,gateSequence++,g.position.z-414);
        g.userData.passed=false;
      }
    }
    for(const g of debris){
      const oldPosition=g.position.clone();g.position.z+=velocity*dt;g.rotation.z+=g.userData.spin*dt;
      obstacleDelta.subVectors(g.position,oldPosition);
      if(state.phase==='playing'&&g.visible&&!g.userData.hit&&Math.abs(g.position.z-ship.position.z)<35&&sweptSolidContact(g,previousShipPosition,ship.position,obstacleDelta))damage(g);
      if(g.position.z>35){g.position.z-=520;g.userData.hit=false;g.visible=true;}
    }
    for(const h of hazards){
      if(!h.userData.active)continue;
      const oldPosition=h.position.clone();
      h.position.z+=velocity*dt;h.rotation.x+=dt*.17;h.rotation.y+=dt*.13;
      if(state.level>=3){
        h.position.x=THREE.MathUtils.clamp(h.userData.baseX+Math.sin(time*.55+h.userData.phase)*1.05,-8.7,8.7);
        h.position.y=THREE.MathUtils.clamp(h.userData.baseY+Math.cos(time*.42+h.userData.phase)*.6,-5,5);
      }
      obstacleDelta.subVectors(h.position,oldPosition);
      if(state.phase==='playing'&&h.visible&&!h.userData.hit&&Math.abs(h.position.z-ship.position.z)<15&&sweptSolidContact(h,previousShipPosition,ship.position,obstacleDelta))damage(h);
      if(h.position.z>25)respawnHazard(h,hazards.indexOf(h),h.position.z-494);
    }
    for(let i=0;i<180;i++){let n=i*6;trailPos[n+2]+=velocity*dt;trailPos[n+5]=trailPos[n+2]-(boosting?6:1.8);if(trailPos[n+2]>18)trailPos[n+2]=-220;}trailGeo.attributes.position.needsUpdate=true;trailMat.opacity=escaping?.85:boosting?.5:.19;
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.mesh.position.addScaledVector(p.vel,dt);p.mesh.scale.setScalar(Math.max(0,p.life)*2);if(p.life<=0){scene.remove(p.mesh);p.mesh.material.dispose();particles.splice(i,1);}}
    if(active&&state.shield===1&&time-lastHullWarning>2.2){sound(145,'triangle',.18,.025);lastHullWarning=time;}
    levelPulse=Math.max(0,levelPulse-dt);
    gateMat.color.lerp(paletteTarget,dt*.8);gateMat.emissive.lerp(paletteTarget,dt*.8);
    cyan.color.lerp(paletteTarget,dt*.8);trailMat.color.lerp(paletteTarget,dt*.5);
    bloom.strength=THREE.MathUtils.lerp(bloom.strength,(escaping?1.3+state.escapeProgress*1.5:boosting?1.05:.8)+levelPulse*.2,dt*3);stars.rotation.z=time*.002;
    if(time-lastUI>.09){publish();lastUI=time;}composer.render();if(escaping&&state.escapeProgress>=1)end(true);
  }
  function returnToMenu(){mouseBoostHeld=false;state.running=false;state.paused=false;state.ended=false;state.phase='intro';ship.position.set(0,0,2);pointerActive=false;invincible=0;renderer.toneMappingExposure=1.15;silenceEngine();publish();}
  const api={start,chooseUpgrade,returnToMenu,pause(){mouseBoostHeld=false;if(state.phase!=='playing')return;state.paused=true;silenceEngine();publish();},resume(){if(state.phase!=='playing')return;state.paused=false;clock.getDelta();publish();},setMuted(value){state.muted=!!value;if(state.muted){silenceEngine();silenceCelebration();}}};
  window.__game.api=api;window.__game.sweptSolidContact=sweptSolidContact;window.__game.damage=damage;
  tick();callbacks.onReady?.();
  return api;
}
