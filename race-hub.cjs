'use strict';
const {randomUUID,randomBytes}=require('node:crypto');
const THREE=require('./three.min.js');
const tracks=require('./tracks.json');
const lengths=tracks.map(t=>{const c=new THREE.CatmullRomCurve3(t.points.map(([x,z])=>new THREE.Vector3(x,0,z)),true,'centripetal');c.arcLengthDivisions=1000;return c.getLength()});
class RaceHub {
 constructor({now=Date.now,waitMs=300000,gatherMs=15000,countdownMs=3800}={}){this.now=now;this.waitMs=waitMs;this.gatherMs=gatherMs;this.countdownMs=countdownMs;this.rooms=new Map();this.sessions=new Map();this.nextTrack=0;this.lastTick=now()}
 join({token,name,style,color}={}){
  let p=this.sessions.get(token);if(p&&this.rooms.has(p.roomId)&&!['expired','done'].includes(this.rooms.get(p.roomId).phase)){p.connected=true;p.seen=this.now();return this.ticket(p)}
  let room=[...this.rooms.values()].find(r=>r.phase==='waiting');
  if(!room){room={id:randomUUID(),track:this.nextTrack++%tracks.length,phase:'waiting',created:this.now(),deadline:this.now()+this.waitMs,gatherAt:null,startAt:null,players:[],endAt:null};this.rooms.set(room.id,room)}
  p={id:randomUUID(),token:randomBytes(24).toString('hex'),roomId:room.id,name:String(name||'DRIVER').replace(/[\x00-\x1f<>]/g,'').slice(0,16),style:['gt','hyper','muscle','rally','sedan','roadster'].includes(style)?style:'gt',color:/^#[\da-f]{6}$/i.test(color||'')?color:'#197ddb',connected:true,seen:this.now(),total:-8-Math.floor(room.players.length/2)*7,lane:room.players.length%2?3:-3,speed:0,nitro:100,finishAt:null,bestLap:null,lapStart:null,lastLap:0,input:{},inputAt:0};
  room.players.push(p);this.sessions.set(p.token,p);this.schedule(room);return this.ticket(p)
 }
 ticket(p){const r=this.rooms.get(p.roomId);return {token:p.token,id:p.id,roomId:r.id,track:r.track}}
 auth(token){const p=this.sessions.get(token);if(!p)throw Error('참가 정보가 만료되었습니다. 다시 매칭하세요.');return p}
 touch(token){const p=this.auth(token);p.connected=true;p.seen=this.now();return p}
 disconnect(token){const p=this.sessions.get(token);if(p){p.connected=false;p.seen=this.now()}}
 leave(token){const p=this.sessions.get(token);if(!p)return;const r=this.rooms.get(p.roomId);if(r&&r.phase==='waiting')r.players=r.players.filter(q=>q!==p);else p.connected=false;this.sessions.delete(token);if(r)this.schedule(r)}
 profile(token,profile){const p=this.auth(token),r=this.rooms.get(p.roomId);if(r?.phase!=='waiting')throw Error('출발 준비 이후에는 프로필을 바꿀 수 없습니다.');const name=String(profile.name||'').replace(/[\x00-\x1f<>]/g,'').trim().slice(0,16);if(!name)throw Error('드라이버 이름을 입력하세요.');p.name=name;if(['gt','hyper','muscle','rally','sedan','roadster'].includes(profile.style))p.style=profile.style;if(/^#[\da-f]{6}$/i.test(profile.color||''))p.color=profile.color;return {ok:true,name:p.name,style:p.style,color:p.color}}
 input(token,input){const p=this.touch(token);if(this.now()-p.inputAt<35)return;p.inputAt=this.now();p.input={gas:input.gas===true,brake:input.brake===true,boost:input.boost===true,drift:input.drift===true,steer:Math.max(-1,Math.min(1,Number(input.steer)||0))}}
 schedule(r){if(r.phase!=='waiting')return;const count=r.players.filter(p=>p.connected).length;if(count>=2&&r.gatherAt===null)r.gatherAt=Math.min(r.deadline,this.now()+this.gatherMs);if(count<2)r.gatherAt=null}
 tick(){const now=this.now(),dt=Math.max(0,Math.min(.1,(now-this.lastTick)/1000));this.lastTick=now;
  for(const r of this.rooms.values()){
   for(const p of r.players)if(now-p.seen>10000)p.connected=false;
   if(r.phase==='waiting'){
    r.players=r.players.filter(p=>{if(!p.connected&&now-p.seen>15000){this.sessions.delete(p.token);return false}return true});this.schedule(r);
    if(r.players.filter(p=>p.connected).length>=2&&now>=(r.gatherAt??r.deadline)){r.phase='countdown';r.startAt=now+this.countdownMs;r.players=r.players.filter(p=>p.connected);for(const p of r.players)p.lapStart=r.startAt}
    else if(now>=r.deadline){r.phase='expired';r.endAt=now}
   }
   if(r.phase==='countdown'&&r.players.filter(p=>p.connected).length<2){r.phase=now>=r.deadline?'expired':'waiting';r.startAt=null;r.gatherAt=null;if(r.phase==='expired')r.endAt=now;}
   if(r.phase==='countdown'&&now>=r.startAt)r.phase='racing';
   if(r.phase==='racing'){
    for(const p of r.players){if(!p.connected||p.finishAt!==null)continue;const i=now-p.inputAt>500?{}:p.input;const boosting=i.boost&&p.nitro>0&&p.speed>12,max=boosting?80:220/3.6;p.speed=i.gas?Math.min(max,p.speed+dt*(boosting?31:19)):Math.max(0,p.speed-dt*9);if(i.brake)p.speed=Math.max(0,p.speed-dt*35);p.nitro=boosting?Math.max(0,p.nitro-dt*25):Math.min(100,p.nitro+dt*7.5);p.lane=Math.max(-9.2,Math.min(9.2,p.lane+(i.steer||0)*dt*(i.drift?6:4)));if(Math.abs(p.lane)>6.5)p.speed=Math.max(0,p.speed-dt*20);const before=p.total;p.total+=p.speed*dt*(i.drift?.94:1);const lap=Math.floor(Math.max(0,p.total)/lengths[r.track]);if(lap>p.lastLap){const crossingFraction=p.total===before?1:(lap*lengths[r.track]-before)/(p.total-before);const crossingAt=now-(1-Math.max(0,Math.min(1,crossingFraction)))*dt*1000;const lapTime=(crossingAt-p.lapStart)/1000;p.bestLap=p.bestLap===null?lapTime:Math.min(p.bestLap,lapTime);p.lapStart=crossingAt;p.lastLap=lap;if(lap>=3){p.total=lengths[r.track]*3;p.finishAt=crossingAt}}}
    if(r.players.every(p=>p.finishAt!==null||!p.connected)||now-r.startAt>900000){r.phase='done';r.endAt=now}
   }
   if(['done','expired'].includes(r.phase)&&now-r.endAt>60000){for(const p of r.players)this.sessions.delete(p.token);this.rooms.delete(r.id)}
  }
 }
 snapshot(token){const p=this.auth(token),r=this.rooms.get(p.roomId);if(!r)throw Error('방이 종료되었습니다.');const ranked=[...r.players].sort((a,b)=>a.finishAt!==null&&b.finishAt!==null?a.finishAt-b.finishAt:a.finishAt!==null?-1:b.finishAt!==null?1:b.total-a.total);return {roomId:r.id,phase:r.phase,track:r.track,now:this.now(),deadline:r.deadline,gatherAt:r.gatherAt,startAt:r.startAt,players:ranked.map((q,i)=>({id:q.id,name:q.name,style:q.style,color:q.color,connected:q.connected,total:q.total,lane:q.lane,speed:q.speed,nitro:q.nitro,rank:i+1,finishAt:q.finishAt,bestLap:q.bestLap}))}}
}
module.exports={RaceHub,lengths};
