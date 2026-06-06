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

// ── SOUND (Web Audio API) ──────────────────────────────────────
let _audioCtx = null, soundEnabled = true;
function _ac(){ if(!_audioCtx) _audioCtx=new(window.AudioContext||window.webkitAudioContext)(); return _audioCtx; }
function tone(freq,type,dur,vol=0.22,freqEnd=null){
  if(!soundEnabled) return;
  try{
    const ac=_ac(),o=ac.createOscillator(),g=ac.createGain();
    o.connect(g); g.connect(ac.destination); o.type=type;
    o.frequency.setValueAtTime(freq,ac.currentTime);
    if(freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd,ac.currentTime+dur);
    g.gain.setValueAtTime(vol,ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+dur);
    o.start(ac.currentTime); o.stop(ac.currentTime+dur);
  }catch(e){}
}
const SFX={
  jump:      ()=>tone(300,'square',0.11,0.14,440),
  djump:     ()=>tone(480,'square',0.14,0.12,660),
  walljump:  ()=>tone(260,'square',0.11,0.12,400),
  land:      ()=>tone(100,'square',0.07,0.18,70),
  dash:      ()=>tone(220,'sawtooth',0.08,0.11,380),
  hit:       ()=>tone(110,'sawtooth',0.22,0.32,75),
  diamond:   ()=>tone(900,'sine',0.13,0.07,1150),
  food:      ()=>tone(440,'sine',0.11,0.09,560),
  kill:      ()=>{ tone(250,'sawtooth',0.09,0.28,175); setTimeout(()=>tone(160,'sawtooth',0.11,0.22,95),85); },
  checkpoint:()=>{ [523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,'sine',0.14,0.11),i*80)); },
  correct:   ()=>{ [523,659,784].forEach((f,i)=>setTimeout(()=>tone(f,'sine',0.12,0.11),i*100)); },
  wrong:     ()=>tone(155,'sawtooth',0.28,0.35,90),
  levelUp:   ()=>{ [262,330,392,523,659].forEach((f,i)=>setTimeout(()=>tone(f,'sine',0.18,0.16),i*100)); },
  unlock:    ()=>{ [392,523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,'triangle',0.2,0.15),i*90)); },
};

