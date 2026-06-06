// ================================================================
// BURJ KHALIFA CLIMBER — Year 4 & 5 · Inside the Building Edition
// ================================================================
'use strict';
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
const W = canvas.width;   // 480
const H = canvas.height;  // 600

const WORLD_W  = 1920;
const GROUND_Y = 1380;
const GOAL_Y   = 180;

let cameraX = 0, cameraY = 0;
let state = 'title', diamonds = 0, gameLevel = 1;
let selectedSkin = 0, ownedSkins = [0];
let zoneTimer = 0, factTimer = 0, buildingFlash = 0;
let fireworks = [], fireworkTimer = 0;
let currentFloor = 1, lastZoneId = -1;
let screenShake = 0;
let hitFlash = 0;
let combo = 0, comboTimer = 0, comboMax = 0;
let dashTrail = [];
let switches = [];
function triggerShake(amt){ screenShake = Math.min(14, screenShake + amt); }

function sx(wx){ return wx - cameraX; }
function sw(wy){ return wy - cameraY; }
function lerp(a,b,t){ return a+(b-a)*t; }

// ── KEY INVENTORY ────────────────────────────────────────────
const keyInv = {bronze:0, silver:0, gold:0};
const KEY_COLORS = {bronze:'#cd7f32', silver:'#c0c0c0', gold:'#FFD700'};

// ── ZONES (based on x progress) ──────────────────────────────
const ZONES = [
  {id:0, name:'🏜️ Ground Lobby',      xStart:0,    desc:'Floors 1–7 · Welcome to the Burj Khalifa!', sky:'#060a14'},
  {id:1, name:'🏨 Armani Hotel',       xStart:320,  desc:'Floors 8–37 · Luxury hotel & residences',   sky:'#07091a'},
  {id:2, name:'🏠 Residential',        xStart:640,  desc:'Floors 38–80 · 900 luxury apartments',      sky:'#050818'},
  {id:3, name:'💼 Corporate Offices',  xStart:960,  desc:'Floors 81–124 · Business hub',              sky:'#040616'},
  {id:4, name:'🔭 At The Top',         xStart:1280, desc:'Floors 125–148 · Observation deck',         sky:'#030510'},
  {id:5, name:'⚡ The Spire',          xStart:1600, desc:'Floors 149–163 · Steel spire — almost there!', sky:'#020308'},
];
function getZone(x){ let z=ZONES[0]; for(const zz of ZONES) if(x>=zz.xStart) z=zz; return z; }

// ── QUESTIONS ────────────────────────────────────────────────
const QUESTIONS = [
  {cat:'maths',y:4,q:"The Burj Khalifa has 163 floors. You climb 40. How many remain?",a:123,opts:[113,123,133,143],fact:"The Burj Khalifa opened on 4th January 2010!"},
  {cat:'maths',y:4,q:"A lift travels 10 floors per minute. Floors in 8 minutes?",a:80,opts:[70,80,90,88],fact:"The Burj Khalifa has 57 high-speed lifts!"},
  {cat:'maths',y:4,q:"The building is 828 m tall. Round to the nearest 100.",a:800,opts:[700,800,900,830],fact:"828 m — the world's tallest building!"},
  {cat:'maths',y:4,q:"Each floor is about 5 m high. How tall are 12 floors?",a:60,opts:[50,55,60,65],fact:"The observation deck is on floor 148!"},
  {cat:'maths',y:4,q:"57 lifts. 9 being serviced. How many work?",a:48,opts:[46,47,48,49],fact:"Lifts travel at 10 metres per second!"},
  {cat:'maths',y:4,q:"What is 7 × 8?",a:56,opts:[48,54,56,64],fact:"Construction took 6 years, 2004–2010!"},
  {cat:'maths',y:4,q:"What is 9 × 6?",a:54,opts:[45,52,54,56],fact:"22,000 workers built the Burj Khalifa!"},
  {cat:'maths',y:4,q:"What is 144 ÷ 12?",a:12,opts:[10,11,12,13],fact:"The Burj Khalifa cost $1.5 billion!"},
  {cat:'maths',y:4,q:"A worker earns £12 per hour. How much for 6 hours?",a:72,opts:[60,66,72,78],fact:"Over 12,000 workers on site daily at peak!"},
  {cat:'maths',y:4,q:"¼ of 160 floors are offices. How many floors?",a:40,opts:[35,38,40,45],fact:"The Burj Khalifa has 900 luxury apartments!"},
  {cat:'maths',y:5,q:"15% of 200 is how much?",a:30,opts:[20,25,30,35],fact:"A hotel occupies floors 1–37!"},
  {cat:'maths',y:5,q:"Tourist on floor 124. Goes down 47 floors. Which floor?",a:77,opts:[67,72,77,82],fact:"Floor 124 has the 'At the Top' deck!"},
  {cat:'maths',y:5,q:"What is 828 × 10?",a:8280,opts:[828,8280,82800,8028],fact:"The spire alone is 200 metres tall!"},
  {cat:'maths',y:5,q:"Area of a 60 m × 60 m floor?",a:3600,opts:[240,1200,3600,4000],fact:"Total floor area is 344,000 m²!"},
  {cat:'maths',y:5,q:"Dubai summer 42°C, winter 15°C. Difference?",a:27,opts:[23,25,27,29],fact:"Dubai has an Arabian Desert climate!"},
  {cat:'maths',y:5,q:"What is 6² (six squared)?",a:36,opts:[12,30,36,42],fact:"The Burj Khalifa has a Y-shaped floor plan!"},
  {cat:'maths',y:5,q:"What is 1000 − 163?",a:837,opts:[827,837,847,857],fact:"163 floors above ground — a world record!"},
  {cat:'maths',y:5,q:"What is ¾ of 160?",a:120,opts:[100,110,120,130],fact:"27 setback levels spiral up the tower!"},
  {cat:'trivia',y:4,q:"In which country is the Burj Khalifa?",a:'UAE',opts:['Qatar','UAE','Saudi Arabia','Bahrain'],fact:"UAE stands for United Arab Emirates!"},
  {cat:'trivia',y:4,q:"What city is the Burj Khalifa in?",a:'Dubai',opts:['Abu Dhabi','Dubai','Sharjah','Doha'],fact:"Dubai is the most visited city in the UAE!"},
  {cat:'trivia',y:4,q:"How many floors does the Burj Khalifa have?",a:163,opts:[150,163,175,188],fact:"163 floors above ground — a world record!"},
  {cat:'trivia',y:4,q:"What shape is the Burj Khalifa's floor plan?",a:'Y-shape',opts:['Square','Circle','Y-shape','Triangle'],fact:"The Y-shape helps it resist desert winds!"},
  {cat:'trivia',y:4,q:"Who designed the Burj Khalifa?",a:'Adrian Smith',opts:['Norman Foster','Adrian Smith','Zaha Hadid','Renzo Piano'],fact:"Designed for Skidmore, Owings & Merrill!"},
  {cat:'trivia',y:5,q:"In what year did the Burj Khalifa open?",a:2010,opts:[2008,2009,2010,2011],fact:"It opened on 4 January 2010!"},
  {cat:'trivia',y:5,q:"How tall is the Burj Khalifa in metres?",a:828,opts:[800,818,828,848],fact:"828 metres — taller than any other building!"},
  {cat:'trivia',y:5,q:"What was it called during construction?",a:'Burj Dubai',opts:['Tower Dubai','Burj Dubai','Al Khalifa Tower','Sky Dubai'],fact:"The name changed at the opening ceremony!"},
  {cat:'trivia',y:5,q:"How many windows does the Burj Khalifa have?",a:24348,opts:[10000,18000,24348,30000],fact:"Cleaning all the windows takes 3 months!"},
  {cat:'trivia',y:5,q:"How fast do the express lifts travel (m/s)?",a:10,opts:[5,8,10,15],fact:"That's 36 km/h — very fast for a lift!"},
  {cat:'trivia',y:5,q:"What is Dubai's currency?",a:'Dirham',opts:['Riyal','Dinar','Dirham','Pound'],fact:"AED = Arab Emirates Dirham!"},
  {cat:'trivia',y:5,q:"What desert surrounds Dubai?",a:'Arabian Desert',opts:['Sahara','Arabian Desert','Gobi','Kalahari'],fact:"Dubai sits on the edge of the Arabian Desert!"},
  {cat:'maths',y:4,q:"What is 8 × 9?",a:72,opts:[63,70,72,81],fact:"22,000 workers built the Burj Khalifa!"},
  {cat:'maths',y:4,q:"163 floors total. 80 are apartments. How many non-apartment floors?",a:83,opts:[73,83,93,103],fact:"The Armani Hotel is on floors 1–37!"},
  {cat:'maths',y:4,q:"Round 828 metres to the nearest 10.",a:830,opts:[820,825,830,840],fact:"828 m — the world's tallest structure!"},
  {cat:'maths',y:4,q:"A window cleaner cleans 50 windows per day. How many in 5 days?",a:250,opts:[200,250,300,350],fact:"Cleaning all 24,348 windows takes 3 months!"},
  {cat:'maths',y:4,q:"What is 11 × 7?",a:77,opts:[66,70,77,84],fact:"Construction of the Burj Khalifa took 6 years!"},
  {cat:'maths',y:5,q:"What is 828 ÷ 6?",a:138,opts:[120,132,138,144],fact:"The Burj Khalifa broke 6 world records at once!"},
  {cat:'maths',y:5,q:"A lift rises 120 m in 12 seconds. Speed in m/s?",a:10,opts:[8,10,12,15],fact:"Express lifts travel at 10 m/s — incredibly fast!"},
  {cat:'maths',y:5,q:"What is 7² (seven squared)?",a:49,opts:[14,42,49,56],fact:"The spire alone adds over 200 m to the height!"},
  {cat:'trivia',y:4,q:"On which continent is the UAE?",a:'Asia',opts:['Africa','Europe','Asia','Oceania'],fact:"The UAE is in Western Asia (the Middle East)!"},
  {cat:'trivia',y:5,q:"What is the observation deck on floor 148 called?",a:'At the Top',opts:['Sky Bridge','At the Top','Cloud Nine','Summit View'],fact:"'At the Top Sky' offers stunning 360° views!"},
];

// ── SKINS / WEAPONS / FOODS ───────────────────────────────────
const skins=[
  {name:"Desert Explorer",head:'#f5c5a0',shirt:'#e6902a',legs:'#c67010',price:0},
  {name:"Emirati Sheikh",  head:'#f5c5a0',shirt:'#1a1a1a',legs:'#2a2a2a',price:50},
  {name:"Camel Rider",     head:'#d4956a',shirt:'#8B5010',legs:'#6a3a08',price:80},
  {name:"Desert Warrior",  head:'#f5c5a0',shirt:'#8B0000',legs:'#600000',price:120},
  {name:"Dubai Princess",  head:'#f5c5a0',shirt:'#cc3399',legs:'#992277',price:150},
  {name:"Gold Knight",     head:'#f5c5a0',shirt:'#aa8800',legs:'#886600',price:200},
];
const weapons=[
  {name:"Bronze Sword",    dmg:1,color:'#cd7f32',len:28},
  {name:"Steel Scimitar",  dmg:2,color:'#c0c0c0',len:32},
  {name:"Desert Blade",    dmg:3,color:'#FFD700',len:34},
  {name:"Flaming Scimitar",dmg:4,color:'#ff6600',len:38},
  {name:"Diamond Sword",   dmg:5,color:'#00FFFF',len:42},
];
const foods=[
  {name:"Falafel",icon:"🧆",heal:1},{name:"Shawarma",icon:"🌯",heal:2},
  {name:"Dates",  icon:"🫐",heal:1},{name:"Hummus",  icon:"🥣",heal:1},
  {name:"Machboos",icon:"🍛",heal:2},
];

