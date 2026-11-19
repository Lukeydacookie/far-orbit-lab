const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'../dist');
const source=name=>fs.readFileSync(path.join(root,name),'utf8');
const c=vm.createContext({});
vm.runInContext(['legacy-missions.js','missions.js','scoring.js','route.js'].map(source).join('\n')+'\nthis.missions=MISSIONS;this.rules=GAME_RULES;this.revision=MISSION_REVISION;',c);
const bestAnswer=(level=4,time=25000)=>({guess:'test',points:level,score:c.scoreAnswer(level,time)});
assert.equal(c.scoreAnswer(4,25000).total,1000);assert.equal(c.scoreAnswer(4,22000).total,1000);assert(c.scoreAnswer(4,21000).total<1000);assert.equal(c.scoreAnswer(3,25000).total,700);
assert.equal(c.maximumScore(c.missions[1]),6000);
for(const mission of c.missions){
 let sum=0;
 for(const p of mission){const best=c.optimalChoices(p);assert(best.answers.length);assert(best.answers.every(n=>p.tiers[0].answers.some(g=>g[0]===n)));assert(best.answers.every(n=>!p.bonuses.length||p.bonuses.includes(n)));sum+=best.score;}
 assert.equal(c.maximumScore(mission),sum);
}
const strong=c.flightFor({step:1,answers:[bestAnswer()]});
const ordinary=c.flightFor({step:1,answers:[bestAnswer(3)]});
assert(strong.world>=2,'A top answer must jump multiple checkpoints');assert(strong.distance>ordinary.distance);
const daily={step:6,answers:Array.from({length:6},()=>bestAnswer())};
const start=c.flightFor(daily);assert(start.world>8,'A perfect daily flight must go beyond the old last checkpoint');
const continuation={step:0,answers:[],journeyAnswers:daily.answers,isExploration:true};
assert.equal(c.flightFor(continuation).distance,start.distance,'Continuing must keep all distance');
continuation.answers.push(bestAnswer());assert(c.flightFor(continuation).distance>start.distance);
assert.equal(c.voyageScore(continuation),7000);
const long=c.flightFor({step:6,journeyAnswers:Array.from({length:120},()=>bestAnswer()),answers:daily.answers});
assert(long.world>300,'Space must have no final stop');
assert(c.checkpoint(long.world+100).imagined);assert(c.checkpoint(long.world+100).image);
assert(c.overviewIndices(long.world).includes(0));assert(c.overviewIndices(long.world).includes(long.world));assert(c.overviewIndices(long.world).includes(long.world+2));
assert.equal(c.routeWindow(long.world).length,6);
const miss=c.flightFor({step:2,answers:[bestAnswer(),{guess:'',points:0,score:c.scoreAnswer(0,0)}]});
assert.equal(miss.world,strong.world,'Misses must keep the current object nearby');
assert(miss.distance>strong.distance);
const misses=Array.from({length:6},()=>({guess:'',points:0,score:c.scoreAnswer(0,0)}));
assert(c.flightFor({step:1,journeyAnswers:misses,answers:[bestAnswer(1,0)]}).distance>=c.flightFor({step:6,answers:misses}).distance,'A later weak hit must never move distance backward');
assert.equal(c.pointsFor({points:3}),80,'Legacy scores must not be inflated by the new rubric');
let raw=JSON.stringify({'2026-11-18':{step:6,answers:Array.from({length:6},()=>({guess:'Old',points:3,score:{connection:80,rarity:0,speed:4,total:84}})),mission:c.missions[1],revision:c.revision}});
const migration=vm.createContext({localStorage:{getItem:()=>raw,setItem:(_,v)=>raw=v},storageKey:'test',getIndex:()=>1,MISSIONS:c.missions,LEGACY_MISSIONS:c.missions,MISSION_REVISION:c.revision,GAME_RULES:c.rules});
const game=source('game.js');vm.runInContext(game.slice(game.indexOf('function readSaved'),game.indexOf('\nlet today =')),migration);
const saved=vm.runInContext('readSaved()',migration)['2026-11-18'];assert.equal(saved.answers.length,0);assert.equal(saved.scoringVersion,2);assert.equal(saved.previousEditions[0].answers[0].score.total,84);assert.equal(vm.runInContext('readSaved()',migration)['2026-11-18'].previousEditions.length,1);
console.log('PASS: 1,000-point top answers, exact optimal totals for every mission, multi-planet jumps, unlimited generated checkpoints, continuing distance and cumulative scores, miss drift, and lossless scoring migration.');
