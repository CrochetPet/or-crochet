// Run behind an HTTPS reverse proxy. Never expose the private data directory.
import http from 'node:http';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import {validate as validateLive} from './live-core.mjs';
const root=dirname(fileURLToPath(import.meta.url));
const dataDir=resolve(process.env.DATA_DIR||resolve(root,'../crochet-private'));
if(dataDir===root||dataDir.startsWith(root+sep))throw Error('DATA_DIR must be outside the public website');
await mkdir(dataDir,{recursive:true,mode:0o700});
const base='/'+(process.env.BASE_PATH||'').replace(/^\/+|\/+$/g,'');
const prefix=base==='/'?'':base, sessions=new Map(),attempts=new Map();
const secure=process.env.COOKIE_SECURE!=='false';
const cookie=(value,age)=>`crochet_admin=${value}; HttpOnly; SameSite=Strict; Path=${prefix||'/'}; Max-Age=${age}${secure?'; Secure':''}`;
async function load(name,fallback){try{return JSON.parse(await readFile(resolve(dataDir,name),'utf8'))}catch(e){if(e.code==='ENOENT')return fallback;throw e}}
async function save(name,value){const file=resolve(dataDir,name),temp=file+'.'+randomBytes(8).toString('hex');await writeFile(temp,JSON.stringify(value,null,2),{mode:0o600});await rename(temp,file)}
let auth=await load('auth.json',null);
if(!auth){if(!process.env.ADMIN_PASSWORD||process.env.ADMIN_PASSWORD.length<12)throw Error('Set ADMIN_PASSWORD (at least 12 characters) for the first start');const salt=randomBytes(16).toString('hex');auth={salt,hash:scryptSync(process.env.ADMIN_PASSWORD,salt,64).toString('hex')};await save('auth.json',auth)}
let catalog=await load('catalog.json',JSON.parse(await readFile(resolve(root,'data/catalog.json'),'utf8')));
let live=await load('live.json',JSON.parse(await readFile(resolve(root,'data/live.json'),'utf8')));
let orders=await load('orders.json',[]),messages=await load('messages.json',[]);
function passwordOK(p){const value=scryptSync(String(p||''),auth.salt,64);return timingSafeEqual(value,Buffer.from(auth.hash,'hex'))}
function authorized(req){const token=req.headers.cookie?.match(/(?:^|;\s*)crochet_admin=([a-f0-9]+)/)?.[1];return token&&sessions.get(token)>Date.now()}
function json(res,status,data,headers={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(JSON.stringify(data))}
async function body(req){let bytes=0,chunks=[];for await(const c of req){bytes+=c.length;if(bytes>1024*1024)throw Error('הבקשה גדולה מדי');chunks.push(c)}return JSON.parse(Buffer.concat(chunks).toString()||'{}')}
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff','.webp':'image/webp'};
const server=http.createServer(async(req,res)=>{try{
 const full=new URL(req.url,'http://localhost');let path=decodeURIComponent(full.pathname);if(prefix){if(!path.startsWith(prefix+'/')&&path!==prefix)return json(res,404,{error:'לא נמצא'});path=path.slice(prefix.length)||'/'}
 const logged=authorized(req),route=path.replace(/^\/api\//,'');
 if(!['GET','HEAD'].includes(req.method)){
  // Reject cross-site writes; only the site's exact public origin may submit.
  const origin=req.headers.origin;const expected=process.env.PUBLIC_ORIGIN||`http://${req.headers.host}`;
  if(!origin||origin!==expected)return json(res,403,{error:'מקור הבקשה אינו מורשה'});
 }
 if(path==='/api/session')return json(res,200,{authenticated:!!logged,configured:true});
 if(path==='/api/login'&&req.method==='POST'){
  const key=req.socket.remoteAddress,now=Date.now(),a=attempts.get(key)||{count:0,until:now+900000};if(a.until<now){a.count=0;a.until=now+900000}if(a.count>=8)return json(res,429,{error:'יותר מדי ניסיונות. נסו שוב בעוד 15 דקות'});
  const input=await body(req);if(!passwordOK(input.password)){a.count++;attempts.set(key,a);return json(res,401,{error:'קוד הכניסה אינו נכון'})}attempts.delete(key);const token=randomBytes(32).toString('hex');sessions.set(token,now+8*3600000);return json(res,200,{ok:true},{'Set-Cookie':cookie(token,8*3600)});
 }
 if(path==='/api/logout'&&req.method==='POST'){const token=req.headers.cookie?.match(/crochet_admin=([a-f0-9]+)/)?.[1];sessions.delete(token);return json(res,200,{ok:true},{'Set-Cookie':cookie('',0)})}
 if(path==='/api/public')return json(res,200,catalog);
 if(path==='/data/live.json')return json(res,200,live);
 if(path==='/data/catalog.json')return json(res,200,catalog);
 if(path.startsWith('/api/admin')){
  if(!logged)return json(res,401,{error:'נדרשת כניסה לניהול'});
  if(path==='/api/admin'&&req.method==='GET')return json(res,200,{catalog,orders,messages});
  if(path==='/api/admin/live'&&req.method==='PUT'){const next=validateLive(await body(req));await save('live.json',next);live=next;return json(res,200,{ok:true})}
  if(path==='/api/admin/password'&&req.method==='PUT'){const input=await body(req);if(!passwordOK(input.current))return json(res,403,{error:'הקוד הנוכחי אינו נכון'});if(typeof input.password!=='string'||input.password.length<12)return json(res,400,{error:'הקוד החדש חייב להכיל לפחות 12 תווים'});const salt=randomBytes(16).toString('hex');const next={salt,hash:scryptSync(input.password,salt,64).toString('hex')};await save('auth.json',next);auth=next;sessions.clear();return json(res,200,{ok:true},{'Set-Cookie':cookie('',0)})}
  if(path==='/api/admin/catalog'&&req.method==='PUT'){const next=await body(req);if(!Array.isArray(next.products)||!next.settings||!next.content)return json(res,400,{error:'קטלוג לא תקין'});next.version=Date.now();await save('catalog.json',next);catalog=next;return json(res,200,{version:next.version})}
  if(path==='/api/admin/status'&&req.method==='PUT'){const b=await body(req),list=b.type==='orders'?orders:b.type==='messages'?messages:null;if(!list||!['חדש','בטיפול','הושלם','בוטל'].includes(b.status))return json(res,400,{error:'סטטוס לא תקין'});const row=list.find(x=>x.id===b.id);if(!row)return json(res,404,{error:'לא נמצא'});row.status=b.status;await save(b.type+'.json',list);return json(res,200,{ok:true})}
  return json(res,404,{error:'הפעולה אינה זמינה בשרת זה'});
 }
 if(['/api/orders','/api/contact'].includes(path)&&req.method==='POST'){
  const b=await body(req);if(b.website)return json(res,400,{error:'בקשה לא תקינה'});if(typeof b.name!=='string'||!b.name.trim()||b.name.length>200||typeof b.phone!=='string'||!/^[-+()0-9\s]{7,25}$/.test(b.phone))return json(res,400,{error:'יש למלא שם וטלפון תקינים'});
  const row={name:b.name,phone:b.phone,email:String(b.email||'').slice(0,250),id:randomBytes(12).toString('hex'),createdAt:new Date().toISOString(),status:'חדש'};
  if(path==='/api/orders'){if(!Array.isArray(b.items)||!b.items.length||b.items.length>100)return json(res,400,{error:'עגלה לא תקינה'});row.items=b.items.map(i=>{const p=catalog.products.find(p=>p.id===i.id&&p.visible!==false&&p.inStock);if(!p||!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>99||(p.stock!==null&&i.quantity>p.stock))throw Error('מוצר או כמות אינם זמינים');return{id:p.id,name:p.name,price:p.price,quantity:i.quantity}});row.total=row.items.reduce((a,i)=>a+i.price*i.quantity,0);row.address=String(b.address||'').slice(0,1000);row.note=String(b.note||'').slice(0,4000);orders.push(row);await save('orders.json',orders)}else{row.message=String(b.message||'').slice(0,5000);messages.push(row);await save('messages.json',messages)}return json(res,201,{id:row.id});
 }
 if(path.startsWith('/api/'))return json(res,404,{error:'לא נמצא'});
 if(path.startsWith('/admin')&&path!=='/admin/login.html'&&!logged){res.writeHead(303,{Location:prefix+'/admin/login.html','Cache-Control':'no-store'});return res.end()}
 // Serve only known public files, never backend source, dotfiles or private data.
 if(path.split('/').some(x=>x.startsWith('.')||x==='node_modules')||path==='/server.mjs')return json(res,404,{error:'לא נמצא'});
 let file=resolve(root,'.'+path);if(!file.startsWith(root+sep))file=resolve(root,'index.html');if(!extname(file))file=resolve(file,'index.html');
 const type=mime[extname(file)];if(!type)return json(res,404,{error:'לא נמצא'});let content;try{content=await readFile(file)}catch{return json(res,404,{error:'לא נמצא'})}
 res.writeHead(200,{'Content-Type':type,'X-Content-Type-Options':'nosniff','Cache-Control':path.startsWith('/admin')?'no-store':'no-cache','Referrer-Policy':'strict-origin-when-cross-origin'});res.end(req.method==='HEAD'?undefined:content);
 }catch(err){json(res,400,{error:err.message||'הפעולה נכשלה'})}});
setInterval(()=>{const now=Date.now();for(const [k,v] of sessions)if(v<now)sessions.delete(k);for(const [k,v] of attempts)if(v.until<now)attempts.delete(k)},60000).unref();
server.listen(Number(process.env.PORT||3000),process.env.HOST||'127.0.0.1',()=>console.log('Website server ready'));