// ── PLAYER ───────────────────────────────────────────────────
const PL={
  x:80, y:GROUND_Y-36, w:22, h:36,
  vx:0, vy:0, facing:1,
  onGround:false, coyote:0, djAvail:true,
  wallSliding:false, wallDir:0, wallJumpCooldown:0,
  dashCooldown:0, dashing:false, dashTimer:0,
  maxHp:5, hp:5, invincible:0,
  attackTimer:0, attacking:false,
  skinIdx:0, weaponIdx:0,
  checkpointX:80, checkpointY:GROUND_Y-36,
  runTick:0, runFrame:0, RUN_SPEED:40,
  landTick:0, seesawPlatIdx:-1,
  runMom:0,   // momentum 0-1
};
const abilities = {doubleJump:false, wallJump:false, dash:false};

// ── WORLD ────────────────────────────────────────────────────
let platforms=[], enemies=[], collectibles=[], doors=[], mathTriggers=[];
let hazards=[], particles=[], projectiles=[], visitedZones=new Set();
let mapOpen=false;

// ── INPUT ────────────────────────────────────────────────────
const keys={}, justPressed={};
window.addEventListener('keydown',e=>{
  if(!keys[e.code]) justPressed[e.code]=true;
  keys[e.code]=true;
  if(e.code==='KeyS'&&state==='playing') openShop();
  if(e.code==='KeyM'&&state==='playing') mapOpen=!mapOpen;
  if(e.code==='KeyR'&&state==='gameover') restartGame();
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup',e=>{ keys[e.code]=false; delete justPressed[e.code]; });
function jp(c){ return !!justPressed[c]; }

// ── LEVEL GENERATION ─────────────────────────────────────────
// Guaranteed-reachable path: each platform within jump range of previous
const MAX_V_GAP = 40;   // max upward step (vy=-8, g=0.3 → max height ≈107px)
const MAX_H_GAP = 100;   // max horizontal gap between right edge and left edge of next platform

function generateLevel(lvl){
  platforms=[]; enemies=[]; collectibles=[]; doors=[];
  mathTriggers=[]; hazards=[]; particles=[]; projectiles=[];
  visitedZones.clear(); fireworks=[]; fireworkTimer=0; buildingFlash=0;
  keyInv.bronze=0; keyInv.silver=0; keyInv.gold=0;
  switches=[]; dashTrail=[]; screenShake=0; hitFlash=0; combo=0; comboTimer=0;

  // ── MAIN PATH (guaranteed reachable)
  const path = [];
  let cx = 80, cy = GROUND_Y, pw = 160;
  path.push({x:cx, y:cy, w:pw}); // starting ledge

  while(cx < WORLD_W - 300){
    const prevRight = cx + pw;
    pw = 80 + Math.random()*110;
    const hgap = 20 + Math.random()*(MAX_H_GAP - 20); // gap between platforms
    cx = prevRight + hgap;
    // Mostly level, allow small ups/downs
    const dy = -10 + (Math.random()-0.5)*MAX_V_GAP;
    cy = Math.max(GOAL_Y+40, Math.min(GROUND_Y-20, cy + dy));
    path.push({x:cx, y:cy, w:pw});
  }

  // Build platforms from path
  path.forEach((p, i) => {
    const zone = getZone(p.x);
    const isBoss = (i > 0 && i % 12 === 0);
    let type = 'platform';
    if(isBoss) type = 'boss';
    else if(i % 9 === 0) type = 'checkpoint';
    else {
      const r = Math.random();
      if(r < 0.13) type = 'collapse';
      else if(r < 0.22) type = 'seesaw';
    }
    platforms.push({
      x:p.x, y:p.y, w:p.w, h:14, type, floor:i+1, zone:zone.id,
      collapseTimer:0, collapseMax:55, collapsing:false, collapseVY:0, gone:false,
      tilt:0, tiltV:0, origX:p.x, origY:p.y,
    });
  });

  // Ground slab (left side starting area)
  platforms.unshift({x:0, y:GROUND_Y, w:180, h:20, type:'ground',
    collapseTimer:0,collapseMax:55,collapsing:false,collapseVY:0,gone:false,tilt:0,tiltV:0});

  // Goal platform at end
  const lastP = path[path.length-1];
  platforms.push({x:lastP.x+lastP.w+60, y:GOAL_Y+60, w:200, h:14, type:'goal',
    collapseTimer:0,collapseMax:55,collapsing:false,collapseVY:0,gone:false,tilt:0,tiltV:0});

  // ── EXTRA DETAIL PLATFORMS (off-path, for exploration)
  for(let i=0; i<path.length-1; i++){
    if(Math.random()<0.60){
      const p = path[i];
      const ex = p.x + p.w*0.3 + Math.random()*p.w*0.4;
      const ey = p.y - 20 - Math.random()*40;
      if(ey > GOAL_Y+20){
        platforms.push({x:ex, y:ey, w:50+Math.random()*60, h:12, type:'platform',
          floor:i+1, zone:getZone(ex).id,
          collapseTimer:0,collapseMax:55,collapsing:false,collapseVY:0,gone:false,tilt:0,tiltV:0});
      }
    }
  }

  // ── MOVING PLATFORMS (every 4th path platform in zone 1+)
  let movIdx=0;
  platforms.filter(p=>p.type==='platform'&&p.zone>=1).forEach(p=>{
    movIdx++;
    if(movIdx%4===0){
      p.moving=true; p.moveDir=1; p.movVx=0;
      p.moveSpeed=0.5+Math.random()*0.5;
      p.moveRange=50+Math.random()*70;
      p.moveOriginX=p.x;
    }
  });

  // ── PRESSURE PLATE SWITCHES (reward math question + diamonds)
  switches=[];
  let swIdx=0;
  platforms.filter(p=>p.type==='platform'&&p.zone>=1&&p.w>=60).forEach(p=>{
    swIdx++;
    if(swIdx%5===2&&Math.random()<0.55){
      switches.push({x:p.x+p.w/2-12,y:p.y-10,w:24,h:10,
        activated:false,flash:0,reward:20+Math.floor(Math.random()*20)});
    }
  });

  // ── SPIKES (zone 2+)
  platforms.filter(p=>p.type==='platform'&&p.zone>=2).forEach(p=>{
    if(Math.random()<0.18){
      hazards.push({x:p.x+8+Math.random()*(p.w-26), y:p.y-8, w:18, h:8, type:'spike'});
    }
  });

  // ── ENEMIES
  const ENEMY_POOL = [
    ['grunt','grunt'],           // zone 0
    ['grunt','soldier'],         // zone 1
    ['soldier','soldier'],       // zone 2
    ['soldier','captain'],       // zone 3
    ['captain','phantom'],       // zone 4
    ['captain','titan','phantom'],// zone 5
  ];
  platforms.filter(p=>p.type==='platform'&&p.floor>1).forEach(p=>{
    if(Math.random()<0.50+lvl*0.05){
      const pool=ENEMY_POOL[Math.min(p.zone,5)];
      const etype=pool[Math.floor(Math.random()*pool.length)];
      enemies.push(makeEnemy(etype,p.x,p.y,p.w,p.zone,lvl));
    }
    if(p.type==='boss'){
      const bhp=(10+p.zone*5)*(1+(lvl-1)*0.4);
      enemies.push({x:p.x+p.w/2-28,y:p.y-70,w:56,h:70,hp:bhp,maxHp:bhp,
        vx:0.5+p.zone*0.1,platX:p.x,platW:p.w,platY:p.y,
        dead:false,deadTimer:0,isBoss:true,etype:'boss',zoneId:p.zone,
        phase:0,stunned:0,ranged:true,shootTimer:90,animTick:0,facing:1,attackAnim:0});
    }
  });

  // ── COLLECTIBLES (diamonds, food, keys)
  platforms.filter(p=>p.type!=='ground'&&p.type!=='goal').forEach((p,i)=>{
    // Diamonds
    const dc = 1 + Math.floor(Math.random()*3);
    for(let d=0; d<dc; d++)
      collectibles.push({x:p.x+10+d*22, y:p.y-20, w:14, h:14, type:'diamond',
        collected:false, bob:Math.random()*Math.PI*2});
    // Food
    if(Math.random()<0.22)
      collectibles.push({x:p.x+p.w/2-9, y:p.y-24, w:18, h:18, type:'food',
        food:foods[Math.floor(Math.random()*foods.length)], collected:false, bob:Math.random()*Math.PI*2});
    // Checkpoint orb
    if(p.type==='checkpoint')
      collectibles.push({x:p.x+p.w/2-10, y:p.y-26, w:20, h:20, type:'checkpoint',
        collected:false, bob:0});
  });

  // ── KEYS (one per zone transition, placed mid-zone)
  const keyTypes=['bronze','silver','gold'];
  [1,3,5].forEach((zi,ki)=>{
    const zonePlats=platforms.filter(p=>p.zone===zi&&p.type==='platform');
    if(zonePlats.length>0){
      const p=zonePlats[Math.floor(zonePlats.length/2)];
      collectibles.push({x:p.x+p.w/2-8, y:p.y-28, w:16, h:20, type:'key',
        keyColor:keyTypes[ki], collected:false, bob:Math.random()*Math.PI*2});
    }
  });

  // ── DOORS (at zone boundaries)
  const doorDefs=[{x:310,color:'bronze'},{x:630,color:'silver'},{x:950,color:'gold'}];
  doorDefs.forEach(dd=>{
    doors.push({x:dd.x, y:GOAL_Y, w:22, h:GROUND_Y-GOAL_Y, color:dd.color,
      open:false, openProgress:0});
  });

  // ── MATH TRIGGERS (every ~320px)
  for(let mx=280; mx<WORLD_W-200; mx+=320){
    const nearPlats=platforms.filter(p=>Math.abs(p.x-mx)<150&&p.type==='platform');
    if(nearPlats.length>0){
      const p=nearPlats[0];
      mathTriggers.push({x:p.x+p.w/2-18, y:p.y-50, w:36, h:36, triggered:false});
    }
  }

  cameraX=0; cameraY=GROUND_Y-H*0.6;
  PL.x=80; PL.y=GROUND_Y-36; PL.vx=0; PL.vy=0; PL.hp=PL.maxHp;
  PL.onGround=false; PL.weaponIdx=Math.min(lvl-1,weapons.length-1);
  PL.checkpointX=80; PL.checkpointY=GROUND_Y-36;
  PL.djAvail=true; PL.dashing=false; PL.dashCooldown=0;
  PL.seesawPlatIdx=-1; PL.runMom=0;
  updateProgress();
}

// ── ENEMY FACTORY ─────────────────────────────────────────────
const EDEFS={
  grunt:  {w:18,h:26,hpBase:1,spdBase:0.55,body:'#cc2222',helm:'#881111',size:'small'},
  soldier:{w:26,h:36,hpBase:2,spdBase:0.38,body:'#cc6600',helm:'#884400',size:'medium'},
  captain:{w:34,h:46,hpBase:4,spdBase:0.22,body:'#7722aa',helm:'#441166',size:'large'},
  phantom:{w:26,h:36,hpBase:2,spdBase:0.45,body:'#224488',helm:'#112244',size:'medium',flies:true},
  titan:  {w:38,h:50,hpBase:5,spdBase:0.18,body:'#224422',helm:'#112211',size:'large'},
};
function makeEnemy(etype,px,py,pw,zoneId,lvl){
  const d=EDEFS[etype]||EDEFS.grunt;
  const hp=Math.ceil(d.hpBase*(1+(lvl-1)*0.3+zoneId*0.15));
  const spd=d.spdBase*(1+lvl*0.06)*(Math.random()<0.5?1:-1);
  return{x:px+8,y:py-d.h,w:d.w,h:d.h,hp,maxHp:hp,vx:spd,
    platX:px,platW:pw,platY:py,dead:false,deadTimer:0,isBoss:false,
    etype,def:d,zoneId,phase:Math.random()*Math.PI*2,stunned:0,
    facing:spd>0?1:-1,ranged:zoneId>=3&&Math.random()<0.35,
    shootTimer:80+Math.floor(Math.random()*60),
    animTick:0,attackAnim:0,flies:!!d.flies};
}

// ── QUESTION UI ───────────────────────────────────────────────
let questionUsed=[], pendingDoorIdx=-1;
function askQuestion(cb,forDoor){
  if(questionUsed.length>=QUESTIONS.length) questionUsed=[];
  let pool=QUESTIONS.map((_,i)=>i).filter(i=>!questionUsed.includes(i));
  if(forDoor){ const tp=pool.filter(i=>QUESTIONS[i].cat==='trivia'); if(tp.length>2) pool=tp; }
  const idx=pool[Math.floor(Math.random()*pool.length)];
  questionUsed.push(idx);
  const q=QUESTIONS[idx];
  state='math';
  document.getElementById('mathFloorTag').textContent=`Zone ${getZone(PL.x).id+1} · ${q.cat==='trivia'?'🏙️ Trivia':'📐 Maths'} Year ${q.y}`;
  document.getElementById('mathFact').textContent='🏗️ '+q.fact;
  document.getElementById('mathQuestion').textContent=q.q;
  document.getElementById('mathFeedback').textContent='';
  const ad=document.getElementById('mathAnswers'); ad.innerHTML='';
  q.opts.forEach(opt=>{
    const btn=document.createElement('button'); btn.className='math-btn'; btn.textContent=opt;
    btn.onclick=()=>{
      const ok=String(opt)===String(q.a);
      ad.querySelectorAll('.math-btn').forEach(b=>b.disabled=true);
      btn.className='math-btn '+(ok?'correct':'wrong');
      const fb=document.getElementById('mathFeedback');
      if(ok){
        const praise=['⭐ Excellent! +15 💎','🌟 Brilliant! +15 💎','🎉 Super! +15 💎','✅ Well done! +15 💎'];
        fb.textContent=praise[idx%praise.length]; fb.style.color='#2e7d32';
        diamonds+=15; buildingFlash=90;
        setTimeout(()=>{ closeMath(); if(cb) cb(true); },900);
      } else {
        fb.textContent=`❌ Answer: ${q.a} — keep practising!`; fb.style.color='#c62828';
        PL.hp=Math.max(0,PL.hp-1);
        setTimeout(()=>{ closeMath(); if(cb) cb(false); if(PL.hp<=0) gameOver(); },1800);
      }
    };
    ad.appendChild(btn);
  });
  document.getElementById('mathOverlay').classList.add('active');
}
function closeMath(){ document.getElementById('mathOverlay').classList.remove('active'); state='playing'; }

// ── SHOP ──────────────────────────────────────────────────────
function openShop(){
  state='shop';
  document.getElementById('shopDia').textContent=diamonds;
  const grid=document.getElementById('skinGrid'); grid.innerHTML='';
  skins.forEach((sk,i)=>{
    const owned=ownedSkins.includes(i),eq=selectedSkin===i;
    const div=document.createElement('div');
    div.className='skin-item'+(owned?' owned':'')+(eq?' equipped':'');
    div.innerHTML=`<div class="skin-icon">👤</div><div class="skin-name">${sk.name}</div><div class="skin-price">${owned?(eq?'✅ On':'✅ Own'):'💎'+sk.price}</div>`;
    div.onclick=()=>{
      if(owned){selectedSkin=i;PL.skinIdx=i;openShop();}
      else if(diamonds>=sk.price){diamonds-=sk.price;ownedSkins.push(i);selectedSkin=i;PL.skinIdx=i;openShop();}
    };
    grid.appendChild(div);
  });
  document.getElementById('shopOverlay').classList.add('active');
}
document.getElementById('closeShop').onclick=()=>{
  document.getElementById('shopOverlay').classList.remove('active'); state='playing';
};

// ── HUD HELPERS ───────────────────────────────────────────────
function updateProgress(){
  const pct=Math.round(Math.max(0,Math.min(1,(GROUND_Y-PL.y)/(GROUND_Y-GOAL_Y)))*100);
  document.getElementById('progressFill').style.width=pct+'%';
  document.getElementById('progressLabel').textContent=pct+'% climbed';
}
function showFact(txt){
  const el=document.getElementById('factPopup');
  el.textContent='💡 '+txt; el.classList.add('show'); factTimer=220;
}
function showZone(zone){
  document.getElementById('zoneNameEl').textContent=zone.name;
  document.getElementById('zoneDescEl').textContent=zone.desc;
  document.getElementById('zoneBanner').classList.add('show');
  zoneTimer=200; buildingFlash=160;
}

// ── COLLISION ─────────────────────────────────────────────────
function overlap(a,b){ return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y; }

// ── PARTICLES ─────────────────────────────────────────────────
function spawnParts(wx,wy,color,n,spd=4){
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2, s=(0.5+Math.random())*spd;
    particles.push({x:wx,y:wy,vx:Math.cos(a)*s,vy:Math.sin(a)*s-2,
      life:45+Math.random()*30,maxLife:75,color,size:2+Math.random()*4});
  }
}

// ── FIREWORKS ─────────────────────────────────────────────────
const FW_COLORS=['#FFD700','#ff4444','#44ffaa','#4488ff','#ff88ff','#ffaa00','#00FFFF'];
function spawnFirework(){
  const wx=cameraX+60+Math.random()*(W-120), wy=cameraY+40+Math.random()*(H*0.45);
  const col=FW_COLORS[Math.floor(Math.random()*FW_COLORS.length)];
  for(let i=0;i<36;i++){
    const a=(i/36)*Math.PI*2, s=2.5+Math.random()*3;
    fireworks.push({x:wx,y:wy,vx:Math.cos(a)*s,vy:Math.sin(a)*s,
      life:80+Math.random()*40,maxLife:120,color:col,size:3+Math.random()*3});
  }
}

// ── UPDATE ────────────────────────────────────────────────────
function update(){
  if(state!=='playing') return;

  PL.runTick++; if(PL.runTick>=PL.RUN_SPEED){PL.runTick=0;PL.runFrame=(PL.runFrame+1)%6;}
  if(PL.landTick>0) PL.landTick--;
  if(PL.dashCooldown>0) PL.dashCooldown--;
  if(PL.wallJumpCooldown>0) PL.wallJumpCooldown--;
  if(factTimer>0){factTimer--; if(factTimer===0) document.getElementById('factPopup').classList.remove('show');}
  if(zoneTimer>0){zoneTimer--; if(zoneTimer===0) document.getElementById('zoneBanner').classList.remove('show');}
  if(buildingFlash>0) buildingFlash--;
  if(fireworkTimer>0){ fireworkTimer--; if(fireworkTimer%18===0) spawnFirework(); }
  if(comboTimer>0){comboTimer--;if(comboTimer===0){combo=0;comboMax=0;}}
  dashTrail.forEach(dt=>dt.alpha-=0.09);
  dashTrail=dashTrail.filter(dt=>dt.alpha>0);
  fireworks.forEach(f=>{f.x+=f.vx;f.y+=f.vy;f.vx*=0.97;f.vy*=0.97;f.vy+=0.04;f.life--;});
  fireworks=fireworks.filter(f=>f.life>0);

  // ── DASH
  if(PL.dashing){
    PL.dashTimer--; PL.vx=PL.facing*5.5;
    if(PL.dashTimer%2===0) dashTrail.push({x:PL.x,y:PL.y,w:PL.w,h:PL.h,alpha:0.5,facing:PL.facing});
    if(PL.dashTimer<=0){PL.dashing=false; PL.vx=PL.facing*1.8;}
  }
  if((jp('KeyX')||jp('ShiftLeft'))&&!PL.dashing){
    if(abilities.dash&&PL.dashCooldown===0){
      PL.dashing=true; PL.dashTimer=14; PL.dashCooldown=42;
      spawnParts(PL.x+PL.w/2,PL.y+PL.h/2,'#ff8800aa',8,5);
    }
  }

  // ── HORIZONTAL MOVEMENT (momentum-based)
  if(!PL.dashing){
    const mv=(keys['ArrowLeft']||keys['KeyA'])?-1:(keys['ArrowRight']||keys['KeyD'])?1:0;
    if(mv!==0){
      PL.runMom=Math.min(1,PL.runMom+0.07);
      PL.vx=mv*(1.3+PL.runMom*0.9); PL.facing=mv;
    } else {
      PL.runMom=Math.max(0,PL.runMom-0.14);
      PL.vx*=0.68;
    }
  }

  // ── COYOTE & WALL SLIDE
  if(PL.onGround){PL.coyote=8;PL.djAvail=true;} else if(PL.coyote>0) PL.coyote--;
  PL.wallSliding=false;
  if(!PL.onGround&&PL.vy>0&&PL.wallJumpCooldown===0&&abilities.wallJump){
    for(const p of platforms){
      if(p.gone) continue;
      const lT=Math.abs(PL.x-(p.x+p.w))<5&&PL.y+PL.h>p.y&&PL.y<p.y+p.h;
      const rT=Math.abs(PL.x+PL.w-p.x)<5&&PL.y+PL.h>p.y&&PL.y<p.y+p.h;
      if(lT||rT){PL.wallSliding=true;PL.wallDir=lT?-1:1;PL.vy=Math.min(PL.vy,1.5);break;}
    }
  }

  // ── JUMP
  const wj=jp('ArrowUp')||jp('KeyW')||jp('KeyZ');
  if(wj){
    if(PL.wallSliding&&abilities.wallJump){
      PL.vy=-8;PL.vx=-PL.wallDir*3.5;PL.facing=-PL.wallDir;PL.wallJumpCooldown=18;PL.djAvail=true;
      spawnParts(PL.x+PL.w/2,PL.y+PL.h/2,'#00ff88aa',6,3);
    } else if(PL.coyote>0){
      PL.vy=-8;PL.coyote=0;PL.onGround=false;
      spawnParts(PL.x+PL.w/2,PL.y+PL.h,'#FFD70077',4);
    } else if(PL.djAvail&&abilities.doubleJump){
      PL.vy=-7.5;PL.djAvail=false;
      spawnParts(PL.x+PL.w/2,PL.y+PL.h/2,'#00FFFFaa',8,4);
    }
  }

  // ── GRAVITY
  PL.vy+=PL.wallSliding?0.10:0.30; if(PL.vy>10) PL.vy=10;
  PL.x+=PL.vx; PL.y+=PL.vy;
  PL.x=Math.max(0,Math.min(WORLD_W-PL.w,PL.x));

  // ── MOVING PLATFORMS
  platforms.forEach(p=>{
    if(!p.moving||p.gone) return;
    p.movVx=p.moveDir*p.moveSpeed;
    p.x+=p.movVx;
    if(p.x>p.moveOriginX+p.moveRange||p.x<p.moveOriginX-p.moveRange) p.moveDir*=-1;
  });

  // ── SEESAW
  PL.seesawPlatIdx=-1;
  platforms.forEach((p,pi)=>{
    if(p.type!=='seesaw'||p.gone) return;
    p.tiltV+=(0-p.tilt)*0.08-p.tiltV*0.25; p.tilt+=p.tiltV;
  });

  // ── PLATFORM COLLISION
  const wasOnGround=PL.onGround; PL.onGround=false;
  for(let pi=0;pi<platforms.length;pi++){
    const p=platforms[pi]; if(p.gone) continue;
    if(PL.x+PL.w<=p.x||PL.x>=p.x+p.w) continue;
    let surfY=p.y;
    if(p.type==='seesaw'){ const dx=PL.x+PL.w/2-(p.x+p.w/2); surfY=p.y+Math.sin(p.tilt)*dx; }
    if(PL.vy>=0&&PL.y+PL.h>=surfY&&PL.y+PL.h<=surfY+p.h+Math.abs(PL.vy)+2){
      PL.y=surfY-PL.h; PL.vy=0; PL.onGround=true;
      if(p.moving) PL.x=Math.max(0,Math.min(WORLD_W-PL.w,PL.x+(p.movVx||0)));
      if(!wasOnGround) PL.landTick=8;
      if(p.type==='seesaw'){
        PL.seesawPlatIdx=pi;
        p.tiltV+=(PL.x+PL.w/2-(p.x+p.w/2))/(p.w/2)*0.018;
        PL.vx+=Math.sin(p.tilt)*0.6;
      } else if(p.type==='collapse'){
        p.collapseTimer++;
        if(p.collapseTimer>=p.collapseMax&&!p.collapsing){
          p.collapsing=true; spawnParts(p.x+p.w/2,p.y,'#8B4513aa',8,2);
        }
      }
      if(p.type==='goal'){ levelComplete(); return; }
      if(p.zone!=null){
        const zone=ZONES[Math.min(p.zone,ZONES.length-1)];
        if(p.zone!==lastZoneId){ lastZoneId=p.zone; showZone(zone); visitedZones.add(p.zone); }
      }
    }
  }

  // ── COLLAPSE
  platforms.forEach(p=>{
    if(!p.collapsing||p.gone) return;
    p.collapseVY+=0.4; p.y+=p.collapseVY; p.x+=Math.sin(p.collapseVY*5)*1.5;
    if(p.y>cameraY+H+60) p.gone=true;
  });

  // ── DOORS (horizontal barriers)
  if(state==='playing'){
    for(let di=0;di<doors.length;di++){
      const d=doors[di]; if(d.open) continue;
      // Only block if player is trying to move through (x overlap, y overlap)
      const dBox={x:d.x,y:d.y,w:d.w,h:d.h};
      if(overlap({x:PL.x,y:PL.y,w:PL.w,h:PL.h},dBox)){
        if(keyInv[d.color]>0){
          keyInv[d.color]--; pendingDoorIdx=di;
          askQuestion(ok=>{
            if(ok&&pendingDoorIdx>=0){ doors[pendingDoorIdx].open=true; spawnParts(doors[pendingDoorIdx].x+11,doors[pendingDoorIdx].y+60,'#FFD700',20,5); }
            pendingDoorIdx=-1;
          },true);
          PL.vx=-PL.facing*2; PL.vy=-2;
        } else {
          // Push back
          PL.x=PL.facing>0 ? d.x-PL.w-1 : d.x+d.w+1;
          PL.vx=-PL.facing*1.5;
          if(!PL._dmsg){ PL._dmsg=1; showFact(`🔒 Need a ${d.color} key!`); setTimeout(()=>PL._dmsg=0,2000); }
        }
      }
    }
  }

  // ── ATTACK
  if(PL.attackTimer>0) PL.attackTimer--;
  if((jp('Space')||jp('KeyF'))&&PL.attackTimer===0){
    PL.attacking=true; PL.attackTimer=22; doAttack();
    setTimeout(()=>{PL.attacking=false;},220);
  }

  // ── CAMERA (follows both X and Y)
  cameraX+=(PL.x-W*0.38-cameraX)*0.09;
  cameraX=Math.max(0,Math.min(WORLD_W-W,cameraX));
  cameraY+=(PL.y-H*0.52-cameraY)*0.07;

  // ── HAZARDS
  for(const hz of hazards){
    if(PL.invincible<=0&&overlap({x:PL.x,y:PL.y,w:PL.w,h:PL.h},{x:hz.x,y:hz.y,w:hz.w,h:hz.h})){
      PL.hp--; PL.invincible=80; PL.vy=-5;
      triggerShake(5); hitFlash=12;
      spawnParts(PL.x+PL.w/2,PL.y,'#ff4400',8);
      if(PL.hp<=0){gameOver();return;}
    }
  }

  // ── ENEMIES
  for(const en of enemies){
    if(en.dead){en.deadTimer++;continue;}
    en.animTick++; en.phase+=0.05;
    if(en.stunned>0){en.stunned--;continue;}
    en.x+=en.vx;
    if(en.facing!==Math.sign(en.vx)&&Math.abs(en.vx)>0.1) en.facing=Math.sign(en.vx);
    if(en.x<en.platX||en.x+en.w>en.platX+en.platW){ en.vx*=-1; en.facing*=-1; }
    en.y=en.flies ? en.platY-en.h+Math.sin(en.phase)*10 : en.platY-en.h;
    if(en.ranged){ en.shootTimer--; if(en.shootTimer<=0){ en.shootTimer=80+Math.floor(Math.random()*60); const dx=PL.x-en.x,dy=PL.y-en.y,dist=Math.sqrt(dx*dx+dy*dy)||1,spd=1.4+gameLevel*0.1; projectiles.push({x:en.x+en.w/2,y:en.y+en.h/2,vx:dx/dist*spd,vy:dy/dist*spd,life:120,fromBoss:en.isBoss,r:en.isBoss?5:4}); } }
    if(PL.invincible<=0&&overlap({x:PL.x,y:PL.y,w:PL.w,h:PL.h},{x:en.x,y:en.y,w:en.w,h:en.h})){
      PL.hp-=en.isBoss?2:1; PL.invincible=90; PL.vy=-5; en.attackAnim=15;
      triggerShake(en.isBoss?8:5); hitFlash=14;
      spawnParts(PL.x+PL.w/2,PL.y,'#ff4400',8);
      if(PL.hp<=0){gameOver();return;}
    }
    if(en.attackAnim>0) en.attackAnim--;
  }
  if(PL.invincible>0) PL.invincible--;

  // ── PROJECTILES
  for(let i=projectiles.length-1;i>=0;i--){
    const p=projectiles[i]; p.x+=p.vx; p.y+=p.vy; p.life--;
    if(p.life<=0){projectiles.splice(i,1);continue;}
    if(PL.invincible<=0&&overlap({x:PL.x,y:PL.y,w:PL.w,h:PL.h},{x:p.x-p.r,y:p.y-p.r,w:p.r*2,h:p.r*2})){
      PL.hp-=p.fromBoss?2:1; PL.invincible=70;
      triggerShake(4); hitFlash=10;
      spawnParts(p.x,p.y,'#ff6600',5); projectiles.splice(i,1);
      if(PL.hp<=0){gameOver();return;}
    }
  }

  // ── COLLECTIBLES
  for(const col of collectibles){
    if(col.collected) continue;
    // Diamond magnet
    if(col.type==='diamond'){
      const dx=(PL.x+PL.w/2)-(col.x+col.w/2),dy=(PL.y+PL.h/2)-(col.y+col.h/2);
      const dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<90&&dist>1){const spd=2.5*(1-dist/90)+0.5;col.x+=dx/dist*spd;col.y+=dy/dist*spd;}
    }
    col.bob+=0.06;
    const cy=col.y+Math.sin(col.bob)*3;
    if(overlap({x:PL.x,y:PL.y,w:PL.w,h:PL.h},{x:col.x,y:cy,w:col.w,h:col.h})){
      col.collected=true;
      if(col.type==='diamond'){ diamonds+=1+Math.floor(gameLevel/2); spawnParts(col.x+7,col.y,'#00FFFFaa',5,3); }
      else if(col.type==='food'){ PL.hp=Math.min(PL.maxHp,PL.hp+col.food.heal); showFact(col.food.icon+' +'+col.food.heal+' HP!'); spawnParts(col.x+9,col.y,'#00ff88aa',6,3); }
      else if(col.type==='key'){ keyInv[col.keyColor]++; showFact('🔑 '+col.keyColor[0].toUpperCase()+col.keyColor.slice(1)+' Key!'); spawnParts(col.x+8,col.y,KEY_COLORS[col.keyColor],14,4); }
      else if(col.type==='checkpoint'){ PL.checkpointX=PL.x; PL.checkpointY=PL.y; PL.hp=Math.min(PL.maxHp,PL.hp+2); showFact('💾 Checkpoint! +2 HP'); spawnParts(col.x+10,col.y,'#00ff88',12,4); }
    }
  }

  // ── MATH TRIGGERS
  for(const mt of mathTriggers){
    if(mt.triggered) continue;
    if(overlap({x:PL.x,y:PL.y,w:PL.w,h:PL.h},{x:mt.x,y:mt.y,w:mt.w,h:mt.h})){ mt.triggered=true; askQuestion(()=>{},false); }
  }

  // ── SWITCHES (pressure plates)
  for(const swObj of switches){
    if(swObj.flash>0) swObj.flash--;
    if(!swObj.activated&&overlap({x:PL.x,y:PL.y,w:PL.w,h:PL.h},{x:swObj.x,y:swObj.y,w:swObj.w,h:swObj.h})){
      swObj.activated=true; swObj.flash=50;
      triggerShake(3);
      spawnParts(swObj.x+swObj.w/2,swObj.y,'#FFD700',16,5);
      askQuestion(ok=>{
        if(ok){diamonds+=swObj.reward;spawnParts(swObj.x+swObj.w/2,swObj.y,'#FFD700',28,6);}
      },false);
    }
  }

  // ── PARTICLES
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i]; p.x+=p.vx; p.y+=p.vy; p.vy+=0.14; p.life--;
    if(p.life<=0) particles.splice(i,1);
  }

  // Fell too far
  if(PL.y>GROUND_Y+200){ PL.x=PL.checkpointX; PL.y=PL.checkpointY; PL.vx=0; PL.vy=0; PL.hp=Math.max(1,PL.hp-1); PL.invincible=60; }

  updateProgress();
  for(const k in justPressed) delete justPressed[k];
}

