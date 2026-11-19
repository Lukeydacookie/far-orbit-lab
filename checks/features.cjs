const fs=require('fs'), vm=require('vm'), assert=require('node:assert/strict');
const root=require('node:path').join(__dirname,'../dist/');
const source=n=>fs.readFileSync(root+n,'utf8');
const normalize=t=>t.toLowerCase().normalize('NFKD').replace(/\p{M}/gu,'').replace(/[^\p{L}\p{N}]/gu,'');
const c=vm.createContext({normalize});
vm.runInContext(source('legacy-missions.js')+'\n'+source('missions.js')+'\n'+source('spelling.js')+'\nthis.puzzles=MISSIONS.flat();this.today=MISSIONS[1];',c);
const game=source('game.js');vm.runInContext(game.slice(game.indexOf('function tierMatch'),game.indexOf('function setHeader')),c);
const languages=c.puzzles.find(p=>p.tiers.some(t=>t.answers.some(a=>a.includes('Spanish'))));
assert(languages);
assert.equal(c.tierMatch(languages,'spanishs'),0,'Typos must wait for confirmation');
assert(c.suggestAnswers(languages,'spanishs').includes('Spanish'));
assert(c.suggestAnswers(languages,'spanihs').includes('Spanish'));
assert.equal(c.tierMatch(languages,'Spanish'),1,'Suggestion must retain the authored score');
assert(c.suggestAnswers(c.today[0],'seersuckre').includes('Seersucker'));
assert.equal(c.tierMatch(c.today[0],'Seersucker'),4);
assert.equal(c.suggestAnswers(c.today[0],'zzzzzzz').length,0);
assert.equal(c.suggestAnswers(c.today[0],'sil').length,0,'Avoid guessing short unrelated words');
assert(!c.suggestAnswers(c.today[0],'denmi').includes('Denim'),'Do not suggest one of the given clues');
const ambiguous={clues:[],tiers:[{answers:[['Coat'],['Boat']]}]};
assert.equal(c.suggestAnswers(ambiguous,'goat').length,2,'Tied corrections must stay visible choices');
// Render the actual chart with a finite-coordinate checking canvas and fake frames.
function chartTest(reduced=false, mobile=false){
 let now=0,raf=[],ops=[],filterWrites=0,gradients=0;
 const finite=a=>a.forEach(n=>{if(typeof n==='number')assert(Number.isFinite(n),'Non-finite drawing coordinate')});
 const ctx=new Proxy({globalAlpha:1},{get(o,k){if(k in o)return o[k];return(...a)=>{finite(a);ops.push([k,...a]);if(/create.*Gradient/.test(k)){gradients++;return{addColorStop(...p){finite(p)}}}}},set(o,k,v){if(k==='filter')filterWrites++;o[k]=v;return true}});
 const makeCanvas=()=>({width:256,height:256,dataset:{},getContext:()=>ctx});
 const canvas=makeCanvas();
 const images=[];
 const scope=vm.createContext({Math,innerWidth:mobile?390:1363,innerHeight:mobile?844:936,devicePixelRatio:2,
   performance:{now:()=>now},document:{hidden:false,createElement:()=>makeCanvas(),addEventListener(){}},window:{addEventListener(){}},
   matchMedia:()=>({matches:reduced,addEventListener(){}}),Image:class{constructor(){this.complete=true;this.naturalWidth=2200;this.naturalHeight=800;images.push(this)}addEventListener(name,cb){this.load=cb}},requestAnimationFrame:f=>{raf.push(f);return 1},canvas});
 vm.runInContext(source('scoring.js')+'\n'+source('route.js')+'\n'+source('chart.js')+'\nthis.chart=createFlightChart(canvas);',scope);
 images.forEach(i=>i.load());
 const step=t=>{now=t;ops=[];raf.shift()?.(t);return ops};
 step(0); scope.chart.setFlight({world:4,distance:4,drift:0,routePosition:4,key:'saturn'},false);step(17);
 now=22;scope.chart.setFlight({world:6,distance:6,drift:0,routePosition:6,key:'neptune'},true);step(17);
 for(let t=34;t<4500;t+=17)step(t);
 const before=filterWrites, gradientCount=gradients;
 scope.chart.setFlight({world:8,distance:8,drift:0,routePosition:8,key:'kuiper'},true);
 for(let t=4505;t<9000;t+=17)step(t);
 assert.equal(filterWrites,before,'Kuiper tint must be cached, not filtered per rock per frame');
 assert(gradients-gradientCount<300,'Star and glow gradients must be reused');
 scope.chart.setFlight({world:8,distance:8,drift:0,routePosition:8,key:'report',complete:true},true);
 let final;
 for(let t=9010;t<12000;t+=17)final=step(t);
 const labels=final.filter(o=>o[0]==='fillText').map(o=>o[1]);
 if(!reduced){assert(labels.includes('EARTH · START'));assert(labels.includes('CURRENT POSITION'));for(const name of ['Earth','Mars','Asteroid Belt','Saturn','Neptune','Kuiper Belt'])assert(labels.includes(name));}
 scope.chart.setFlight({world:1,distance:1,drift:0,routePosition:1,key:'partial',complete:true},false);final=step(12017);
 const ghostOps=final.filter(o=>o[0]==='fillText');assert(ghostOps.some(o=>o[1]==='CURRENT POSITION'));
 if(reduced)assert.equal(raf.length,0,'Reduced motion must stop idle frames');
}
chartTest();chartTest(false,true);chartTest(true);
console.log('PASS: Spanishs and swapped letters suggest corrections; scores await confirmation; ambiguous, clue and short-word cases handled; expanded overhead checkpoints and current position render; mobile and reduced motion supported; no per-frame Kuiper filters or non-finite coordinates.');
