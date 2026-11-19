// Measure the actual rendered probe transform during right/left planet flybys.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const source=name=>fs.readFileSync(path.join(__dirname,'../dist',name),'utf8');
let now=0, frames=[], poses=[], activeFrame=[];
const multiply=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
function makeCanvas(){
 const canvas={width:256,height:256,dataset:{}};
 let matrix=[1,0,0,1,0,0],stack=[];
 const base={globalAlpha:1,
  setTransform(...m){matrix=m},save(){stack.push([...matrix])},restore(){matrix=stack.pop()},
  translate(x,y){matrix=multiply(matrix,[1,0,0,1,x,y])},rotate(a){matrix=multiply(matrix,[Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0])},
  scale(x,y){matrix=multiply(matrix,[x,0,0,y,0,0])},
  transform(...m){matrix=multiply(matrix,m)},
  drawImage(image,...args){
   if(canvas!==main){canvas.asset=image.asset||image.src;return;}
   if((image.asset||image.src||'').includes('probe-rear')&&args.length===8){
    const roll=Math.atan2(matrix[1],matrix[0]);
    activeFrame.push({roll,leftWingDown:matrix[1]<0,rightWingDown:matrix[1]>0,x:matrix[4],y:matrix[5],width:Math.hypot(matrix[0],matrix[1]),height:Math.hypot(matrix[2],matrix[3]),shear:matrix[0]*matrix[2]+matrix[1]*matrix[3]});
   }
  },createLinearGradient(){return{addColorStop(){}}},createRadialGradient(){return{addColorStop(){}}}};
 canvas.getContext=()=>new Proxy(base,{get(o,k){return k in o?o[k]:(...args)=>{for(const n of args)if(typeof n==='number')assert(Number.isFinite(n));}}});
 return canvas;
}
const main=makeCanvas(),images=[];
const scope=vm.createContext({innerWidth:1363,innerHeight:936,devicePixelRatio:1,performance:{now:()=>now},
 document:{hidden:false,createElement:()=>makeCanvas(),addEventListener(){}},window:{addEventListener(){}},
 matchMedia:()=>({matches:false,addEventListener(){}}),requestAnimationFrame:cb=>{frames.push(cb);return 1},
 Image:class{constructor(){this.complete=true;this.naturalWidth=1800;this.naturalHeight=800;images.push(this)}addEventListener(_,f){this.load=f}},canvas:main});
vm.runInContext(source('scoring.js')+'\n'+source('route.js')+'\n'+source('chart.js')+'\nthis.chart=createFlightChart(canvas);',scope);
images.forEach(i=>i.load());
function tick(t){now=t;activeFrame=[];frames.shift()?.(t);if(activeFrame.length){const center=activeFrame[Math.floor(activeFrame.length/2)];poses.push({...center,wingPerspective:activeFrame[0].height/activeFrame.at(-1).height});}}
function fly(from,to){
 scope.chart.setFlight({world:from,earned:from,distance:from,drift:0,key:'start'+from},false);tick(now+17);
 poses=[];const start=now;
 const duration=scope.chart.setFlight({world:to,earned:to,distance:to,drift:0,key:'to'+to},true);
 for(let t=start+17;t<start+duration+600;t+=17)tick(t);
 return [...poses];
}
tick(0);
const right=fly(2,3),left=fly(3,4); // Jupiter is right; Saturn is left.
const maxRight=Math.max(...right.map(p=>p.roll)),maxLeft=Math.min(...left.map(p=>p.roll));
assert(maxRight>Math.PI/6,'Right-side planet must visibly lower the right wing by more than 30 degrees');
assert(maxLeft<-Math.PI/6,'Left-side planet must visibly lower the left wing by more than 30 degrees');
assert(right.some(p=>p.rightWingDown)&&left.some(p=>p.leftWingDown));
assert(Math.abs(right.at(-1).roll)<.12&&Math.abs(left.at(-1).roll)<.12,'Probe must ease back to level');
assert(right.some(p=>Math.abs(p.wingPerspective-1)>.12)&&left.some(p=>Math.abs(p.wingPerspective-1)>.12),'Yaw must give near and far wings different projected sizes');
assert(right.some(p=>Math.abs(p.shear)>.03),'Pitch and yaw must change the projected surface, not just rotate a flat sprite');
const jumps=right.slice(1).map((p,i)=>Math.hypot(p.x-right[i].x,p.y-right[i].y));
assert(Math.max(...jumps)<15,'Chase-camera movement must remain continuous');
const multi=fly(0,5);
assert(multi.some(p=>p.roll>.4)&&multi.some(p=>p.roll<-.4),'A multi-planet flight must blend turns in both directions');
assert(Math.max(...multi.slice(1).map((p,i)=>Math.hypot(p.x-multi[i].x,p.y-multi[i].y)))<25,'Multi-checkpoint turns must not snap between sides');
console.log(`PASS: rendered right-wing-down ${Math.round(maxRight*180/Math.PI)}°, left-wing-down ${Math.round(-maxLeft*180/Math.PI)}°, then level flight; perspective wings, pitched surface and continuous multi-planet camera path.`);
