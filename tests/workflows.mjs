import assert from 'node:assert/strict';
const base=process.env.SKILLFORGE_TEST_ORIGIN||'http://localhost:4173';
const owner='qa-'+crypto.randomUUID();
let passed=0;
async function request(body,expected=200,who=owner){const r=await fetch(base+'/api/skillforge',{method:body===undefined?'GET':'POST',headers:{...(who?{'oai-authenticated-user-id':who}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)});const d=await r.json();assert.equal(r.status,expected,JSON.stringify(d));return d;}
function ok(label){passed++;console.log('PASS '+label);}
let s=await request();assert.equal(s.enrolments.length,1);assert.equal(s.submissions.length,1);ok('Demo records created once');
await request({action:'enrol',program:'security'},409);await request({action:'enrol',program:'cloud'},409);ok('Prerequisite and capacity rules enforced');
const pair=await Promise.all([request({action:'enrol',program:'python'}),request({action:'enrol',program:'python'})]);s=await request();assert.equal(s.enrolments.filter(x=>x.program==='python').length,1);ok('Concurrent repeated enrolment creates one record');
await request({action:'submit',program:'sql',content:'A valid piece of evidence but not enrolled in the program.'},403);
await request({action:'submit',program:'python',content:'short'},400);
s=await request({action:'submit',program:'python',content:'A Python log parser reads each line and counts ERROR entries. It catches missing file errors and validates each timestamp. Tests include an empty file, a valid log and malformed data.'});assert.equal(s.submissions.length,2);ok('Submission ownership and input checks');
await request({action:'mark',program:'network',mode:'draft',scores:[18,34,36],feedback:'Detailed feedback.',version:1},403);ok('Learner cannot mark');
await request({action:'role',role:'trainer'});
await request({action:'mark',program:'network',mode:'draft',scores:[21,34,36],feedback:'Detailed feedback.',version:1},400);ok('Out-of-range marks rejected');
s=await request({action:'mark',program:'network',mode:'draft',scores:[18,34,36],feedback:'Strong addressing plan and a clear verification approach.',version:1});assert.equal(s.competencies.length,0);assert.equal(s.submissions.find(x=>x.program==='network').version,2);
s=await request({action:'role',role:'learner'});const hidden=s.submissions.find(x=>x.program==='network');assert.equal(hidden.scores,null);assert.equal(hidden.feedback,'');assert.equal(hidden.status,'submitted');assert.equal(s.audits.length,0);ok('Drafts hidden from learner and do not update progress');
await request({action:'role',role:'trainer'});
await request({action:'mark',program:'network',mode:'release',scores:[18,34,36],feedback:'Strong addressing plan and a clear verification approach.',version:1},409);ok('Stale result version rejected');
s=await request({action:'mark',program:'network',mode:'release',scores:[18,34,36],feedback:'Strong addressing plan and a clear verification approach.',version:2});assert.equal(s.competencies[0].achieved,1);assert.equal(s.events.length,1);assert(s.audits.some(a=>a.action==='Result released'));ok('Release saves result, competencies, audit and pending event');
await request({action:'mark',program:'network',mode:'release',scores:[18,34,36],feedback:'Changed feedback.',version:3},400);ok('Amendment requires reason');
s=await request({action:'mark',program:'network',mode:'release',scores:[18,34,37],feedback:'Updated after checking the verification evidence again.',reason:'A documented test was missed during the first review.',version:3});assert(s.audits.some(a=>a.action==='Result amended'));assert.equal(s.submissions.find(x=>x.program==='network').version,4);ok('Amendment increments version and retains audit reason');
s=await request({action:'role',role:'learner'});assert.deepEqual(s.submissions.find(x=>x.program==='network').scores,[18,34,37]);s=await request({action:'enrol',program:'security'});assert(s.enrolments.some(e=>e.program==='security'));ok('Released evidence visible and prerequisite unlocks');
s=await request();assert.equal(s.enrolments.length,3);ok('Saved state survives a fresh request');
console.log(`${passed} workflow checks passed.`);