function doAttack(){
  const wep=weapons[PL.weaponIdx];
  const ab={x:PL.facing>0?PL.x+PL.w:PL.x-wep.len, y:PL.y+4, w:wep.len, h:PL.h-8};
  enemies.forEach(en=>{
    if(en.dead) return;
    if(overlap(ab,{x:en.x,y:en.y,w:en.w,h:en.h})){
      en.hp-=wep.dmg; en.stunned=en.isBoss?10:18;
      combo++; comboTimer=90; if(combo>comboMax) comboMax=combo;
      spawnParts(en.x+en.w/2,en.y+en.h/2,'#ff8800aa',8);
      if(en.hp<=0){ en.dead=true; triggerShake(en.isBoss?6:2); diamonds+=en.isBoss?40+gameLevel*10:5+gameLevel*2; spawnParts(en.x+en.w/2,en.y+en.h/2,'#FFD700aa',20,6); }
    }
  });
  for(let i=projectiles.length-1;i>=0;i--){
    const p=projectiles[i];
    if(overlap(ab,{x:p.x-p.r,y:p.y-p.r,w:p.r*2,h:p.r*2})){ spawnParts(p.x,p.y,'#88aaff',4); projectiles.splice(i,1); }
  }
}

function levelComplete(){
  triggerShake(10); fireworkTimer=300;
  setTimeout(()=>{ gameLevel++; generateLevel(gameLevel); PL.maxHp=Math.min(9,PL.maxHp+1); PL.hp=PL.maxHp; state='playing'; showFact('🏆 Level '+gameLevel+'!'); },3200);
}
function gameOver(){ state='gameover'; }
function restartGame(){ gameLevel=1; diamonds=0; abilities.doubleJump=false; abilities.wallJump=false; abilities.dash=false; lastZoneId=-1; generateLevel(1); state='playing'; bgMusic.play(); }

