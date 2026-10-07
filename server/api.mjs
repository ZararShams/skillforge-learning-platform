import { database } from './storage.mjs';
import { programmes, outcome, validateScores, sampleSubmission } from './catalogue.mjs';
export const dynamic = 'force-dynamic';
class ApiError extends Error {
    status;
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}
function identity(req) { return 'local-demo'; }
function json(data, status = 200) { return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } }); }
function error(e) { if (e instanceof ApiError)
    return json({ error: e.message }, e.status); console.error('SkillForge request failed', e); return json({ error: 'We could not save or load your work. Your previous records are safe. Please try again.' }, 503); }
async function initialise(owner) {
    const db = database();
    const exists = await db.prepare('SELECT owner FROM workspaces WHERE owner=?').bind(owner).first();
    if (exists)
        return;
    const now = new Date().toISOString();
    await db.batch([
        db.prepare('INSERT OR IGNORE INTO workspaces(owner,role,created_at) VALUES (?, ?, ?)').bind(owner, 'learner', now),
        db.prepare('INSERT OR IGNORE INTO enrolments(id,owner,program,created_at) VALUES (?, ?, ?, ?)').bind(owner + ':network', owner, 'network', now),
        db.prepare('INSERT OR IGNORE INTO submissions(id,owner,program,content,status,created_at,updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(owner + ':network', owner, 'network', sampleSubmission, 'submitted', now, now),
        db.prepare('INSERT OR IGNORE INTO audits(id,owner,actor,action,program,detail,created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(owner + ':seed', owner, 'System', 'Sample workspace created', 'network', 'A sample enrolment and submission are ready to demonstrate marking.', now)
    ]);
}
async function state(owner) {
    const db = database();
    const w = await db.prepare('SELECT role FROM workspaces WHERE owner=?').bind(owner).first();
    const [e, s, c, a, v] = await db.batch([
        db.prepare('SELECT id,program,created_at FROM enrolments WHERE owner=? ORDER BY created_at DESC').bind(owner),
        db.prepare('SELECT id,program,content,status,scores,feedback,version,created_at,updated_at FROM submissions WHERE owner=?').bind(owner),
        db.prepare('SELECT program,achieved,scores,updated_at FROM competencies WHERE owner=?').bind(owner),
        db.prepare('SELECT id,actor,action,program,detail,created_at FROM audits WHERE owner=? ORDER BY created_at DESC,id DESC LIMIT 100').bind(owner),
        db.prepare('SELECT id,program,kind,status,created_at FROM events WHERE owner=? ORDER BY created_at DESC LIMIT 50').bind(owner)
    ]);
    return { role: w.role, enrolments: e.results, submissions: s.results.map((r) => ({ ...r, scores: w.role === 'trainer' || r.status === 'released' ? (r.scores ? JSON.parse(r.scores) : null) : null, feedback: w.role === 'trainer' || r.status === 'released' ? r.feedback : '', status: w.role === 'learner' && r.status === 'draft' ? 'submitted' : r.status })), competencies: c.results.map((r) => ({ ...r, scores: JSON.parse(r.scores) })), audits: w.role === 'trainer' ? a.results : [], events: v.results };
}
export async function GET(req) { try {
    const owner = identity(req);
    await initialise(owner);
    return json(await state(owner));
}
catch (e) {
    return error(e);
} }
export async function POST(req) {
    try {
        const owner = identity(req);
        const origin = req.headers.get('origin');
        if (origin && origin !== new URL(req.url).origin)
            throw new ApiError('This request must come from your SkillForge workspace.', 403);
        if (!req.headers.get('content-type')?.includes('application/json'))
            throw new ApiError('Use a JSON request.', 415);
        const raw = await req.text();
        if (raw.length > 25000)
            throw new ApiError('This submission is too long.', 413);
        let b;
        try {
            b = JSON.parse(raw);
        }
        catch {
            throw new ApiError('Invalid request.');
        }
        if (!b || typeof b !== 'object' || Array.isArray(b))
            throw new ApiError('Invalid request.');
        await initialise(owner);
        const db = database(), now = new Date().toISOString();
        const w = await db.prepare('SELECT role FROM workspaces WHERE owner=?').bind(owner).first();
        if (b.action === 'role') {
            if (!['learner', 'trainer'].includes(b.role))
                throw new ApiError('Choose learner or trainer.');
            await db.prepare('UPDATE workspaces SET role=? WHERE owner=?').bind(b.role, owner).run();
            return json(await state(owner));
        }
        const p = programmes.find(x => x.id === b.program);
        if (!p)
            throw new ApiError('Choose an available program.');
        if (b.action === 'enrol') {
            if (w.role !== 'learner')
                throw new ApiError('Switch to the learner demo to enrol.', 403);
            const existing = await db.prepare('SELECT id FROM enrolments WHERE owner=? AND program=?').bind(owner, p.id).first();
            if (existing)
                return json({ ...await state(owner), message: 'You are already enrolled in this intake.' });
            const id = crypto.randomUUID();
            const result = await db.batch([
                db.prepare(`INSERT INTO enrolments(id,owner,program,created_at) SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM enrolments WHERE owner=? AND program=?) < ? AND (? IS NULL OR EXISTS(SELECT 1 FROM competencies WHERE owner=? AND program=? AND achieved=1)) ON CONFLICT(owner,program) DO NOTHING`).bind(id, owner, p.id, now, owner, p.id, p.capacity - p.taken, p.prerequisite, owner, p.prerequisite),
                db.prepare("INSERT INTO audits(id,owner,actor,action,program,detail,created_at) SELECT ?,?,'Learner','Enrolment confirmed',?,'Place saved for the current demo intake.',? WHERE EXISTS(SELECT 1 FROM enrolments WHERE id=?)").bind(crypto.randomUUID(), owner, p.id, now, id)
            ]);
            if (!result[0].meta.changes) {
                const already = await db.prepare('SELECT id FROM enrolments WHERE owner=? AND program=?').bind(owner, p.id).first();
                if (!already)
                    throw new ApiError(p.capacity === p.taken ? 'This intake is full. Choose another program.' : 'Complete Networking Foundations before enrolling in this program.', 409);
            }
            return json({ ...await state(owner), message: 'Enrolment confirmed. Your program is in My learning.' });
        }
        if (b.action === 'submit') {
            if (w.role !== 'learner')
                throw new ApiError('Switch to the learner demo to submit work.', 403);
            const content = typeof b.content === 'string' ? b.content.trim() : '';
            if (content.length < 40 || content.length > 12000)
                throw new ApiError('Enter between 40 and 12,000 characters of assessment evidence.');
            const enrolled = await db.prepare('SELECT id FROM enrolments WHERE owner=? AND program=?').bind(owner, p.id).first();
            if (!enrolled)
                throw new ApiError('Enrol before submitting this assessment.', 403);
            const id = crypto.randomUUID();
            const result = await db.batch([
                db.prepare("INSERT INTO submissions(id,owner,program,content,status,created_at,updated_at) VALUES (?,?,?,?,'submitted',?,?) ON CONFLICT(owner,program) DO NOTHING").bind(id, owner, p.id, content, now, now),
                db.prepare("INSERT INTO audits(id,owner,actor,action,program,detail,created_at) SELECT ?,?,'Learner','Assessment submitted',?,'Written evidence received.',? WHERE EXISTS(SELECT 1 FROM submissions WHERE id=?)").bind(crypto.randomUUID(), owner, p.id, now, id)
            ]);
            return json({ ...await state(owner), message: result[0].meta.changes ? 'Assessment submitted. Your trainer can now mark it.' : 'This assessment has already been submitted.' });
        }
        if (b.action === 'mark') {
            if (w.role !== 'trainer')
                throw new ApiError('Only the assigned trainer can mark this assessment.', 403);
            if (p.trainer !== 'Alex Morgan')
                throw new ApiError('This program is not assigned to this trainer.', 403);
            let scores;
            try {
                scores = validateScores(b.scores);
            }
            catch (e) {
                throw new ApiError(e.message);
            }
            if (!['draft', 'release'].includes(b.mode))
                throw new ApiError('Choose save draft or release.');
            const feedback = typeof b.feedback === 'string' ? b.feedback.trim() : '';
            if (feedback.length > 4000)
                throw new ApiError('Feedback must be under 4,000 characters.');
            if (b.mode === 'release' && feedback.length < 10)
                throw new ApiError('Add at least 10 characters of useful feedback before release.');
            const sub = await db.prepare('SELECT * FROM submissions WHERE owner=? AND program=?').bind(owner, p.id).first();
            if (!sub)
                throw new ApiError('No assessment has been submitted.', 404);
            if (sub.version !== b.version)
                throw new ApiError('This result changed in another session. Reload the latest version before saving.', 409);
            const reason = typeof b.reason === 'string' ? b.reason.trim() : '';
            if (sub.status === 'released' && (b.mode !== 'release' || reason.length < 10 || reason.length > 1000))
                throw new ApiError('To amend a released result, add a reason of 10 to 1,000 characters and release the amendment.');
            const released = b.mode === 'release', token = crypto.randomUUID(), scoreJson = JSON.stringify(scores), achieved = outcome(scores) ? 1 : 0;
            const detail = released ? `Version ${sub.version + 1}; score ${scores.reduce((a, c) => a + c, 0)}/100; ${achieved ? 'competent' : 'not yet competent'}.${reason ? ' Amendment reason: ' + reason : ''}` : 'Private marking draft saved. Learner progress unchanged.';
            const statements = [db.prepare('UPDATE submissions SET scores=?,feedback=?,status=?,version=version+1,token=?,updated_at=? WHERE owner=? AND program=? AND version=?').bind(scoreJson, feedback, released ? 'released' : 'draft', token, now, owner, p.id, b.version),
                db.prepare("INSERT INTO audits(id,owner,actor,action,program,detail,created_at) SELECT ?,?,'Trainer',?,?,?,? WHERE EXISTS(SELECT 1 FROM submissions WHERE owner=? AND program=? AND token=?)").bind(crypto.randomUUID(), owner, released ? (sub.status === 'released' ? 'Result amended' : 'Result released') : 'Draft saved', p.id, detail, now, owner, p.id, token)];
            if (released) {
                statements.push(db.prepare(`INSERT INTO competencies(id,owner,program,achieved,scores,updated_at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM submissions WHERE owner=? AND program=? AND token=?) ON CONFLICT(owner,program) DO UPDATE SET achieved=excluded.achieved,scores=excluded.scores,updated_at=excluded.updated_at`).bind(owner + ':' + p.id, owner, p.id, achieved, scoreJson, now, owner, p.id, token));
                statements.push(db.prepare("INSERT INTO events(id,owner,program,kind,status,created_at) SELECT ?,?,?,?,'pending',? WHERE EXISTS(SELECT 1 FROM submissions WHERE owner=? AND program=? AND token=?)").bind(token, owner, p.id, achieved ? 'credential_check' : 'result_notification', now, owner, p.id, token));
            }
            const result = await db.batch(statements);
            if (!result[0].meta.changes)
                throw new ApiError('This result changed in another session. Reload before saving.', 409);
            return json({ ...await state(owner), message: released ? 'Result released. Learner progress and audit history updated.' : 'Draft saved. Marks remain private.' });
        }
        throw new ApiError('Unknown action.');
    }
    catch (e) {
        return error(e);
    }
}