let paused = false;

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
  // ── Extra questions ─────────────────────────────────────────
  {cat:'maths',y:4,q:"What is 6 × 7?",a:42,opts:[36,40,42,48],fact:"The Burj Khalifa's lobby is 4 storeys high!"},
  {cat:'maths',y:4,q:"What is 8 × 6?",a:48,opts:[42,46,48,56],fact:"Construction started in September 2004!"},
  {cat:'maths',y:4,q:"163 floors × 2 = ?",a:326,opts:[266,306,326,366],fact:"No other building has more than 130 floors above ground!"},
  {cat:'maths',y:4,q:"What is 100 – 37?",a:63,opts:[53,57,63,73],fact:"The Burj Khalifa's foundation has 192 concrete piles!"},
  {cat:'maths',y:4,q:"What is 9 × 12?",a:108,opts:[96,108,118,121],fact:"The building uses 55,000 tonnes of steel rebar!"},
  {cat:'maths',y:4,q:"Half of 828 metres is?",a:414,opts:[404,410,414,420],fact:"The Burj Khalifa's concrete was cooled with ice to withstand the Dubai heat!"},
  {cat:'maths',y:5,q:"What is 45 × 4?",a:180,opts:[160,170,180,200],fact:"The Burj Khalifa is visible from 95 km away on a clear day!"},
  {cat:'maths',y:5,q:"What is 720 ÷ 9?",a:80,opts:[70,75,80,90],fact:"Each window takes 3 to 4 months to clean from top to bottom!"},
  {cat:'maths',y:5,q:"A window is 2.4 m tall. Total height for 50 windows?",a:120,opts:[100,110,120,130],fact:"There are 24,348 individual windows on the Burj Khalifa!"},
  {cat:'maths',y:5,q:"What is 15% of 800?",a:120,opts:[80,100,120,160],fact:"36 workers spend 3 months cleaning all the windows!"},
  {cat:'maths',y:5,q:"What is 12 squared (12²)?",a:144,opts:[121,132,144,156],fact:"The Burj Khalifa was designed by architect Adrian Smith!"},
  {cat:'maths',y:5,q:"What is 25% of 828?",a:207,opts:[182,196,207,220],fact:"The tower sways up to 1.5 metres in strong wind at the top!"},
  {cat:'trivia',y:4,q:"What material makes up most of the Burj Khalifa's exterior?",a:'Glass',opts:['Brick','Glass','Stone','Steel'],fact:"The facade uses 103,000 m² of reflective glass!"},
  {cat:'trivia',y:4,q:"Which ocean is near Dubai?",a:'Indian Ocean',opts:['Pacific','Atlantic','Indian Ocean','Arctic'],fact:"Dubai sits on the Persian Gulf, linked to the Indian Ocean!"},
  {cat:'trivia',y:5,q:"How many workers were on site daily at peak construction?",a:12000,opts:[5000,8000,12000,22000],fact:"At peak, 12,000 workers were on site every single day!"},
  {cat:'trivia',y:5,q:"What record did the Burj Khalifa break?",a:'World\'s tallest building',opts:['Most floors','World\'s tallest building','Most lifts','Fastest elevators'],fact:"It beat the CN Tower record that stood since 1976!"},
  {cat:'maths',y:4,q:"If you climb 5 floors per minute, how many in 20 minutes?",a:100,opts:[80,90,100,110],fact:"The Burj Khalifa's fastest lift takes just 60 seconds to reach floor 124!"},
  {cat:'maths',y:5,q:"The tower is 828 m. The spire is 200 m. How tall is the rest?",a:628,opts:[608,618,628,638],fact:"The radio/TV mast at the very top is hollow steel!"},
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
  if(e.code==='KeyP'&&(state==='playing'||paused)){ paused=!paused; }
  if(e.code==='KeyQ') toggleSound();
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
});
function toggleSound(){
  soundEnabled=!soundEnabled;
  const el=document.getElementById('soundBtn');
  if(el) el.textContent=soundEnabled?'🔊':'🔇';
}
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
    const isEarly = cx < 520; // zone 0 — keep gentle so first area is learnable
    const maxH = isEarly ? 55 : MAX_H_GAP;
    const hgap = 20 + Math.random()*(maxH - 20);
    cx = prevRight + hgap;
    const dy = isEarly
      ? -4 + (Math.random()-0.5)*18  // gentle rise: max ~13px up per step
      : -10 + (Math.random()-0.5)*MAX_V_GAP;
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
  platforms.unshift({x:0, y:GROUND_Y, w:500, h:20, type:'ground',
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
  platforms.filter(p=>p.type==='platform'&&p.zone>=2).forEach(p=>{
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
  platforms.filter(p=>p.type==='platform'&&p.floor>3).forEach(p=>{
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
  [0,1,2].forEach((zi,ki)=>{
    const zonePlats=platforms.filter(p=>p.zone===zi&&p.type==='platform');
    if(zonePlats.length>0){
      const p=zonePlats[Math.floor(zonePlats.length/2)];
      collectibles.push({x:p.x+p.w/2-8, y:p.y-28, w:16, h:20, type:'key',
        keyColor:keyTypes[ki], collected:false, bob:Math.random()*Math.PI*2});
    }
  });

  // Doors removed — keys now give bonus diamonds instead

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
        diamonds+=15; buildingFlash=90; SFX.correct();
        setTimeout(()=>{ closeMath(); if(cb) cb(true); },900);
      } else {
        fb.textContent=`❌ Answer: ${q.a} — keep practising!`; fb.style.color='#c62828';
        PL.hp=Math.max(0,PL.hp-1); SFX.wrong();
        setTimeout(()=>{ closeMath(); if(cb) cb(false); if(PL.hp<=0) gameOver(); },1800);
      }
    };
    ad.appendChild(btn);
  });
  document.getElementById('mathOverlay').classList.add('active');
}
function closeMath(){ document.getElementById('mathOverlay').classList.remove('active'); state='playing'; }

// ── ABILITY UNLOCK ────────────────────────────────────────────
function unlockAbility(key, name, desc){
  abilities[key] = true;
  document.getElementById('abilityNameEl').textContent = name;
  document.getElementById('abilityDescEl').textContent = desc;
  const el = document.getElementById('abilityPopup');
  el.classList.add('show');
  SFX.unlock();
  setTimeout(()=> el.classList.remove('show'), 3500);
}

// ── HIGH SCORES ───────────────────────────────────────────────
function loadHS(){ try{ return JSON.parse(localStorage.getItem('burjHS')||'{}'); }catch(e){ return {}; } }
function saveHS(){
  try{
    const hs = loadHS();
    hs.level    = Math.max(hs.level    || 1, gameLevel);
    hs.diamonds = Math.max(hs.diamonds || 0, diamonds);
    hs.combo    = Math.max(hs.combo    || 0, comboMax);
    localStorage.setItem('burjHS', JSON.stringify(hs));
  }catch(e){}
}

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
  if(paused) return;

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
      spawnParts(PL.x+PL.w/2,PL.y+PL.h/2,'#ff8800aa',8,5); SFX.dash();
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
      spawnParts(PL.x+PL.w/2,PL.y+PL.h/2,'#00ff88aa',6,3); SFX.walljump();
    } else if(PL.coyote>0){
      PL.vy=-8;PL.coyote=0;PL.onGround=false;
      spawnParts(PL.x+PL.w/2,PL.y+PL.h,'#FFD70077',4); SFX.jump();
    } else if(PL.djAvail&&abilities.doubleJump){
      PL.vy=-7.5;PL.djAvail=false;
      spawnParts(PL.x+PL.w/2,PL.y+PL.h/2,'#00FFFFaa',8,4); SFX.djump();
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
      if(!wasOnGround){ PL.landTick=8; SFX.land(); }
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
      triggerShake(5); hitFlash=12; SFX.hit();
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
      triggerShake(en.isBoss?8:5); hitFlash=14; SFX.hit();
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
      if(col.type==='diamond'){ diamonds+=1+Math.floor(gameLevel/2); spawnParts(col.x+7,col.y,'#00FFFFaa',5,3); SFX.diamond(); }
      else if(col.type==='food'){ PL.hp=Math.min(PL.maxHp,PL.hp+col.food.heal); showFact(col.food.icon+' +'+col.food.heal+' HP!'); spawnParts(col.x+9,col.y,'#00ff88aa',6,3); SFX.food(); }
      else if(col.type==='key'){ diamonds+=30; showFact('🔑 Rare Key! +30 💎'); spawnParts(col.x+8,col.y,KEY_COLORS[col.keyColor],14,4); SFX.checkpoint(); }
      else if(col.type==='checkpoint'){ PL.checkpointX=PL.x; PL.checkpointY=PL.y; PL.hp=Math.min(PL.maxHp,PL.hp+2); showFact('💾 Checkpoint! +2 HP'); spawnParts(col.x+10,col.y,'#00ff88',12,4); SFX.checkpoint(); }
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
      if(en.hp<=0){ en.dead=true; triggerShake(en.isBoss?6:2); diamonds+=en.isBoss?40+gameLevel*10:5+gameLevel*2; spawnParts(en.x+en.w/2,en.y+en.h/2,'#FFD700aa',20,6); SFX.kill(); }
    }
  });
  for(let i=projectiles.length-1;i>=0;i--){
    const p=projectiles[i];
    if(overlap(ab,{x:p.x-p.r,y:p.y-p.r,w:p.r*2,h:p.r*2})){ spawnParts(p.x,p.y,'#88aaff',4); projectiles.splice(i,1); }
  }
}

function levelComplete(){
  triggerShake(10); fireworkTimer=300; SFX.levelUp();
  if(gameLevel===1 && !abilities.doubleJump) unlockAbility('doubleJump','⚡ Double Jump!','Tap JUMP again while in the air to jump a second time!');
  else if(gameLevel===2 && !abilities.wallJump) unlockAbility('wallJump','🧗 Wall Jump!','Slide against a wall, then tap JUMP to launch off it!');
  else if(gameLevel===3 && !abilities.dash) unlockAbility('dash','💨 Dash!','Tap DASH to burst forward at speed — great for gaps!');
  saveHS();
  setTimeout(()=>{ gameLevel++; generateLevel(gameLevel); PL.maxHp=Math.min(9,PL.maxHp+1); PL.hp=PL.maxHp; state='playing'; showFact('🏆 Level '+gameLevel+'!'); },3200);
}
function gameOver(){ state='gameover'; saveHS(); }
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
  if(paused) drawPaused();
  if(state==='gameover') drawGameOver();
}