// ── DRAW ─────────────────────────────────────────────────────
function draw(){
  ctx.save();
  if(screenShake>0){
    ctx.translate((Math.random()-0.5)*screenShake,(Math.random()-0.5)*screenShake);
    screenShake=Math.max(0,screenShake-0.85);
  }
  drawInterior();
  drawHazards();
  drawPlatforms();
  drawSwitches();
  drawDoors();
  drawMathTriggers();
  drawCollectibles();
  drawDashTrail();
  drawProjectiles();
  drawEnemies();
  drawPlayer();
  drawParticles();
  drawFireworks();
  if(hitFlash>0){
    ctx.fillStyle=`rgba(255,50,50,${hitFlash/18*0.45})`;
    ctx.fillRect(0,0,W,H); hitFlash--;
  }
  drawHUD();
  ctx.restore();
  if(mapOpen) drawMap();
  if(state==='gameover') drawGameOver();
}

// ── INTERIOR BACKGROUND ───────────────────────────────────────
// Windows are in WORLD coords, tiled across width.
// Shows the inside of the Burj Khalifa looking toward the exterior glass wall.
const WIN_PATTERN_W = 160; // world px per window unit
const WIN_W = 100;          // glass panel width
const WIN_TOP   = 80;       // world Y, top of windows
const WIN_BOT   = GROUND_Y-20; // world Y, bottom

