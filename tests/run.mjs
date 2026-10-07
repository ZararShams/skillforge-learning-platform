import http from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const dir=await mkdtemp(join(tmpdir(),'skillforge-qa-')); const base='http://127.0.0.1:4173';
let server;
async function start(){server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'4173',SKILLFORGE_DATA_DIR:dir},stdio:['ignore','pipe','inherit']});await new Promise((resolve,reject)=>{server.stdout.on('data',b=>{if(b.toString().includes('ready:'))resolve();});server.once('exit',c=>reject(new Error('Server exited '+c)));server.once('error',reject);});}
async function stop(){await new Promise(resolve=>{server.once('exit',resolve);server.kill('SIGTERM');});}
try{
 await start();
 const code=await new Promise(resolve=>{const child=spawn(process.execPath,['tests/workflows.mjs'],{env:{...process.env,SKILLFORGE_TEST_ORIGIN:base},stdio:'inherit'});child.once('exit',resolve);});assert.equal(code,0);
 let r=await fetch(base);assert.equal(r.status,200);const html=await r.text();for(const asset of [...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)])assert.equal((await fetch(base+asset[1])).status,200);console.log('PASS Built page and assets served');
 assert.equal((await fetch(base+'/api/skillforge',{method:'POST',headers:{origin:'https://example.com','content-type':'application/json'},body:'{"action":"role","role":"trainer"}'})).status,403);
 assert.equal(await new Promise((resolve,reject)=>{const req=http.get(base,{headers:{Host:'example.com:4173'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);}),403);assert.equal((await fetch(base+'/server/schema.sql')).status,404);console.log('PASS Foreign origin, host and private-file checks');
 await stop();await start();const saved=await(await fetch(base+'/api/skillforge')).json();assert.equal(saved.enrolments.length,3);assert.equal(saved.competencies[0].achieved,1);assert.deepEqual(saved.submissions.find(s=>s.program==='network').scores,[18,34,37]);console.log('PASS Records persist after server restart');
}finally{if(server?.exitCode===null)await stop();await rm(dir,{recursive:true,force:true});}