// ── ZONE PALETTE ─────────────────────────────────────────────
// Each zone: interior wall, column, floor colours + window exterior palette
const Z_PAL=[
  // Zone 0: Grand Lobby — cream marble, warm gold
  {wall:'#141210',col:'#1e1a14',floor:'#1c1810',fLine:'rgba(180,150,55,0.28)',
   sky0:'#070c1c',sky1:'#0d1430',ext:'#c8cdd6',cLine:'rgba(200,215,235,0.50)',
   ledge:'#9aa2b2',accent:'#c8a848',light:'rgba(255,195,90,0.22)'},
  // Zone 1: Armani Hotel — dark charcoal, deep navy
  {wall:'#0e1018',col:'#161c26',floor:'#12182a',fLine:'rgba(88,108,172,0.24)',
   sky0:'#040810',sky1:'#07101e',ext:'#b8beca',cLine:'rgba(175,192,218,0.42)',
   ledge:'#8890a6',accent:'#7890bc',light:'rgba(95,140,255,0.18)'},
  // Zone 2: Residential — warm amber
  {wall:'#161210',col:'#201810',floor:'#1c1408',fLine:'rgba(155,115,52,0.28)',
   sky0:'#050808',sky1:'#080e16',ext:'#c0cad2',cLine:'rgba(188,202,222,0.44)',
   ledge:'#909caa',accent:'#cc9e58',light:'rgba(218,158,75,0.20)'},
  // Zone 3: Corporate — steel blue glass
  {wall:'#0c1016',col:'#121c2a',floor:'#101820',fLine:'rgba(72,125,198,0.30)',
   sky0:'#030810',sky1:'#060e1a',ext:'#b2bcc8',cLine:'rgba(162,185,216,0.48)',
   ledge:'#7e90a8',accent:'#5a8ec8',light:'rgba(72,155,255,0.20)'},
  // Zone 4: At The Top — silver white, pale sky
  {wall:'#12161e',col:'#1a2030',floor:'#161c2a',fLine:'rgba(155,178,218,0.32)',
   sky0:'#070b14',sky1:'#0c1020',ext:'#ccd6e2',cLine:'rgba(218,230,248,0.54)',
   ledge:'#a6b2c6',accent:'#b6cce4',light:'rgba(175,208,255,0.25)'},
  // Zone 5: Spire — raw steel, dark sky
  {wall:'#0e1214',col:'#161c22',floor:'#12181c',fLine:'rgba(132,155,178,0.28)',
   sky0:'#040a0e',sky1:'#090e12',ext:'#c0cad2',cLine:'rgba(195,210,228,0.48)',
   ledge:'#8c96a8',accent:'#9cb0c0',light:'rgba(155,188,218,0.20)'},
];

// World-space window layout
const WIN_PW  = 160; // world px per repeat unit
const WIN_GW  = 102; // glass panel width (world px)
const COL_W   = WIN_PW - WIN_GW; // 58px structural column
const WIN_TOP_W = 90;
const WIN_BOT_W = GROUND_Y - 16;