// Silhouette definitions (world-relative offsets within a window)
const SILHOUETTES = [
  // standing at left
  (x,y)=>{ ctx.beginPath(); ctx.arc(x+18,y-58,8,0,Math.PI*2); ctx.fill(); ctx.fillRect(x+12,y-50,12,28); ctx.fillRect(x+10,y-22,5,22); ctx.fillRect(x+17,y-22,5,22); },
  // seated at desk
  (x,y)=>{ ctx.beginPath(); ctx.arc(x+28,y-52,7,0,Math.PI*2); ctx.fill(); ctx.fillRect(x+22,y-45,10,18); ctx.fillRect(x+8,y-30,36,5); ctx.fillRect(x+14,y-25,5,14); },
  // standing with arm raised (presenting)
  (x,y)=>{ ctx.beginPath(); ctx.arc(x+50,y-60,8,0,Math.PI*2); ctx.fill(); ctx.fillRect(x+44,y-52,12,28); ctx.fillRect(x+56,y-52,10,3); ctx.fillRect(x+66,y-50,3,18); ctx.fillRect(x+42,y-24,5,24); ctx.fillRect(x+49,y-24,5,24); },
  // two people talking
  (x,y)=>{ ctx.beginPath(); ctx.arc(x+15,y-55,7,0,Math.PI*2); ctx.fill(); ctx.fillRect(x+9,y-48,10,26); ctx.fillRect(x+7,y-22,5,22); ctx.fillRect(x+14,y-22,5,22); ctx.beginPath(); ctx.arc(x+38,y-52,7,0,Math.PI*2); ctx.fill(); ctx.fillRect(x+32,y-45,10,24); ctx.fillRect(x+30,y-21,5,21); ctx.fillRect(x+37,y-21,5,21); },
  // empty
  ()=>{},
  // person looking out window
  (x,y)=>{ ctx.beginPath(); ctx.arc(x+55,y-56,7,0,Math.PI*2); ctx.fill(); ctx.fillRect(x+49,y-49,10,26); ctx.fillRect(x+47,y-23,5,23); ctx.fillRect(x+54,y-23,5,23); },
];

function drawInterior(){
  // Sky base
  const zone=getZone(PL.x);
  ctx.fillStyle=zone.sky||'#050810'; ctx.fillRect(0,0,W,H);

  // -- Draw window panels tiled across visible world
  const firstWin=Math.floor(cameraX/WIN_PATTERN_W)-1;
  const lastWin=Math.ceil((cameraX+W)/WIN_PATTERN_W)+1;

  for(let wi=firstWin; wi<=lastWin; wi++){
    const worldX = wi*WIN_PATTERN_W;
    const pillarSX = sx(worldX);
    const pillarW  = WIN_PATTERN_W - WIN_W;  // 60px pillar
    const winSX    = sx(worldX+pillarW);
    const winSY    = sw(WIN_TOP);
    const winEY    = sw(WIN_BOT);
    const winH     = winEY-winSY;
    if(winEY<0||winSY>H) continue;

    // Pillar / wall section
    ctx.fillStyle='#141820';
    ctx.fillRect(pillarSX,0,pillarW,H);

    // Concrete trim lines on pillar
    ctx.strokeStyle='rgba(60,80,120,0.4)'; ctx.lineWidth=1;
    [0.25,0.5,0.75].forEach(f=>{ ctx.beginPath(); ctx.moveTo(pillarSX,f*H); ctx.lineTo(pillarSX+pillarW,f*H); ctx.stroke(); });

    // Window glass — city view outside
    const skyG=ctx.createLinearGradient(winSX,winSY,winSX,winEY);
    skyG.addColorStop(0,'#060c1e'); skyG.addColorStop(0.5,'#081428'); skyG.addColorStop(1,'#0a1c38');
    ctx.fillStyle=skyG; ctx.fillRect(winSX,winSY,WIN_W,Math.max(0,winH));

    // City skyline silhouette at base of window
    const numBuildings=6;
    const bw=WIN_W/numBuildings;
    const silH=winEY-winSY;
    for(let bi=0;bi<numBuildings;bi++){
      const bh=silH*(0.15+((wi*7+bi*13)%8)*0.05);
      const bx=winSX+bi*bw;
      const by=winEY-bh;
      ctx.fillStyle='#050d1a'; ctx.fillRect(bx,by,bw-1,bh);
      // Little lit windows on buildings
      for(let row=2;row<Math.floor(bh/9);row++){
        for(let col=0;col<2;col++){
          const litSeed=(wi*100+bi*10+row*3+col)%7;
          if(litSeed<4){
            ctx.fillStyle=litSeed<2?'rgba(255,220,100,0.5)':'rgba(180,210,255,0.3)';
            ctx.fillRect(bx+2+col*7,by+3+row*9,5,5);
          }
        }
      }
    }

    // Stars / distant city lights in sky area
    for(let s=0;s<12;s++){
      const starX=winSX+((wi*37+s*17)%WIN_W);
      const starY=winSY+((wi*19+s*31)%(silH*0.6));
      ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.fillRect(starX,starY,1,1);
    }

    // Bright city light glow at horizon
    const glowG=ctx.createRadialGradient(winSX+WIN_W/2,winEY,0,winSX+WIN_W/2,winEY,WIN_W*0.8);
    glowG.addColorStop(0,'rgba(255,200,80,0.08)'); glowG.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=glowG; ctx.fillRect(winSX,winSY,WIN_W,winH);

    // Glass reflection / tint
    ctx.fillStyle='rgba(60,100,180,0.05)'; ctx.fillRect(winSX,winSY,WIN_W*0.35,winH);

    // Window frame
    ctx.strokeStyle='rgba(80,120,180,0.5)'; ctx.lineWidth=2;
    ctx.strokeRect(winSX,winSY,WIN_W,winH);
    // Cross-bar midway
    ctx.strokeStyle='rgba(60,90,140,0.3)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(winSX,winSY+winH*0.5); ctx.lineTo(winSX+WIN_W,winSY+winH*0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(winSX+WIN_W/2,winSY); ctx.lineTo(winSX+WIN_W/2,winEY); ctx.stroke();

    // Person silhouette inside window (based on window index)
    const silIdx=(wi+7)%SILHOUETTES.length;
    if(silIdx!==4){ // 4 = empty
      ctx.fillStyle='rgba(0,0,8,0.80)';
      const silBaseX=winSX; const silBaseY=winEY;
      SILHOUETTES[silIdx](silBaseX,silBaseY);
    }
  }

  // Interior floor strip (front of scene)
  const floorSY=sw(GROUND_Y);
  const flrG=ctx.createLinearGradient(0,floorSY-6,0,floorSY+20);
  flrG.addColorStop(0,'#1e2030'); flrG.addColorStop(1,'#0a0c14');
  ctx.fillStyle=flrG; ctx.fillRect(0,floorSY-6,W,26);
  ctx.fillStyle='#0a0c14'; ctx.fillRect(0,floorSY+20,W,H);
  // Tile lines on floor
  ctx.strokeStyle='rgba(80,100,160,0.2)'; ctx.lineWidth=1;
  for(let tx=(-cameraX%60);tx<W;tx+=60){ ctx.beginPath(); ctx.moveTo(tx,floorSY-6); ctx.lineTo(tx,floorSY+20); ctx.stroke(); }

  // Ceiling strip
  const ceilSY=sw(WIN_TOP-30);
  ctx.fillStyle='#0d0f18'; ctx.fillRect(0,ceilSY,W,30);
  // Ceiling light fixtures
  for(let lx=(-cameraX%160)+40; lx<W; lx+=160){
    // Fluorescent tube
    const lg=ctx.createLinearGradient(lx-40,ceilSY+18,lx+40,ceilSY+18);
    lg.addColorStop(0,'rgba(200,220,255,0)'); lg.addColorStop(0.5,'rgba(200,220,255,0.9)'); lg.addColorStop(1,'rgba(200,220,255,0)');
    ctx.fillStyle=lg; ctx.fillRect(lx-40,ceilSY+18,80,4);
    // Glow
    const glG=ctx.createRadialGradient(lx,ceilSY+20,0,lx,ceilSY+20,60);
    glG.addColorStop(0,'rgba(180,200,255,0.12)'); glG.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=glG; ctx.beginPath(); ctx.ellipse(lx,ceilSY+20,60,30,0,0,Math.PI*2); ctx.fill();
  }

  // Zone colour tint overlay (subtle)
  const tintAlpha=0.06+Math.sin(Date.now()/3000)*0.02;
  const tintColors=['#4a2800','#001840','#001028','#001428','#000c20','#000410'];
  ctx.fillStyle=tintColors[Math.min(lastZoneId>=0?lastZoneId:0,5)];
  ctx.globalAlpha=tintAlpha; ctx.fillRect(0,0,W,H); ctx.globalAlpha=1;

  // buildingFlash — white-gold wash on windows
  if(buildingFlash>0){
    const fa=Math.sin(buildingFlash*0.15)*0.18;
    ctx.fillStyle=`rgba(255,220,100,${fa})`; ctx.fillRect(0,0,W,H);
  }
}

// ── SWITCHES ─────────────────────────────────────────────────
function drawSwitches(){
  const t=Date.now()/400;
  for(const swObj of switches){
    const ssx=sx(swObj.x), ssy=sw(swObj.y);
    if(ssy>H||ssy<-20||ssx>W||ssx+swObj.w<0) continue;
    const glow=swObj.activated?'#00ff88':(swObj.flash>0?'#FFD700':'#ff8800');
    const pulse=swObj.flash>0?Math.sin(swObj.flash*0.3)*4:0;
    ctx.shadowColor=glow; ctx.shadowBlur=8+pulse;
    ctx.fillStyle=swObj.activated?'#003318':'#221100';
    ctx.beginPath(); if(ctx.roundRect)ctx.roundRect(ssx,ssy,swObj.w,swObj.h,4); else ctx.rect(ssx,ssy,swObj.w,swObj.h); ctx.fill();
    ctx.fillStyle=glow; ctx.globalAlpha=swObj.activated?0.8:0.5+Math.sin(t)*0.2;
    ctx.beginPath(); if(ctx.roundRect)ctx.roundRect(ssx+3,ssy+3,swObj.w-6,swObj.h-6,3); else ctx.rect(ssx+3,ssy+3,swObj.w-6,swObj.h-6); ctx.fill();
    ctx.globalAlpha=1; ctx.shadowBlur=0;
    ctx.fillStyle='#fff'; ctx.font='bold 7px Nunito,Arial'; ctx.textAlign='center';
    ctx.fillText(swObj.activated?'✓':'!',ssx+swObj.w/2,ssy+swObj.h-1);
  }
}

// ── DASH TRAIL ────────────────────────────────────────────────
function drawDashTrail(){
  const skin=skins[PL.skinIdx];
  for(const dt of dashTrail){
    const dsx=sx(dt.x), dsyt=sw(dt.y);
    ctx.globalAlpha=dt.alpha*0.55;
    ctx.fillStyle=skin.shirt;
    ctx.beginPath(); if(ctx.roundRect)ctx.roundRect(dsx,dsyt,dt.w,dt.h,4); else ctx.rect(dsx,dsyt,dt.w,dt.h); ctx.fill();
    ctx.globalAlpha=1;
  }
}

// ── HAZARDS ───────────────────────────────────────────────────
function drawHazards(){
  for(const hz of hazards){
    const ssy=sw(hz.y), ssx=sx(hz.x);
    if(ssy>H||ssy+hz.h<0||ssx>W||ssx+hz.w<0) continue;
    ctx.fillStyle='#cc2222';
    const n=Math.floor(hz.w/7);
    for(let i=0;i<n;i++){
      const hx=ssx+i*7;
      ctx.beginPath(); ctx.moveTo(hx,ssy+hz.h); ctx.lineTo(hx+3.5,ssy); ctx.lineTo(hx+7,ssy+hz.h); ctx.closePath(); ctx.fill();
    }
  }
}

