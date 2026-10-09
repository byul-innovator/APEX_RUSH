'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {RaceHub}=require('./race-hub.cjs');
function createServer({hub=new RaceHub(),allowedOrigins=[]}={}){
 const streams=new Map();const root=__dirname;
 function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value))}
 const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');const origin=req.headers.origin;
  const sameOrigin=origin===`http://${req.headers.host}`||origin===`https://${req.headers.host}`;
  if(origin&&!sameOrigin&&!allowedOrigins.includes(origin)){json(res,403,{error:'허용되지 않은 접속 주소입니다.'});return}
  if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin')}
  if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'});res.end();return}
  try{
   if(url.pathname==='/api/rooms'&&req.method==='GET'){json(res,200,{rooms:hub.list()});return}
   if(url.pathname==='/api/health'){json(res,200,{ok:true,rooms:hub.rooms.size});return}
   if(url.pathname==='/api/events'&&req.method==='GET'){
    const token=url.searchParams.get('token');hub.touch(token);if(streams.has(token))streams.get(token).end();res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write('retry: 1000\n\n');streams.set(token,res);res.write(`data: ${JSON.stringify(hub.snapshot(token))}\n\n`);req.on('close',()=>{if(streams.get(token)===res){streams.delete(token);hub.disconnect(token)}});return
   }
   if(url.pathname.startsWith('/api/')&&req.method==='POST'){
    if(!String(req.headers['content-type']).startsWith('application/json')){json(res,415,{error:'JSON 요청이 필요합니다.'});return}
    let chunks='',tooLarge=false;for await(const chunk of req){chunks+=chunk;if(chunks.length>4096){tooLarge=true;break}}if(tooLarge){json(res,413,{error:'요청이 너무 큽니다.'});return}
    const body=JSON.parse(chunks||'{}');
    if(url.pathname==='/api/join')json(res,200,hub.join(body));
    else if(url.pathname==='/api/ready')json(res,200,hub.ready(body.token,body.ready));
    else if(url.pathname==='/api/start')json(res,200,hub.start(body.token));
    else if(url.pathname==='/api/profile'){json(res,200,hub.profile(body.token,body.profile||{}))}
    else if(url.pathname==='/api/input'){hub.input(body.token,body.input||{});json(res,200,{ok:true})}
    else if(url.pathname==='/api/leave'){hub.leave(body.token);streams.get(body.token)?.end();streams.delete(body.token);json(res,200,{ok:true})}
    else json(res,404,{error:'알 수 없는 API입니다.'});return
   }
   // Serve only game assets; credentials, server source and dotfiles are never served.
   const relative=decodeURIComponent(url.pathname).replace(/^\//,'')||'index.html';
   const files=['index.html','game3d.js','blender_car_asset.js','three.min.js','landing.css','online-client.js','rooms.js','online.css','runtime-config.js'];
   if(!files.includes(relative)&&!/^assets\/[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp|svg)$/.test(relative)){res.writeHead(404);res.end('Not found');return}
   const file=path.join(root,relative);if(!fs.existsSync(file)){res.writeHead(404);res.end('Not found');return}
   const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});fs.createReadStream(file).pipe(res);
  }catch(e){json(res,400,{error:e.message})}
 });
 const timer=setInterval(()=>{for(const token of streams.keys()){try{hub.touch(token)}catch{}}hub.tick();for(const [token,res]of streams){try{if(res.writableLength>1048576){res.destroy();streams.delete(token);hub.disconnect(token);continue}res.write(`data: ${JSON.stringify(hub.snapshot(token))}\n\n`)}catch{res.end();streams.delete(token)}}},50);timer.unref();server.on('close',()=>{clearInterval(timer);for(const res of streams.values())res.end()});return {server,hub};
}
if(require.main===module){const {server}=createServer({allowedOrigins:(process.env.ALLOWED_ORIGINS||'').split(',').filter(Boolean)});const host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT)||8088;server.listen(port,host,()=>console.log(`APEX RUSH: http://${host}:${port}`))}
module.exports={createServer};
