import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,sep,extname} from 'node:path';
import {spawn} from 'node:child_process';
import {GET,POST} from './server/api.mjs';
import {closeDatabase} from './server/storage.mjs';
const port=Number(process.env.PORT||3000);
const root=fileURLToPath(new URL('./dist/',import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{
 const reply=(status,text)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify({error:text}));};
 try{
  if(![`localhost:${port}`,`127.0.0.1:${port}`].includes(req.headers.host))return reply(403,'Invalid local host.');
  if(req.headers['sec-fetch-site']==='cross-site')return reply(403,'Open SkillForge directly on localhost.');
  const url=new URL(req.url,`http://${req.headers.host}`);
  if(url.pathname==='/api/skillforge'){
   if(!['GET','POST'].includes(req.method))return reply(405,'Method not allowed.');
   let body; if(req.method==='POST'){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>25000)return reply(413,'This submission is too long.');chunks.push(chunk);}body=Buffer.concat(chunks).toString('utf8');}
   const request=new Request(url,{method:req.method,headers:req.headers,...(body===undefined?{}:{body})});
   const response=await(req.method==='GET'?GET(request):POST(request));
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
  }
  if(!['GET','HEAD'].includes(req.method))return reply(405,'Method not allowed.');
  const pathname=decodeURIComponent(url.pathname);
  const path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!path.startsWith(root.endsWith(sep)?root:root+sep))return reply(404,'Not found.');
  let data;try{data=await readFile(path);}catch{return reply(404,'Not found.');}
  res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:data);
 }catch(e){console.error(e);if(!res.headersSent)reply(500,'Local server error. Please restart SkillForge.');else res.end();}
});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`Port ${port} is in use. Close the other SkillForge window and try again.`:e.message);closeDatabase();process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>{
 const url=`http://localhost:${port}`;
 console.log(`\nSkillForge is ready: ${url}\nKeep this window open. Press Ctrl+C to stop.\nYour records are saved in the data folder.\n`);
 if(process.argv.includes('--open')){
  const child=process.platform==='win32'?spawn('cmd.exe',['/c','start','',url],{stdio:'ignore'}):process.platform==='darwin'?spawn('open',[url],{stdio:'ignore'}):spawn('xdg-open',[url],{stdio:'ignore'});
  child.on('error',()=>console.log('Open the address above in your browser.'));child.unref();
 }
});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{closeDatabase();process.exit(0);}));