// ── PLATFORMS ────────────────────────────────────────────────
function drawPlatforms(){
  for(const p of platforms){
    if(p.gone) continue;
    const ssy=sw(p.y), ssx=sx(p.x);
    if(ssy>H+20||ssy+p.h<-20||ssx>W+20||ssx+p.w<-20) continue;

    if(p.type==='ground'){
      const gr=ctx.createLinearGradient(0,ssy,0,ssy+p.h);
      gr.addColorStop(0,'#2a2a3a'); gr.addColorStop(1,'#141418');
      ctx.fillStyle=gr; ctx.fillRect(ssx,ssy,p.w,p.h);
      ctx.fillStyle='rgba(100,120,180,0.3)'; ctx.fillRect(ssx,ssy,p.w,2);
    } else if(p.type==='goal'){
      ctx.shadowColor='#FFD700'; ctx.shadowBlur=22;
      const gg=ctx.createLinearGradient(ssx,ssy,ssx+p.w,ssy);
      gg.addColorStop(0,'#aa7700'); gg.addColorStop(0.5,'#fff0a0'); gg.addColorStop(1,'#aa7700');
      ctx.fillStyle=gg; ctx.fillRect(ssx,ssy,p.w,p.h); ctx.shadowBlur=0;
      ctx.fillStyle='#000'; ctx.font='bold 10px Fredoka One,Arial'; ctx.textAlign='center';
      ctx.fillText('🏁 EXIT',ssx+p.w/2,ssy-5);
    } else if(p.type==='checkpoint'){
      ctx.fillStyle='#102820'; ctx.fillRect(ssx,ssy,p.w,p.h);
      ctx.fillStyle='rgba(0,255,100,0.4)'; ctx.fillRect(ssx,ssy,p.w,2);
      ctx.fillStyle='#00ff88'; ctx.font='7px Nunito,Arial'; ctx.textAlign='center';
      ctx.fillText('💾 SAVE',ssx+p.w/2,ssy-4);
    } else if(p.type==='boss'){
      ctx.fillStyle='#2a0000'; ctx.fillRect(ssx,ssy,p.w,p.h);
      ctx.fillStyle='rgba(255,0,0,0.4)'; ctx.fillRect(ssx,ssy,p.w,2);
    } else if(p.type==='collapse'){
      const shakeX=p.collapsing?Math.sin(Date.now()/40)*3:0;
      const frac=Math.min(1,p.collapseTimer/p.collapseMax);
      const r=Math.round(lerp(60,180,frac)),g=Math.round(lerp(70,20,frac)),b=Math.round(lerp(130,20,frac));
      ctx.fillStyle=`rgb(${r},${g},${b})`; ctx.fillRect(ssx+shakeX,ssy,p.w,p.h);
      ctx.fillStyle=`rgba(255,120,50,${frac*0.7})`; ctx.fillRect(ssx+shakeX,ssy,p.w,2);
      if(frac>0.45){ ctx.strokeStyle=`rgba(255,60,0,${frac})`; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(ssx+shakeX+p.w*0.3,ssy); ctx.lineTo(ssx+shakeX+p.w*0.4,ssy+p.h); ctx.stroke(); }
    } else if(p.type==='seesaw'){
      ctx.save(); ctx.translate(ssx+p.w/2,ssy+p.h/2); ctx.rotate(p.tilt);
      const pg=ctx.createLinearGradient(-p.w/2,0,p.w/2,0);
      pg.addColorStop(0,'#1a4080'); pg.addColorStop(0.5,'#3a70c8'); pg.addColorStop(1,'#1a4080');
      ctx.fillStyle=pg; ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
      ctx.fillStyle='#FFD700'; ctx.beginPath(); ctx.arc(0,0,4,0,Math.PI*2); ctx.fill();
      ctx.restore();
    } else {
      // Zone-tinted platform colours
      const zoneHues=[220,200,195,210,180,160];
      const zh=zoneHues[Math.min(p.zone||0,5)];
      const baseCol=p.moving?`hsl(${zh},55%,20%)`:'#1e2438';
      ctx.fillStyle=baseCol; ctx.fillRect(ssx,ssy,p.w,p.h);
      const edgeCol=p.moving?`hsla(${zh},100%,70%,0.7)`:'rgba(100,140,220,0.35)';
      ctx.fillStyle=edgeCol; ctx.fillRect(ssx,ssy,p.w,2);
      // Floor tile marks
      ctx.strokeStyle='rgba(60,80,140,0.3)'; ctx.lineWidth=1;
      for(let tx=ssx+20;tx<ssx+p.w;tx+=20){ ctx.beginPath(); ctx.moveTo(tx,ssy+3); ctx.lineTo(tx,ssy+p.h); ctx.stroke(); }
      // Metal edge strip
      ctx.fillStyle='rgba(140,180,255,0.22)'; ctx.fillRect(ssx,ssy+p.h-3,p.w,3);
      // Moving platform arrows
      if(p.moving){
        const arrowCol=`hsl(${zh},100%,75%)`;
        ctx.fillStyle=arrowCol; ctx.font='8px Arial'; ctx.textAlign='center';
        ctx.fillText(p.moveDir>0?'▶':'◀',ssx+p.w/2,ssy+p.h-2);
      }
      if(p.floor&&p.floor%5===0){ ctx.fillStyle='#ffffffaa'; ctx.font='bold 8px Nunito,Arial'; ctx.textAlign='left'; ctx.fillText('Fl.'+p.floor,ssx+3,ssy+11); }
    }
  }
}