function drawInterior(){
  const zid = Math.max(0, Math.min(5, lastZoneId>=0 ? lastZoneId : 0));
  const pal = Z_PAL[zid];
  const t = Date.now()/1000;

  // ── FAR BACK WALL (establishes depth)
  const backWallG = ctx.createLinearGradient(0,0,0,H);
  backWallG.addColorStop(0, pal.sky0);
  backWallG.addColorStop(0.5, pal.wall);
  backWallG.addColorStop(1, '#060810');
  ctx.fillStyle = backWallG;
  ctx.fillRect(0, 0, W, H);

  const firstWin = Math.floor(cameraX/WIN_PW) - 1;
  const lastWin  = Math.ceil((cameraX+W)/WIN_PW) + 1;

  for(let wi=firstWin; wi<=lastWin; wi++){
    const worldX = wi * WIN_PW;
    const colSX  = sx(worldX);          // structural column screen x
    const winSX  = colSX + COL_W;       // glass panel left edge
    const winSY  = sw(WIN_TOP_W);
    const winEY  = sw(WIN_BOT_W);
    const winH   = winEY - winSY;
    if(winEY < 0 || winSY > H) continue;
    if(winSX + WIN_GW < 0 || colSX > W) continue;

    // ── STRUCTURAL Y-BUTTRESS COLUMN
    // Burj Khalifa's Y-shaped cross-section means wide diagonal buttresses
    const colG = ctx.createLinearGradient(colSX, 0, colSX+COL_W, 0);
    colG.addColorStop(0,    pal.wall);
    colG.addColorStop(0.08, pal.col);
    colG.addColorStop(0.35, '#1c2030');
    colG.addColorStop(0.65, '#1c2030');
    colG.addColorStop(0.92, pal.col);
    colG.addColorStop(1,    pal.wall);
    ctx.fillStyle = colG;
    ctx.fillRect(colSX, 0, COL_W, H);

    // Column edge highlights (chamfered concrete look)
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    ctx.fillRect(colSX+COL_W-4, 0, 4, H);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(colSX, 0, 4, H);

    // Horizontal banding on column (construction pour lines)
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 1;
    for(let hy = (sw(WIN_TOP_W) - cameraY*0.02) % 44; hy < H; hy += 44){
      ctx.beginPath(); ctx.moveTo(colSX+4, hy); ctx.lineTo(colSX+COL_W-4, hy); ctx.stroke();
    }

    // Gold accent strip at top of column (lobby gold trim)
    if(zid===0){
      ctx.fillStyle='rgba(200,168,72,0.22)';
      ctx.fillRect(colSX+6, sw(WIN_TOP_W)-4, COL_W-12, 3);
    }

    // ── WINDOW GLASS PANEL
    const cSY = Math.max(0, winSY);
    const cEY = Math.min(H, winEY);
    const cH  = cEY - cSY;
    if(cH <= 0) continue;

    // Night sky background
    const skyG = ctx.createLinearGradient(winSX, cSY, winSX, cEY);
    skyG.addColorStop(0, pal.sky0);
    skyG.addColorStop(1, pal.sky1);
    ctx.fillStyle = skyG;
    ctx.fillRect(winSX, cSY, WIN_GW, cH);

    // Stars in upper portion
    for(let s=0; s<10; s++){
      const stX = winSX + (wi*41+s*17) % WIN_GW;
      const stY = cSY  + (wi*29+s*37) % Math.max(1, cH*0.55);
      ctx.fillStyle = `rgba(255,255,255,${0.15+((wi*7+s*13)%5)*0.06})`;
      ctx.fillRect(stX, stY, 1, 1);
    }

    // ── BURJ KHALIFA ADJACENT WING (Y-shape cross-section)
    // The adjacent wing appears at angle through the window —
    // silver aluminium cladding, setback ledges, tapered profile
    ctx.save();
    // Clip to window area
    ctx.beginPath();
    ctx.rect(winSX, cSY, WIN_GW, cH);
    ctx.clip();

    // Wing occupies right ~58% of window, tapers more at higher floors
    const wingOffX = winSX + WIN_GW * 0.40;
    const wingW    = WIN_GW * 0.58;
    const taper    = zid * 3; // narrower looking as we climb
    const wingTopX = wingOffX + taper;
    const wingTopW = Math.max(8, wingW - taper*1.8);

    // Wing face gradient (silver aluminium)
    const wingG = ctx.createLinearGradient(wingOffX, 0, wingOffX+wingW, 0);
    wingG.addColorStop(0,   '#a8b0bc');
    wingG.addColorStop(0.3, pal.ext);
    wingG.addColorStop(0.65,'#e4eaf2');
    wingG.addColorStop(0.85, pal.ext);
    wingG.addColorStop(1,   '#909aa8');
    ctx.fillStyle = wingG;
    ctx.beginPath();
    ctx.moveTo(wingOffX,        cEY+4);
    ctx.lineTo(wingOffX+wingW,  cEY+4);
    ctx.lineTo(wingTopX+wingTopW, cSY-2);
    ctx.lineTo(wingTopX,          cSY-2);
    ctx.closePath();
    ctx.fill();

    // Horizontal cladding panel lines
    const panH = 11; // screen px per aluminium panel
    ctx.strokeStyle = pal.cLine;
    ctx.lineWidth = 0.6;
    for(let py=cSY; py<cEY; py+=panH){
      ctx.beginPath(); ctx.moveTo(wingOffX-2, py); ctx.lineTo(wingOffX+wingW+2, py); ctx.stroke();
    }

    // Vertical panel divisions
    ctx.strokeStyle = 'rgba(150,162,180,0.22)';
    ctx.lineWidth = 0.5;
    for(let ci=1; ci<=5; ci++){
      const px = wingOffX + (wingW/6)*ci;
      ctx.beginPath(); ctx.moveTo(px, cSY); ctx.lineTo(px, cEY); ctx.stroke();
    }

    // Diagonal triangular motif (signature Burj cladding pattern)
    ctx.strokeStyle = 'rgba(130,145,165,0.12)';
    ctx.lineWidth = 0.5;
    for(let py=cSY; py<cEY; py+=panH*2){
      for(let ci=0; ci<6; ci++){
        const x1 = wingOffX + (wingW/6)*ci;
        const x2 = wingOffX + (wingW/6)*(ci+1);
        ctx.beginPath(); ctx.moveTo(x1, py); ctx.lineTo(x2, py+panH*2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x2, py); ctx.lineTo(x1, py+panH*2); ctx.stroke();
      }
    }

    // ── SETBACK LEDGES (Burj's 27 setbacks — most distinctive feature)
    const ledgeSpacing = panH * 7;
    for(let py=cEY - panH*2; py>cSY; py-=ledgeSpacing){
      ctx.fillStyle = pal.ledge;
      ctx.fillRect(wingOffX-10, py-2, wingW+18, 4);
      // Ledge top highlight
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(wingOffX-10, py-2, wingW+18, 1);
      // Shadow under ledge
      const lShadow = ctx.createLinearGradient(0, py+2, 0, py+10);
      lShadow.addColorStop(0, 'rgba(0,0,0,0.30)');
      lShadow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = lShadow;
      ctx.fillRect(wingOffX-10, py+2, wingW+18, 8);
    }

    // Glass reflection on wing (makes it look like glass curtain wall)
    const reflG = ctx.createLinearGradient(wingOffX, 0, wingOffX+wingW, 0);
    reflG.addColorStop(0,   'rgba(200,220,255,0.00)');
    reflG.addColorStop(0.25,'rgba(220,235,255,0.10)');
    reflG.addColorStop(0.5, 'rgba(200,220,255,0.04)');
    reflG.addColorStop(0.8, 'rgba(180,200,240,0.08)');
    reflG.addColorStop(1,   'rgba(180,200,240,0.00)');
    ctx.fillStyle = reflG;
    ctx.fillRect(wingOffX, cSY, wingW, cH);

    // ── GAP BETWEEN WINGS (dark void between Y-arms)
    const gapG = ctx.createLinearGradient(winSX, 0, wingOffX, 0);
    gapG.addColorStop(0, pal.sky1);
    gapG.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = gapG;
    ctx.fillRect(winSX, cSY, wingOffX-winSX, cH);

    // Dubai skyline at base (lower zones only)
    if(zid <= 2){
      const baseY = Math.min(cEY, H);
      const nBldg = 7;
      for(let bi=0; bi<nBldg; bi++){
        const bw2 = WIN_GW/nBldg;
        const seed = (wi*31+bi*17)%19;
        const bh2  = Math.max(4, (8+seed*3) * (1 - zid*0.28));
        ctx.fillStyle = '#020810';
        ctx.fillRect(winSX+bi*bw2, baseY-bh2, bw2-1, bh2);
        if(seed%3===0 && bh2>8){
          ctx.fillStyle='rgba(255,210,80,0.30)';
          ctx.fillRect(winSX+bi*bw2+2, baseY-bh2+3, 3, 3);
        }
      }
    }

    // Ambient glow spilling from Dubai city lights
    const cityGlow = ctx.createRadialGradient(winSX+WIN_GW/2, cEY, 0, winSX+WIN_GW/2, cEY, WIN_GW*0.7);
    cityGlow.addColorStop(0, 'rgba(255,190,70,0.07)');
    cityGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cityGlow;
    ctx.fillRect(winSX, cSY, WIN_GW, cH);

    ctx.restore(); // end window clip

    // Window frame (aluminium extrusion)
    ctx.strokeStyle = 'rgba(110,140,190,0.55)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(winSX+0.75, cSY+0.75, WIN_GW-1.5, cH-1.5);

    // Glass tint (blue-green reflection)
    ctx.fillStyle = 'rgba(60,100,180,0.035)';
    ctx.fillRect(winSX, cSY, WIN_GW*0.28, cH);

    // Warm light spill onto floor from window
    if(cEY > H*0.3 && cEY < H+80){
      const spG = ctx.createRadialGradient(winSX+WIN_GW/2, cEY, 0, winSX+WIN_GW/2, cEY, 90);
      spG.addColorStop(0, pal.light);
      spG.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = spG;
      ctx.fillRect(winSX-10, cEY-10, WIN_GW+20, 80);
    }
  }

  // ── 3D PERSPECTIVE FLOOR with marble tiles
  const floorY = sw(GROUND_Y);
  if(floorY < H + 10){
    // Floor base fill
    const fG = ctx.createLinearGradient(0, floorY, 0, H);
    fG.addColorStop(0, pal.floor);
    fG.addColorStop(0.6, '#0a0c12');
    fG.addColorStop(1,   '#070810');
    ctx.fillStyle = fG;
    ctx.fillRect(0, floorY, W, H - floorY + 10);

    // Perspective tile grid — vanishing point at screen center on floor line
    const vpX = W * 0.5;
    const vpY = floorY;
    const TILE = 72; // world-space tile width

    // Depth rows: each row is further away (converges toward vpY)
    // Row 0 = nearest (bottom of screen), row N = at floor line
    const maxRows = 10;
    for(let row=0; row<maxRows; row++){
      const t1 = row   /maxRows;  // 0=near, 1=far
      const t2 = (row+1)/maxRows;
      const yNear = H + 20 - t1*(H+20-vpY);  // bottom to vpY
      const yFar  = H + 20 - t2*(H+20-vpY);
      if(yFar > H+10 || yNear < vpY) continue;

      // Tile colour alternates checkerboard
      const tileOff = Math.floor((cameraX/TILE + row)) % 2;

      // Width of tile at this depth
      const tileWNear = TILE * (1-t1) + 10;
      const tileWFar  = TILE * (1-t2) + 10;
      const nTiles = Math.ceil(W / Math.max(1,tileWNear)) + 4;
      const startX = -(Math.floor(cameraX/TILE) * tileWNear % tileWNear) - tileWNear*2;

      for(let col=0; col<nTiles; col++){
        const xL = startX + col * tileWNear;
        const xR = xL + tileWNear;
        const xLF = vpX + (xL-vpX)*(tileWFar/Math.max(1,tileWNear));
        const xRF = vpX + (xR-vpX)*(tileWFar/Math.max(1,tileWNear));

        const dark = (col+tileOff)%2===0;
        const lightness = 0.12 + (1-t1)*0.10;
        if(dark){
          ctx.fillStyle=`rgba(${zid===0?'180,160,120':zid===3?'80,100,140':'130,140,160'},${lightness*0.9})`;
        } else {
          ctx.fillStyle=`rgba(${zid===0?'220,200,160':zid===3?'100,130,180':'160,170,190'},${lightness})`;
        }
        ctx.beginPath();
        ctx.moveTo(xL,  yNear);
        ctx.lineTo(xR,  yNear);
        ctx.lineTo(xRF, yFar);
        ctx.lineTo(xLF, yFar);
        ctx.closePath(); ctx.fill();

        // Grout line between tiles
        ctx.strokeStyle=`rgba(0,0,0,${0.18*(1-t1)+0.04})`;
        ctx.lineWidth=0.8;
        ctx.stroke();
      }
    }

    // Floor accent strip at wall base
    ctx.fillStyle = pal.accent;
    ctx.globalAlpha = 0.45;
    ctx.fillRect(0, floorY-2, W, 2);
    ctx.globalAlpha = 1;

    // Floor-level ambient glow from lights above
    const flrGlow = ctx.createLinearGradient(0,floorY,0,floorY+40);
    flrGlow.addColorStop(0, pal.light);
    flrGlow.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=flrGlow;
    ctx.fillRect(0,floorY,W,40);
  }

  // ── 3D CEILING with perspective receding lines
  const ceilY = sw(WIN_TOP_W - 28);
  if(ceilY < H && ceilY+40 > 0){
    ctx.fillStyle = pal.col;
    ctx.fillRect(0, ceilY, W, 40);

    // Ceiling perspective coffered grid (receding lines toward center)
    const cVpX = W*0.5;
    const cTile = 80;
    const cTileOff = -(cameraX%cTile);
    ctx.strokeStyle = `rgba(255,255,255,0.05)`;
    ctx.lineWidth = 0.8;
    for(let cx2=cTileOff-cTile; cx2<W+cTile; cx2+=cTile){
      ctx.beginPath(); ctx.moveTo(cx2, ceilY+40); ctx.lineTo(cVpX, ceilY); ctx.stroke();
    }
    for(let d=1; d<=4; d++){
      const ly = ceilY + d*9;
      ctx.beginPath(); ctx.moveTo(0,ly); ctx.lineTo(W,ly); ctx.stroke();
    }

    // Recessed LED light strips in ceiling
    for(let lx=(-(cameraX%160)+80); lx<W+80; lx+=160){
      // LED strip
      const ledG = ctx.createLinearGradient(lx-52,ceilY+22,lx+52,ceilY+22);
      ledG.addColorStop(0,'rgba(0,0,0,0)');
      ledG.addColorStop(0.5, pal.light);
      ledG.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=ledG;
      ctx.fillRect(lx-52, ceilY+20, 104, 5);

      // Volumetric light shaft (cone from ceiling down)
      const shaftG = ctx.createLinearGradient(0, ceilY+24, 0, ceilY+200);
      shaftG.addColorStop(0, pal.light.replace(')',',0.35)').replace('rgba','rgba').replace(/,[\d.]+\)$/,',0.30)'));
      shaftG.addColorStop(0.4, pal.light.replace(/,[\d.]+\)$/,',0.08)'));
      shaftG.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle = shaftG;
      ctx.beginPath();
      ctx.moveTo(lx-12, ceilY+24);
      ctx.lineTo(lx+12, ceilY+24);
      ctx.lineTo(lx+70, ceilY+200);
      ctx.lineTo(lx-70, ceilY+200);
      ctx.closePath(); ctx.fill();
    }

    // Ceiling edge shadow
    const cEdge = ctx.createLinearGradient(0,ceilY+40,0,ceilY+60);
    cEdge.addColorStop(0,'rgba(0,0,0,0.35)');
    cEdge.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=cEdge; ctx.fillRect(0,ceilY+40,W,20);
  }

  // buildingFlash — gold wash on zone entry
  if(buildingFlash>0){
    const fa = Math.sin(buildingFlash*0.15)*0.22;
    ctx.fillStyle = `rgba(255,215,90,${fa})`;
    ctx.fillRect(0,0,W,H);
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

// ── PLATFORMS (3D block style) ────────────────────────────────
const PLAT_DEPTH = 7; // front-face depth in screen px
function drawPlatforms(){
  const zoneHues=[220,200,195,210,180,160];
  for(const p of platforms){
    if(p.gone) continue;
    const ssy=sw(p.y), ssx=sx(p.x);
    if(ssy>H+24||ssy+p.h+PLAT_DEPTH<-4||ssx>W+10||ssx+p.w<-10) continue;

    if(p.type==='ground'){
      // Wide stone slab — no 3D face needed
      const gr=ctx.createLinearGradient(0,ssy,0,ssy+p.h+4);
      gr.addColorStop(0,'#2c2c3e'); gr.addColorStop(1,'#141418');
      ctx.fillStyle=gr; ctx.fillRect(ssx,ssy,p.w,p.h+4);
      ctx.fillStyle='rgba(120,140,200,0.28)'; ctx.fillRect(ssx,ssy,p.w,2);
      // Floor tile seams
      ctx.strokeStyle='rgba(80,100,160,0.15)'; ctx.lineWidth=1;
      for(let tx=ssx+60-(cameraX%60);tx<ssx+p.w;tx+=60){ctx.beginPath();ctx.moveTo(tx,ssy);ctx.lineTo(tx,ssy+p.h+4);ctx.stroke();}
      continue;
    }

    if(p.type==='goal'){
      ctx.shadowColor='#FFD700'; ctx.shadowBlur=24;
      const gg=ctx.createLinearGradient(ssx,ssy,ssx+p.w,ssy);
      gg.addColorStop(0,'#aa7700'); gg.addColorStop(0.5,'#fff0a0'); gg.addColorStop(1,'#aa7700');
      ctx.fillStyle=gg; ctx.fillRect(ssx,ssy,p.w,p.h);
      // Front face
      ctx.fillStyle='#6a4800';
      ctx.fillRect(ssx,ssy+p.h,p.w,PLAT_DEPTH);
      ctx.shadowBlur=0;
      ctx.fillStyle='#000'; ctx.font='bold 10px Fredoka One,Arial'; ctx.textAlign='center';
      ctx.fillText('🏁 EXIT',ssx+p.w/2,ssy-5);
      continue;
    }

    if(p.type==='seesaw'){
      ctx.save(); ctx.translate(ssx+p.w/2,ssy+p.h/2); ctx.rotate(p.tilt);
      const pg=ctx.createLinearGradient(-p.w/2,0,p.w/2,0);
      pg.addColorStop(0,'#1a4080'); pg.addColorStop(0.5,'#3a70c8'); pg.addColorStop(1,'#1a4080');
      ctx.fillStyle=pg; ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
      // 3D front face (rotated with plank)
      ctx.fillStyle='#0e2a55'; ctx.fillRect(-p.w/2,p.h/2,p.w,PLAT_DEPTH-1);
      ctx.fillStyle='#FFD700'; ctx.beginPath(); ctx.arc(0,0,4,0,Math.PI*2); ctx.fill();
      ctx.restore();
      continue;
    }

    // ── Determine top/front/edge colours by type
    let topCol, frontCol, edgeHigh, glowCol=null;

    if(p.type==='checkpoint'){
      topCol='#122e1e'; frontCol='#0a1e14'; edgeHigh='rgba(0,255,120,0.55)';
      ctx.fillStyle='#00ff88'; ctx.font='7px Nunito,Arial'; ctx.textAlign='center';
      ctx.fillText('💾 SAVE',ssx+p.w/2,ssy-5);
    } else if(p.type==='boss'){
      topCol='#3a0a0a'; frontCol='#260606'; edgeHigh='rgba(255,60,40,0.65)';
      ctx.shadowColor='#ff2200'; ctx.shadowBlur=8;
    } else if(p.type==='collapse'){
      const shakeX=p.collapsing?Math.sin(Date.now()/40)*3:0;
      const frac=Math.min(1,p.collapseTimer/p.collapseMax);
      const r=Math.round(lerp(55,175,frac)),g2=Math.round(lerp(60,15,frac)),b=Math.round(lerp(120,15,frac));
      topCol=`rgb(${r},${g2},${b})`; frontCol=`rgb(${Math.round(r*0.45)},${Math.round(g2*0.4)},${Math.round(b*0.4)})`;
      edgeHigh=`rgba(255,80,20,${frac*0.85})`;
      ssx+= shakeX; // apply shake to all subsequent draws for this platform
    } else {
      // Normal platform — zone-themed aluminium/concrete ledge
      const zh=zoneHues[Math.min(p.zone||0,5)];
      topCol   = p.moving ? `hsl(${zh},48%,21%)` : `hsl(${zh},38%,16%)`;
      frontCol = p.moving ? `hsl(${zh},48%,11%)` : `hsl(${zh},35%,9%)`;
      edgeHigh = p.moving ? `hsla(${zh},100%,72%,0.7)` : `rgba(110,150,230,0.32)`;
      if(p.moving) glowCol = `hsla(${zh},100%,62%,0.22)`;
    }

    // ── TOP SURFACE
    ctx.fillStyle = topCol;
    ctx.fillRect(ssx, ssy, p.w, p.h);

    // Top edge highlight
    ctx.fillStyle = edgeHigh;
    ctx.fillRect(ssx, ssy, p.w, 2);

    // Tile seams on top surface
    ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1;
    for(let tx=ssx+18; tx<ssx+p.w-4; tx+=18){
      ctx.beginPath(); ctx.moveTo(tx,ssy+2); ctx.lineTo(tx,ssy+p.h-1); ctx.stroke();
    }

    // ── FRONT FACE (depth)
    const frontG=ctx.createLinearGradient(0,ssy+p.h,0,ssy+p.h+PLAT_DEPTH);
    frontG.addColorStop(0, frontCol);
    frontG.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle=frontG;
    ctx.fillRect(ssx, ssy+p.h, p.w, PLAT_DEPTH);

    // ── RIGHT EDGE SHADOW
    ctx.fillStyle='rgba(0,0,0,0.30)';
    ctx.fillRect(ssx+p.w, ssy+2, 2, p.h+PLAT_DEPTH-2);

    // ── LEFT EDGE HIGHLIGHT
    ctx.fillStyle='rgba(255,255,255,0.04)';
    ctx.fillRect(ssx, ssy+2, 2, p.h-2);

    // ── GLOW UNDER MOVING PLATFORMS
    if(glowCol){
      const glG=ctx.createLinearGradient(0,ssy+p.h+PLAT_DEPTH,0,ssy+p.h+PLAT_DEPTH+18);
      glG.addColorStop(0,glowCol); glG.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=glG; ctx.fillRect(ssx,ssy+p.h+PLAT_DEPTH,p.w,18);
      // Direction arrows
      const zh=zoneHues[Math.min(p.zone||0,5)];
      ctx.fillStyle=`hsla(${zh},100%,78%,0.85)`;
      ctx.font='7px Arial'; ctx.textAlign='center';
      ctx.fillText(p.moveDir>0?'▶▶':'◀◀',ssx+p.w/2,ssy+p.h-1);
    }

    // Floor number badge
    if(p.floor&&p.floor%5===0){
      ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.font='bold 7px Nunito,Arial'; ctx.textAlign='left';
      ctx.fillText('Fl.'+p.floor,ssx+3,ssy+p.h-1);
    }

    ctx.shadowBlur=0;
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

// ── PLAYER (Prince of Persia style) ───────────────────────────
// Run animation frames: [leftHip, leftKnee, rightHip, rightKnee, armA]
const RF=[
  [ 0.42,-0.55,-0.30, 0.48, 0.32],
  [ 0.16,-0.20,-0.10, 0.16, 0.12],
  [-0.30, 0.48, 0.42,-0.55,-0.32],
  [-0.10, 0.16, 0.16,-0.20,-0.12],
  [ 0.42,-0.55,-0.30, 0.48, 0.32],
  [ 0.16,-0.20,-0.10, 0.16, 0.12],
];
function drawLimb2(x1,y1,ang1,r2,len,col,w){
  const kx=x1+Math.sin(ang1)*len, ky=y1+Math.cos(ang1)*len;
  const a2=ang1+r2, fx=kx+Math.sin(a2)*len, fy=ky+Math.cos(a2)*len;
  ctx.strokeStyle=col; ctx.lineWidth=w; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(kx,ky); ctx.lineTo(fx,fy); ctx.stroke();
  ctx.fillStyle=col; ctx.beginPath(); ctx.arc(kx,ky,w/2+0.5,0,Math.PI*2); ctx.fill();
  return {fx,fy};
}
function drawPlayer(){
  ctx.globalAlpha=(PL.invincible>0&&Math.floor(PL.invincible/5)%2===0)?0.3:1;
  const ppx=sx(PL.x+PL.w/2), ppy=sw(PL.y), ppby=ppy+PL.h;
  const skin=skins[PL.skinIdx], wep=weapons[PL.weaponIdx];
  const running=PL.onGround&&Math.abs(PL.vx)>0.4;
  const sqY=PL.landTick>0?1+PL.landTick*0.038:1;
  const sqX=PL.landTick>0?1-PL.landTick*0.025:1;

  // Ground shadow
  ctx.fillStyle='rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(ppx,ppby+3,PL.w/2*sqX,5,0,0,Math.PI*2); ctx.fill();

  ctx.save(); ctx.translate(ppx,ppy); ctx.scale(PL.facing*sqX,sqY);

  // ── PoP proportions (ppy=0 = hitbox top)
  // Head extends 12px above hitbox, long legs reach bottom
  const headCY = -10;   // head center (above hitbox)
  const headR  = 7;
  const shlY   = 5;     // shoulder joint
  const hipY   = 23;    // hip joint
  const tL     = 12;    // thigh length
  const cL     = 11;    // calf length

  // Determine pose angles
  let lH,lK,rH,rK,armA;
  if(PL.wallSliding){
    lH=-0.2; lK=-0.55; rH=0.2; rK=-0.55; armA=-1.0;
  } else if(!PL.onGround){
    const str=PL.vy<0?-0.28:0.20;
    lH=str-0.14; lK=-0.52; rH=str+0.14; rK=-0.52; armA=-0.5;
  } else if(running){
    [lH,lK,rH,rK,armA]=RF[PL.runFrame];
  } else {
    lH=-0.04; lK=0.04; rH=0.04; rK=-0.04; armA=0.14;
  }
  if(PL.attacking){ const at=1-PL.attackTimer/22; armA=-0.5+at*1.9; }

  // Back arm (behind body)
  drawLimb2(3, shlY+2, armA*0.55, 0.14, 9, skin.shirt+'88', 3);
  // Back leg
  drawLimb2(3, hipY, rH, rK, tL, skin.legs+'aa', 5);

  // ── TUNIC body (slightly tapered, loose)
  ctx.fillStyle = skin.shirt;
  ctx.beginPath();
  ctx.moveTo(-7, shlY+1);
  ctx.lineTo( 7, shlY+1);
  ctx.lineTo( 5, hipY+2);
  ctx.lineTo(-5, hipY+2);
  ctx.closePath(); ctx.fill();

  // V-neck detail
  ctx.strokeStyle = skin.head+'66'; ctx.lineWidth=1.2; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(-2,shlY+3); ctx.lineTo(0,shlY+8); ctx.lineTo(2,shlY+3); ctx.stroke();

  // Shirt highlight (left side light)
  ctx.fillStyle='rgba(255,255,255,0.07)';
  ctx.fillRect(-6, shlY+1, 4, hipY-shlY);

  // ── SASH / BELT (signature PoP element)
  const sashY = hipY - 5;
  ctx.fillStyle='#7a0000';
  ctx.beginPath();
  ctx.moveTo(-8,sashY); ctx.lineTo(8,sashY); ctx.lineTo(7,sashY+6); ctx.lineTo(-7,sashY+6);
  ctx.closePath(); ctx.fill();
  // Sash highlight
  ctx.fillStyle='#cc1100';
  ctx.fillRect(-6, sashY+1, 12, 2);
  // Sash knot
  ctx.fillStyle='#ff2200';
  ctx.beginPath(); ctx.ellipse(0, sashY+3, 3, 2, 0, 0, Math.PI*2); ctx.fill();

  // ── NECK
  ctx.fillStyle=skin.head;
  ctx.fillRect(-3, headCY+headR, 6, shlY-(headCY+headR)+1);

  // ── HEAD
  ctx.fillStyle=skin.head;
  ctx.beginPath(); ctx.arc(0, headCY, headR, 0, Math.PI*2); ctx.fill();

  // Jaw shading
  ctx.fillStyle='rgba(0,0,0,0.08)';
  ctx.beginPath(); ctx.arc(0, headCY+2, headR, 0, Math.PI); ctx.fill();

  // Eyes (expressive)
  ctx.fillStyle='white';
  ctx.beginPath(); ctx.ellipse(3, headCY-1, 2.5, 1.8, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle='#1a0c00';
  ctx.beginPath(); ctx.arc(3, headCY-1, 1.4, 0, Math.PI*2); ctx.fill();
  // Pupil shine
  ctx.fillStyle='rgba(255,255,255,0.6)';
  ctx.beginPath(); ctx.arc(3.5, headCY-1.5, 0.5, 0, Math.PI*2); ctx.fill();

  // Eyebrow
  ctx.strokeStyle='#1a0c00'; ctx.lineWidth=1.3; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(1,headCY-4); ctx.lineTo(5,headCY-3); ctx.stroke();

  // Nose bridge
  ctx.beginPath(); ctx.moveTo(2,headCY); ctx.lineTo(3,headCY+2); ctx.stroke();

  // Mouth (slight smirk)
  ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(0,headCY+4); ctx.quadraticCurveTo(2,headCY+6, 4,headCY+4); ctx.stroke();

  // ── HAIR by skin
  if(PL.skinIdx===1){
    // White keffiyeh
    ctx.fillStyle='#f0f0ee';
    ctx.beginPath(); ctx.arc(0,headCY-1,headR+1,Math.PI,0); ctx.fill();
    ctx.fillStyle='#cc0000'; ctx.fillRect(-headR-1,headCY-2,(headR+1)*2,3);
  } else if(PL.skinIdx===5){
    // Gold crown
    ctx.fillStyle='#FFD700';
    for(let ci=0;ci<5;ci++){
      ctx.fillRect(-headR+ci*4, headCY-headR-4+(ci%2)*3, 3, 5-(ci%2)*2);
    }
    ctx.fillRect(-headR,headCY-headR,headR*2,3);
  } else {
    // Dark flowing hair (classic PoP)
    ctx.fillStyle='#110800';
    ctx.beginPath(); ctx.arc(0,headCY-2,headR,Math.PI,0); ctx.fill();
    // Hair hanging behind (facing right, hair goes left = negative x direction)
    ctx.beginPath();
    ctx.moveTo(-headR+1, headCY-2);
    ctx.bezierCurveTo(-headR-4, headCY+2, -headR-10, headCY+8, -headR-8, headCY+18);
    ctx.bezierCurveTo(-headR-4, headCY+22, -headR+2, headCY+18, -headR+2, headCY+12);
    ctx.bezierCurveTo(-headR, headCY+6, -headR, headCY+2, -headR+1, headCY-2);
    ctx.fill();
    // Hair highlight strand
    ctx.strokeStyle='#3a2010'; ctx.lineWidth=1.2;
    ctx.beginPath();
    ctx.moveTo(-headR+3, headCY-headR+2);
    ctx.bezierCurveTo(headR*0.2, headCY-headR+1, headR*0.6, headCY-headR+3, headR-1, headCY-headR+6);
    ctx.stroke();
  }

  // ── FRONT LEG
  drawLimb2(-3, hipY, lH, lK, tL, skin.legs, 5);

  // Boots
  const gfxy=(hx,ha,ka)=>{
    const kx2=hx+Math.sin(ha)*tL, ky2=hipY+Math.cos(ha)*tL, a2=ha+ka;
    return{x:kx2+Math.sin(a2)*cL, y:ky2+Math.cos(a2)*cL};
  };
  const lf=gfxy(-3,lH,lK), rf=gfxy(3,rH,rK);
  ctx.fillStyle='#2a1008';
  ctx.beginPath(); ctx.ellipse(lf.x,lf.y+2,6.5,3.5,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(rf.x,rf.y+2,6.5,3.5,0,0,Math.PI*2); ctx.fill();
  // Boot highlight
  ctx.fillStyle='rgba(255,255,255,0.12)';
  ctx.beginPath(); ctx.ellipse(lf.x-1,lf.y+1,3.5,2,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(rf.x-1,rf.y+1,3.5,2,0,0,Math.PI*2); ctx.fill();

  // ── FRONT ARM + WEAPON
  const fA=drawLimb2(5, shlY+2, armA, 0.22, 9, skin.shirt, 3);
  ctx.save(); ctx.translate(fA.fx,fA.fy); ctx.rotate(armA+0.2);
  ctx.shadowColor=wep.color; ctx.shadowBlur=PL.attacking?18:4;
  // Blade
  ctx.strokeStyle=wep.color; ctx.lineWidth=3; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-wep.len); ctx.stroke();
  // Guard
  ctx.strokeStyle='#888'; ctx.lineWidth=4;
  ctx.beginPath(); ctx.moveTo(-7,-8); ctx.lineTo(7,-8); ctx.stroke();
  // Grip
  ctx.strokeStyle='#5a3010'; ctx.lineWidth=4;
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-6); ctx.stroke();
  // Attack arc
  if(PL.attacking){
    ctx.globalAlpha=0.28; ctx.fillStyle=wep.color;
    ctx.beginPath(); ctx.moveTo(0,0);
    ctx.arc(0,0,wep.len,-Math.PI/2-0.75,-Math.PI/2+0.75);
    ctx.closePath(); ctx.fill(); ctx.globalAlpha=1;
  }
  ctx.shadowBlur=0; ctx.restore();

  ctx.restore(); ctx.globalAlpha=1;
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

// ── PAUSE SCREEN ──────────────────────────────────────────────
function drawPaused(){
  ctx.fillStyle='rgba(0,0,18,0.82)'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#FFD700'; ctx.font='bold 40px Fredoka One,Arial'; ctx.textAlign='center';
  ctx.fillText('⏸ PAUSED',W/2,H/2-40);
  ctx.fillStyle='#aabcff'; ctx.font='15px Nunito,Arial';
  ctx.fillText('Tap ⏸ or press P to resume',W/2,H/2+2);
  const hs=loadHS();
  if(hs.level||hs.diamonds){
    ctx.fillStyle='rgba(255,215,0,0.08)';
    if(ctx.roundRect) ctx.roundRect(W/2-110,H/2+22,220,58,10); else ctx.rect(W/2-110,H/2+22,220,58);
    ctx.fill();
    ctx.fillStyle='#FFD700'; ctx.font='bold 10px Nunito,Arial';
    ctx.fillText('🏆 PERSONAL BEST',W/2,H/2+38);
    ctx.fillStyle='#aabcff'; ctx.font='11px Nunito,Arial';
    ctx.fillText('Level '+( hs.level||1)+' · 💎 '+(hs.diamonds||0)+' · Combo '+(hs.combo||0)+'×',W/2,H/2+58);
  }
  ctx.fillStyle='#334466'; ctx.font='10px Nunito,Arial';
  ctx.fillText('S = Shop  M = Map  Q = Sound toggle',W/2,H/2+88);
}

// ── GAME OVER ─────────────────────────────────────────────────
function drawGameOver(){
  ctx.fillStyle='rgba(0,0,18,0.92)'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#ff4444'; ctx.font='bold 44px Fredoka One,Arial'; ctx.textAlign='center';
  ctx.fillText('GAME OVER',W/2,H/2-80);
  ctx.fillStyle='#FFD700'; ctx.font='17px Fredoka One,Arial';
  ctx.fillText(getZone(PL.x).name,W/2,H/2-42);
  ctx.fillText('💎 '+diamonds+' diamonds  ·  '+comboMax+'× best combo',W/2,H/2-18);
  const hs=loadHS();
  if(hs.diamonds){
    ctx.fillStyle='rgba(255,215,0,0.08)';
    if(ctx.roundRect) ctx.roundRect(W/2-110,H/2+4,220,44,8); else ctx.rect(W/2-110,H/2+4,220,44);
    ctx.fill();
    ctx.fillStyle='#FFD700'; ctx.font='bold 10px Nunito,Arial';
    ctx.fillText('🏆 PERSONAL BEST',W/2,H/2+19);
    ctx.fillStyle='#aabcff'; ctx.font='11px Nunito,Arial';
    ctx.fillText('Level '+(hs.level||1)+' · 💎 '+(hs.diamonds||0)+' · Combo '+(hs.combo||0)+'×',W/2,H/2+37);
  }
  ctx.fillStyle='#88aaff'; ctx.font='14px Nunito,Arial';
  ctx.fillText('Press R or tap to try again!',W/2,H/2+65);
  ctx.fillStyle='#ffffff33'; ctx.font='10px Nunito,Arial';
  ctx.fillText('📚 Flynn Hurley · Tamborine Mountain State School · Class 4J',W/2,H/2+92);
}
canvas.addEventListener('click',()=>{ if(state==='gameover') restartGame(); });

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

// ── TOUCH CONTROLS ────────────────────────────────────────────
(function setupTouch(){
  // Mapping: button id → key code(s) to simulate
  const BTN_MAP = {
    tcLeft:   'ArrowLeft',
    tcRight:  'ArrowRight',
    tcJump:   'ArrowUp',
    tcAttack: 'Space',
    tcDash:   'KeyX',
    tcPause:  'KeyP',
  };

  function pressKey(code){
    if(!keys[code]) justPressed[code]=true;
    keys[code]=true;
  }
  function releaseKey(code){
    keys[code]=false;
    delete justPressed[code];
  }

  Object.entries(BTN_MAP).forEach(([id, code])=>{
    const el=document.getElementById(id);
    if(!el) return;
    const down=e=>{ e.preventDefault(); pressKey(code); el.classList.add('tc-pressed'); };
    const up  =e=>{ e.preventDefault(); releaseKey(code); el.classList.remove('tc-pressed'); };
    el.addEventListener('touchstart', down, {passive:false});
    el.addEventListener('touchend',   up,   {passive:false});
    el.addEventListener('touchcancel',up,   {passive:false});
    el.addEventListener('mousedown',  down);
    el.addEventListener('mouseup',    up);
    el.addEventListener('mouseleave', up);
  });

  // Sound toggle button
  const soundEl=document.getElementById('soundBtn');
  if(soundEl) soundEl.addEventListener('click',toggleSound);
})();