// ── DOORS ────────────────────────────────────────────────────
function drawDoors(){
  const t=Date.now()/1000;
  for(const d of doors){
    const dssy=sw(d.y), dssx=sx(d.x);
    if(dssy>H||dssy+d.h<0||dssx>W||dssx+d.w<0) continue;
    if(d.open){ if(d.openProgress<1) d.openProgress+=0.03; ctx.globalAlpha=Math.max(0,1-d.openProgress*2); }
    const col=KEY_COLORS[d.color];
    // Gate body
    const closedH=d.h*(1-d.openProgress);
    ctx.fillStyle='#0a0c18'; ctx.fillRect(dssx,dssy,d.w,closedH);
    if(!d.open||d.openProgress<1){
      // Glow border
      ctx.shadowColor=col; ctx.shadowBlur=10+Math.sin(t*2)*4;
      ctx.strokeStyle=col; ctx.lineWidth=2.5;
      ctx.strokeRect(dssx+1,dssy+1,d.w-2,closedH-2); ctx.shadowBlur=0;
      // Keyhole
      const kx=dssx+d.w/2, ky=dssy+closedH*0.38;
      ctx.fillStyle=col;
      ctx.beginPath(); ctx.arc(kx,ky,5,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(kx-4,ky+3); ctx.lineTo(kx+4,ky+3); ctx.lineTo(kx+2,ky+14); ctx.lineTo(kx-2,ky+14); ctx.closePath(); ctx.fill();
      // Bar lines on gate
      ctx.strokeStyle=`rgba(${d.color==='gold'?'255,200,50':d.color==='silver'?'180,200,230':'180,120,50'},0.25)`;
      ctx.lineWidth=1;
      for(let by=dssy+30;by<dssy+closedH-10;by+=30){ ctx.beginPath(); ctx.moveTo(dssx+4,by); ctx.lineTo(dssx+d.w-4,by); ctx.stroke(); }
      // Label
      ctx.fillStyle=col; ctx.font='bold 7px Nunito,Arial'; ctx.textAlign='center';
      ctx.fillText(d.color.toUpperCase()+' DOOR',dssx+d.w/2,dssy-5);
    }
    ctx.globalAlpha=1;
  }
}

// ── MATH TRIGGERS ────────────────────────────────────────────
function drawMathTriggers(){
  const t=Date.now()/600;
  for(const mt of mathTriggers){
    if(mt.triggered) continue;
    const mssy=sw(mt.y), mssx=sx(mt.x);
    if(mssy>H||mssy+mt.h<0||mssx>W) continue;
    ctx.save(); ctx.translate(mssx+mt.w/2,mssy+mt.h/2); ctx.rotate(Math.sin(t)*0.18);
    ctx.shadowColor='#FFD700'; ctx.shadowBlur=12+Math.sin(t*2)*4; ctx.fillStyle='#FFD700';
    ctx.beginPath();
    for(let a=0;a<5;a++){ const ag=(a*2*Math.PI/5)-Math.PI/2; ctx[a===0?'moveTo':'lineTo'](Math.cos(ag)*16,Math.sin(ag)*16); }
    ctx.closePath(); ctx.fill(); ctx.shadowBlur=0;
    ctx.fillStyle='#1a1000'; ctx.font='bold 13px Fredoka One,Arial'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('?',0,1);
    ctx.restore();
  }
}

// ── COLLECTIBLES ─────────────────────────────────────────────
function drawCollectibles(){
  const t=Date.now()/300;
  for(const col of collectibles){
    if(col.collected) continue;
    const cssy=sw(col.y+Math.sin(col.bob)*3), cssx=sx(col.x);
    if(cssy>H||cssy<-24||cssx>W||cssx+col.w<0) continue;
    if(col.type==='diamond'){
      ctx.save(); ctx.translate(cssx+col.w/2,cssy+col.h/2); ctx.rotate(t*0.4);
      ctx.shadowColor='#00FFFF'; ctx.shadowBlur=10; ctx.fillStyle='#00CCDD';
      ctx.beginPath(); ctx.moveTo(0,-8); ctx.lineTo(8,0); ctx.lineTo(0,8); ctx.lineTo(-8,0); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#aaeeff'; ctx.beginPath(); ctx.moveTo(0,-8); ctx.lineTo(5,-1); ctx.lineTo(0,1); ctx.lineTo(-5,-1); ctx.closePath(); ctx.fill();
      ctx.shadowBlur=0; ctx.restore();
    } else if(col.type==='food'){
      ctx.font='18px Arial'; ctx.textAlign='center'; ctx.fillText(col.food.icon,cssx+col.w/2,cssy+col.h+2);
      ctx.fillStyle='#88ff88'; ctx.font='bold 8px Nunito,Arial'; ctx.fillText('+'+col.food.heal,cssx+col.w/2,cssy-1);
    } else if(col.type==='key'){
      const kc=KEY_COLORS[col.keyColor];
      ctx.save(); ctx.translate(cssx+col.w/2,cssy+col.h/2); ctx.rotate(Math.sin(t*0.3)*0.15-0.4);
      ctx.shadowColor=kc; ctx.shadowBlur=10+Math.sin(t)*4;
      ctx.strokeStyle=kc; ctx.lineWidth=3; ctx.lineCap='round';
      ctx.beginPath(); ctx.arc(-4,0,5,0,Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(1,0); ctx.lineTo(10,0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(7,0); ctx.lineTo(7,3); ctx.moveTo(9,0); ctx.lineTo(9,3); ctx.stroke();
      ctx.shadowBlur=0; ctx.restore();
      ctx.fillStyle=kc; ctx.font='bold 7px Nunito,Arial'; ctx.textAlign='center';
      ctx.fillText(col.keyColor,cssx+col.w/2,cssy+col.h+10);
    } else if(col.type==='checkpoint'){
      ctx.save(); ctx.translate(cssx+col.w/2,cssy+col.h/2);
      ctx.shadowColor='#00ff88'; ctx.shadowBlur=14+Math.sin(t)*5;
      ctx.fillStyle='#00bb66'; ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#fff'; ctx.font='12px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('💾',0,1);
      ctx.shadowBlur=0; ctx.restore();
    }
  }
}

// ── PROJECTILES ───────────────────────────────────────────────
function drawProjectiles(){
  for(const p of projectiles){
    const psx=sx(p.x), psy=sw(p.y);
    ctx.shadowColor=p.fromBoss?'#ff2200':'#ff8800'; ctx.shadowBlur=8;
    ctx.fillStyle=p.fromBoss?'#ff3300':'#ff9900';
    ctx.beginPath(); ctx.arc(psx,psy,p.r,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
  }
}

// ── ENEMIES ───────────────────────────────────────────────────
const BOSS_NAMES=['Scorpion King','Sand Serpent','Storm Guard','Office Titan','Sky Phantom','Spire Lord'];
function drawEnemyShape(en,esx,esyBot){
  const t=en.animTick, at=en.attackAnim||0;
  const d=en.isBoss?{body:'#aa1100',helm:'#660000',size:'large'}:en.def;
  const sc=d.size==='small'?0.70:d.size==='large'?1.35:1.0;
  const face=en.facing||1;
  ctx.save(); ctx.translate(esx,esyBot); ctx.scale(face*sc,sc);
  const bob=en.flies?Math.sin(en.phase)*6:0;
  ctx.translate(0,bob);
  const leg=en.dead?0:Math.sin(t*0.16)*10;
  // Legs
  [[-5,leg],[5,-leg]].forEach(([lx,ly])=>{ ctx.fillStyle=d.body; ctx.fillRect(lx-3,-20+ly,6,15); ctx.fillStyle='#111'; ctx.beginPath(); ctx.ellipse(lx,-5+ly,4,2.5,0,0,Math.PI*2); ctx.fill(); });
  // Body
  ctx.fillStyle=d.body; ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(-9,-38,18,20,2); else ctx.rect(-9,-38,18,20); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.1)'; ctx.fillRect(-6,-36,5,16);
  // Arms
  const armAng=at>0?-0.8+at*0.08:0.1;
  ctx.fillStyle=d.body; ctx.fillRect(-13,-32,6,12);
  ctx.save(); ctx.translate(10,-32); ctx.rotate(armAng); ctx.fillStyle=d.body; ctx.fillRect(-3,0,6,12);
  if(d.size!=='small'){ ctx.strokeStyle=d.size==='large'?'#FFD700':'#999'; ctx.lineWidth=2; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(0,8); ctx.lineTo(0,-16); ctx.stroke(); ctx.fillStyle=d.size==='large'?'#FFD700':'#aaa'; ctx.beginPath(); ctx.moveTo(-3,-16); ctx.lineTo(0,-22); ctx.lineTo(3,-16); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  // Head
  ctx.fillStyle='#e8c090'; ctx.beginPath(); ctx.arc(0,-44,7,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#cc0000'; ctx.beginPath(); ctx.arc(2.5,-44,1.5,0,Math.PI*2); ctx.fill();
  // Helmet
  ctx.fillStyle=d.helm; ctx.fillRect(-9,-52,18,11);
  ctx.fillStyle='rgba(255,80,0,0.8)'; ctx.fillRect(-7,-50,14,3);
  if(d.size==='large'){ ctx.fillStyle='#ff4400'; ctx.beginPath(); ctx.moveTo(-4,-52); ctx.lineTo(0,-59); ctx.lineTo(4,-52); ctx.closePath(); ctx.fill(); }
  if(d.size==='small'){ ctx.fillStyle='#aa0000'; [[-7,-52,-10,-58],[ 7,-52,10,-58]].forEach(([x1,y1,x2,y2])=>{ ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.lineTo(x1+3,y1); ctx.closePath(); ctx.fill(); }); }
  if(en.flies){ ctx.globalAlpha=0.3; ctx.fillStyle='#4488ff'; ctx.beginPath(); ctx.ellipse(0,-20,14,28,0,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1; }
  ctx.restore();
}

function drawEnemies(){
  for(const en of enemies){
    if(en.dead&&en.deadTimer>35) continue;
    const esx=sx(en.x+en.w/2), esyTop=sw(en.y), esyBot=sw(en.y+en.h);
    if(esyBot<-80||esyTop>H+80||esx<-60||esx>W+60) continue;
    ctx.globalAlpha=en.dead?Math.max(0,1-en.deadTimer/35):(en.stunned>0?0.45:1);
    if(en.isBoss){ ctx.shadowColor='#ff2200'; ctx.shadowBlur=18; }
    drawEnemyShape(en,esx,esyBot);
    ctx.shadowBlur=0;
    if(en.isBoss){
      const bw=Math.min(200,W-40), bx=esx-bw/2;
      ctx.fillStyle='#1a0000'; ctx.fillRect(bx,esyTop-22,bw,10);
      ctx.fillStyle=`hsl(${(en.hp/en.maxHp)*120},100%,50%)`; ctx.fillRect(bx,esyTop-22,bw*(en.hp/en.maxHp),10);
      ctx.strokeStyle='#ff4444'; ctx.lineWidth=1; ctx.strokeRect(bx,esyTop-22,bw,10);
      ctx.fillStyle='#fff'; ctx.font='bold 9px Nunito,Arial'; ctx.textAlign='center';
      ctx.fillText(BOSS_NAMES[Math.min(en.zoneId,5)],esx,esyTop-24);
    } else if(!en.dead&&en.hp<en.maxHp){
      ctx.fillStyle='#222'; ctx.fillRect(sx(en.x),esyTop-8,en.w,4);
      ctx.fillStyle='#ff4400'; ctx.fillRect(sx(en.x),esyTop-8,en.w*(en.hp/en.maxHp),4);
    }
    ctx.globalAlpha=1;
  }
}

// ── PLAYER ────────────────────────────────────────────────────
const RF=[[0.44,-0.60,-0.36,0.50,0.30],[0.18,-0.22,-0.12,0.18,0.10],[-0.36,0.50,0.44,-0.60,-0.30],[-0.12,0.18,0.18,-0.22,-0.10],[0.44,-0.60,-0.36,0.50,0.30],[0.18,-0.22,-0.12,0.18,0.10]];
function drawLimb2(x1,y1,ang1,r2,len,col,w){
  const kx=x1+Math.sin(ang1)*len,ky=y1+Math.cos(ang1)*len,a2=ang1+r2,fx=kx+Math.sin(a2)*len,fy=ky+Math.cos(a2)*len;
  ctx.strokeStyle=col;ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(kx,ky);ctx.lineTo(fx,fy);ctx.stroke();
  ctx.fillStyle=col;ctx.beginPath();ctx.arc(kx,ky,w/2+0.5,0,Math.PI*2);ctx.fill();return{fx,fy};
}
function drawPlayer(){
  ctx.globalAlpha=(PL.invincible>0&&Math.floor(PL.invincible/5)%2===0)?0.3:1;
  const ppx=sx(PL.x+PL.w/2),ppy=sw(PL.y),ppby=ppy+PL.h;
  const skin=skins[PL.skinIdx],wep=weapons[PL.weaponIdx];
  const running=PL.onGround&&Math.abs(PL.vx)>0.4,jumping=!PL.onGround;
  const sqY=PL.landTick>0?1+PL.landTick*0.04:1,sqX=PL.landTick>0?1-PL.landTick*0.03:1;
  ctx.fillStyle='rgba(0,0,0,0.22)';ctx.beginPath();ctx.ellipse(ppx,ppby+2,PL.w/2*sqX,5,0,0,Math.PI*2);ctx.fill();
  ctx.save();ctx.translate(ppx,ppy);ctx.scale(PL.facing*sqX,sqY);
  const headR=8,headY=8,shouldY=17,hipY=PL.h-13,tL=10,cL=10;
  let lH,lK,rH,rK,armA;
  if(PL.wallSliding){lH=-0.2;lK=-0.4;rH=0.2;rK=-0.4;armA=-0.8;}
  else if(jumping){const str=PL.vy<0?-0.3:0.15;lH=str-0.15;lK=-0.45;rH=str+0.15;rK=-0.45;armA=-0.45;}
  else if(running){[lH,lK,rH,rK,armA]=RF[PL.runFrame];}
  else{lH=-0.05;lK=0.03;rH=0.05;rK=-0.03;armA=0.15;}
  if(PL.attacking){const at=1-PL.attackTimer/22;armA=-0.4+at*1.6;}
  drawLimb2(4,shouldY+2,armA*0.6,0.15,9,skin.shirt+'bb',4);
  drawLimb2(3,hipY,rH,rK,tL,skin.legs+'bb',5);
  ctx.fillStyle=skin.shirt;ctx.beginPath();if(ctx.roundRect)ctx.roundRect(-7,shouldY,14,hipY-shouldY,4);else ctx.rect(-7,shouldY,14,hipY-shouldY);ctx.fill();
  ctx.fillStyle=skin.head;ctx.fillRect(-4,shouldY,8,5);
  ctx.fillStyle=skin.head;ctx.beginPath();ctx.arc(0,headY,headR,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#2a1400';ctx.beginPath();ctx.arc(3,headY+1,1.5,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#2a1400';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(0,headY+4,3,0.2,Math.PI-0.2);ctx.stroke();
  if(PL.skinIdx===1){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,headY-2,headR,Math.PI,0);ctx.fill();ctx.fillStyle='#cc2200';ctx.fillRect(-headR,headY-3,headR*2,3);}
  else if(PL.skinIdx===5){ctx.fillStyle='#FFD700';ctx.beginPath();ctx.arc(0,headY-2,headR+2,Math.PI,0);ctx.fill();ctx.fillStyle='#aa7700';ctx.fillRect(-headR-2,headY-2,(headR+2)*2,3);}
  drawLimb2(-3,hipY,lH,lK,tL,skin.legs,5);
  const gfxy=(hx,ha,ka)=>{const kx=hx+Math.sin(ha)*tL,ky=hipY+Math.cos(ha)*tL,a2=ha+ka;return{x:kx+Math.sin(a2)*cL,y:ky+Math.cos(a2)*cL};};
  const lf=gfxy(-3,lH,lK),rf=gfxy(3,rH,rK);
  ctx.fillStyle='#111';ctx.beginPath();ctx.ellipse(lf.x,lf.y+2,5,3,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(rf.x,rf.y+2,5,3,0,0,Math.PI*2);ctx.fill();
  const fA=drawLimb2(5,shouldY+2,armA,0.2,9,skin.shirt,4);
  ctx.save();ctx.translate(fA.fx,fA.fy);ctx.rotate(armA+0.2);
  ctx.shadowColor=wep.color;ctx.shadowBlur=PL.attacking?16:4;
  ctx.strokeStyle=wep.color;ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-wep.len);ctx.stroke();
  ctx.strokeStyle='#888';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-6,-8);ctx.lineTo(6,-8);ctx.stroke();
  if(PL.attacking){ctx.globalAlpha=0.3;ctx.fillStyle=wep.color;ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,wep.len,-Math.PI/2-0.6,-Math.PI/2+0.6);ctx.closePath();ctx.fill();ctx.globalAlpha=1;}
  ctx.shadowBlur=0;ctx.restore();
  ctx.restore();ctx.globalAlpha=1;
}

// ── PARTICLES & FIREWORKS ─────────────────────────────────────
function drawParticles(){
  for(const p of particles){ctx.globalAlpha=p.life/p.maxLife;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(sx(p.x),sw(p.y),Math.max(0.5,p.size*(p.life/p.maxLife)),0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
}
function drawFireworks(){
  for(const f of fireworks){ctx.globalAlpha=(f.life/f.maxLife)*0.9;ctx.fillStyle=f.color;ctx.shadowColor=f.color;ctx.shadowBlur=8;ctx.beginPath();ctx.arc(sx(f.x),sw(f.y),f.size*(f.life/f.maxLife),0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}ctx.globalAlpha=1;
}

// ── HUD ───────────────────────────────────────────────────────
function drawHUD(){
  ctx.textAlign='left';
  const bx=8,by=H-28,bw=110,bh=16;
  ctx.fillStyle='rgba(0,0,0,0.6)';ctx.beginPath();if(ctx.roundRect)ctx.roundRect(bx-2,by-2,bw+4,bh+4,6);else ctx.rect(bx-2,by-2,bw+4,bh+4);ctx.fill();
  ctx.fillStyle='#111';ctx.beginPath();if(ctx.roundRect)ctx.roundRect(bx,by,bw,bh,4);else ctx.rect(bx,by,bw,bh);ctx.fill();
  const ratio=PL.hp/PL.maxHp;
  const hg=ctx.createLinearGradient(bx,by,bx+bw,by);
  if(ratio>.6){hg.addColorStop(0,'#00cc44');hg.addColorStop(1,'#00ff88');}
  else if(ratio>.3){hg.addColorStop(0,'#cc8800');hg.addColorStop(1,'#ffcc00');}
  else{hg.addColorStop(0,'#aa2200');hg.addColorStop(1,'#ff4400');}
  ctx.fillStyle=hg;ctx.beginPath();if(ctx.roundRect)ctx.roundRect(bx,by,bw*ratio,bh,4);else ctx.rect(bx,by,bw*ratio,bh);ctx.fill();
  ctx.strokeStyle='#FFD700';ctx.lineWidth=1.5;ctx.beginPath();if(ctx.roundRect)ctx.roundRect(bx,by,bw,bh,4);else ctx.rect(bx,by,bw,bh);ctx.stroke();
  ctx.fillStyle='#fff';ctx.font='bold 9px Nunito,Arial';ctx.textAlign='center';ctx.fillText('❤️ '+PL.hp+'/'+PL.maxHp,bx+bw/2,by+12);

  const pills=[{t:'⚔️ '+weapons[PL.weaponIdx].name,x:8,y:8},{t:'🏢 '+getZone(PL.x).name.split(' ').slice(1).join(' '),x:8,y:26},{t:'💎 '+diamonds,x:8,y:44}];
  pills.forEach(p=>{
    ctx.fillStyle='rgba(0,0,0,0.55)';ctx.beginPath();const tw=ctx.measureText(p.t).width;if(ctx.roundRect)ctx.roundRect(p.x-3,p.y-1,tw+10,16,8);else ctx.rect(p.x-3,p.y-1,tw+10,16);ctx.fill();
    ctx.fillStyle='#fff';ctx.font='bold 11px Nunito,Arial';ctx.textAlign='left';ctx.fillText(p.t,p.x+2,p.y+11);
  });

  // Key inventory
  let kx=8,ky=62;
  for(const[kc,count] of Object.entries(keyInv)){
    if(!count) continue;
    ctx.fillStyle='rgba(0,0,0,0.55)';ctx.beginPath();if(ctx.roundRect)ctx.roundRect(kx-2,ky-1,46,15,5);else ctx.rect(kx-2,ky-1,46,15);ctx.fill();
    ctx.fillStyle=KEY_COLORS[kc];ctx.font='bold 10px Nunito,Arial';ctx.textAlign='left';ctx.fillText('🔑×'+count,kx+1,ky+11);kx+=52;
  }

  ctx.fillStyle='rgba(0,0,0,0.5)';ctx.beginPath();if(ctx.roundRect)ctx.roundRect(W-44,8,38,16,8);else ctx.rect(W-44,8,38,16);ctx.fill();
  ctx.fillStyle='#FFD700';ctx.font='bold 10px Nunito,Arial';ctx.textAlign='center';ctx.fillText('Lv.'+gameLevel,W-25,20);
  ctx.fillStyle='#ffffff44';ctx.font='9px Nunito,Arial';ctx.textAlign='right';ctx.fillText('M=Map  S=Shop',W-6,H-8);

  if(fireworkTimer>0){
    ctx.fillStyle='rgba(0,0,0,0.7)';ctx.beginPath();if(ctx.roundRect)ctx.roundRect(W/2-110,H/2-22,220,40,10);else ctx.rect(W/2-110,H/2-22,220,40);ctx.fill();
    ctx.fillStyle='#FFD700';ctx.font='bold 16px Fredoka One,Arial';ctx.textAlign='center';ctx.fillText('🎆 LEVEL COMPLETE! 🎆',W/2,H/2+6);
  }

  // Combo display
  if(combo>=2&&comboTimer>0){
    const fade=Math.min(1,comboTimer/90);
    const sz=Math.min(30,14+combo*2);
    const hue=(combo*42)%360;
    const ch=`hsl(${hue},100%,65%)`;
    ctx.save();
    ctx.globalAlpha=fade;
    ctx.shadowColor=ch; ctx.shadowBlur=18;
    ctx.font=`bold ${sz}px Fredoka One,Arial`; ctx.textAlign='center';
    ctx.fillStyle=ch;
    ctx.fillText(combo+'× COMBO!',W/2,66);
    if(combo>=5){ctx.font='bold 11px Nunito,Arial';ctx.fillStyle='#fff';ctx.fillText('🔥 ON FIRE!',W/2,82);}
    ctx.shadowBlur=0; ctx.restore(); ctx.globalAlpha=1;
  }
}

// ── MAP ───────────────────────────────────────────────────────
function drawMap(){
  const mw=200,mh=90,mx=(W-mw)/2,my=H/2-60;
  ctx.fillStyle='rgba(2,6,25,0.95)';ctx.beginPath();if(ctx.roundRect)ctx.roundRect(mx-4,my-28,mw+8,mh+52,10);else ctx.rect(mx-4,my-28,mw+8,mh+52);ctx.fill();
  ctx.strokeStyle='#FFD70077';ctx.lineWidth=1.5;ctx.beginPath();if(ctx.roundRect)ctx.roundRect(mx-4,my-28,mw+8,mh+52,10);else ctx.rect(mx-4,my-28,mw+8,mh+52);ctx.stroke();
  ctx.fillStyle='#FFD700';ctx.font='bold 11px Fredoka One,Arial';ctx.textAlign='center';ctx.fillText('🗺️  FLOOR MAP',mx+mw/2,my-12);
  const scX=mw/WORLD_W,scY=mh/(GROUND_Y-GOAL_Y);
  ctx.fillStyle='rgba(20,40,80,0.4)';ctx.fillRect(mx,my,mw,mh);
  platforms.filter(p=>p.type==='platform'||p.type==='checkpoint'||p.type==='boss').forEach(p=>{
    const px2=mx+p.origX*scX,py2=my+Math.max(0,(p.origY-GOAL_Y)*scY-2);
    if(py2<my||py2>my+mh) return;
    ctx.fillStyle=p.type==='boss'?'#ff4444cc':p.type==='checkpoint'?'#00cc66cc':'#3a5080cc';
    ctx.fillRect(px2,py2,p.w*scX,3);
  });
  doors.forEach(d=>{ const dx=mx+d.x*scX; ctx.fillStyle=d.open?'#00ff8866':KEY_COLORS[d.color]+'cc'; ctx.fillRect(dx,my,3,mh); });
  const plx=mx+PL.x*scX,ply=my+(PL.y-GOAL_Y)*scY;
  if(ply>=my&&ply<=my+mh){ ctx.fillStyle='#FFD700';ctx.beginPath();ctx.arc(plx,ply,5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke(); }
  ctx.fillStyle='#666';ctx.font='9px Nunito,Arial';ctx.textAlign='center';ctx.fillText('M to close',mx+mw/2,my+mh+20);
}

// ── GAME OVER ─────────────────────────────────────────────────
function drawGameOver(){
  ctx.fillStyle='rgba(0,0,18,0.9)';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#ff4444';ctx.font='bold 44px Fredoka One,Arial';ctx.textAlign='center';ctx.fillText('GAME OVER',W/2,H/2-60);
  ctx.fillStyle='#FFD700';ctx.font='18px Fredoka One,Arial';ctx.fillText('Zone: '+getZone(PL.x).name,W/2,H/2-20);ctx.fillText('💎 '+diamonds+' diamonds',W/2,H/2+10);
  ctx.fillStyle='#88aaff';ctx.font='14px Nunito,Arial';ctx.fillText('Press R to try again!',W/2,H/2+50);
  ctx.fillStyle='#ffffff33';ctx.font='10px Nunito,Arial';ctx.fillText('📚 Flynn Hurley · Tamborine Mountain State School · Class 4J',W/2,H/2+80);
}

// ── MAIN LOOP ─────────────────────────────────────────────────
let running=false;
function loop(){ update(); draw(); requestAnimationFrame(loop); }
document.getElementById('startBtn').onclick=()=>{
  document.getElementById('titleScreen').style.display='none';
  generateLevel(1); state='playing';
  bgMusic.play();
  if(!running){running=true;loop();}
};
(function titleBG(){
  if(state!=='title') return;
  const t=Date.now()/1000;
  // Night sky gradient
  const skyG=ctx.createLinearGradient(0,0,0,H);
  skyG.addColorStop(0,'#020610'); skyG.addColorStop(0.65,'#060f1f'); skyG.addColorStop(1,'#091828');
  ctx.fillStyle=skyG; ctx.fillRect(0,0,W,H);
  // Stars
  for(let i=0;i<90;i++){
    const stx=(i*137+71)%W, sty=(i*97)%(H*0.68);
    const twinkle=0.25+Math.sin(t*1.8+i*0.7)*0.3;
    ctx.fillStyle=`rgba(255,255,255,${Math.max(0,twinkle)})`;
    ctx.fillRect(stx,sty,i%4===0?2:1,i%4===0?2:1);
  }
  // City skyline at bottom
  for(let b=0;b<18;b++){
    const bx=(b*27+((b*17)%22));
    const bh=35+((b*23+7)%90);
    const bw=18+((b*13)%16);
    ctx.fillStyle='#040c18'; ctx.fillRect(bx,H-bh,bw,bh);
    for(let wr=1;wr<Math.floor(bh/11);wr++){
      for(let wc=0;wc<2;wc++){
        if((b*7+wr*3+wc)%4<3){
          const flicker=Math.sin(t*2+b*0.5+wr)>0;
          ctx.fillStyle=flicker?`rgba(255,220,100,${0.25+Math.sin(t+b+wr)*0.08})`:'rgba(160,200,255,0.15)';
          ctx.fillRect(bx+2+wc*9,H-bh+4+wr*11,6,5);
        }
      }
    }
  }
  // Burj Khalifa silhouette
  const bkx=W/2, bkBase=H+5;
  // Tower sections (setback profile)
  const sections=[
    {y:bkBase,    w:86}, {y:bkBase-70, w:76}, {y:bkBase-140,w:66},
    {y:bkBase-200,w:56}, {y:bkBase-260,w:46}, {y:bkBase-310,w:36},
    {y:bkBase-350,w:26}, {y:bkBase-385,w:18}, {y:bkBase-415,w:11},
    {y:bkBase-440,w:6},
  ];
  // Shadow/glow behind building
  const bglow=ctx.createRadialGradient(bkx,bkBase-220,10,bkx,bkBase-220,160);
  bglow.addColorStop(0,'rgba(50,80,160,0.18)'); bglow.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=bglow; ctx.fillRect(bkx-160,bkBase-440,320,460);
  // Tower body sections
  for(let i=0;i<sections.length-1;i++){
    const s1=sections[i], s2=sections[i+1];
    ctx.fillStyle=`rgba(10,18,40,${0.92-i*0.01})`;
    ctx.beginPath();
    ctx.moveTo(bkx-s1.w/2,s1.y); ctx.lineTo(bkx+s1.w/2,s1.y);
    ctx.lineTo(bkx+s2.w/2,s2.y); ctx.lineTo(bkx-s2.w/2,s2.y);
    ctx.closePath(); ctx.fill();
    // Edge highlight
    ctx.strokeStyle='rgba(80,120,200,0.15)'; ctx.lineWidth=1;
    ctx.stroke();
  }
  // Spire
  const spireTop=bkBase-490+Math.sin(t*0.4)*2;
  ctx.fillStyle='#0f1c36';
  ctx.beginPath(); ctx.moveTo(bkx-3,sections[sections.length-1].y); ctx.lineTo(bkx,spireTop); ctx.lineTo(bkx+3,sections[sections.length-1].y); ctx.closePath(); ctx.fill();
  // Blinking antenna light
  const blink=Math.sin(t*2.5)>0;
  ctx.shadowColor='#ff5555'; ctx.shadowBlur=blink?12:4;
  ctx.fillStyle=blink?'#ff4444':'#882222';
  ctx.beginPath(); ctx.arc(bkx,spireTop,blink?3:2,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0;
  // Windows on tower (animated)
  for(let fl=0;fl<18;fl++){
    const fy=bkBase-18-fl*23;
    const secIdx=Math.min(Math.floor(fl/2.2),sections.length-2);
    const fw=sections[secIdx].w*0.72;
    const cols=Math.max(2,Math.floor(fw/14));
    for(let ww=0;ww<cols;ww++){
      const lit=(fl*cols+ww+Math.floor(t*0.6))%5<3;
      if(lit){
        const brightness=0.18+Math.sin(t*1.2+fl*0.4+ww)*0.06;
        ctx.fillStyle=`rgba(255,215,90,${brightness})`;
        ctx.fillRect(bkx-fw/2+(ww/cols)*fw+2,fy,fw/cols-3,4);
      }
    }
  }
  // Gold edge glow lines on tower
  ctx.strokeStyle='rgba(200,160,40,0.12)'; ctx.lineWidth=1;
  sections.forEach(s=>{ ctx.beginPath(); ctx.moveTo(bkx-s.w/2,s.y); ctx.lineTo(bkx+s.w/2,s.y); ctx.stroke(); });
  ctx.globalAlpha=1;
  requestAnimationFrame(titleBG);
})();
