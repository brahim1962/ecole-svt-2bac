// École SVT — passage sécurisé vers Quiz SVT.
const crypto = require('node:crypto');
const schoolAuth = require('./school-auth.js');
const QUIZ = 'https://quiz-svt-2bac-pc.vercel.app';
const PURPOSE = 'ecole-svt-quiz-access-v1';
function signature(payload, secret) {
  return crypto.createHmac('sha256', secret).update(PURPOSE + ':' + payload).digest('base64url');
}
function invalid(message = 'Accès expiré. Revenez dans Mon espace SVT et cliquez sur Quiz SVT.') {
  const error = new Error(message); error.status = 401; throw error;
}
module.exports = async function(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST'); return res.status(405).json({error:'Méthode non autorisée.'});
  }
  const base = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!base.startsWith('https://') || !secret) return res.status(503).json({error:'Accès aux quiz temporairement indisponible.'});
  async function read(table, query) {
    const response = await fetch(base + '/rest/v1/' + table + '?' + new URLSearchParams(query), {
      headers: {apikey:secret}, signal:AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error('database');
    return response.json();
  }
  try {
    if (req.method === 'GET') {
      let status = 503, session;
      await schoolAuth({method:'GET',headers:req.headers,socket:req.socket,query:{action:'session'}}, {
        setHeader(){},status(code){status=code;return this;},json(data){session=data;return this;}
      });
      if (status === 401) {res.setHeader('Location','/index.html');return res.status(303).end();}
      if (status !== 200) return res.status(status).json(session);
      const code = session.student.Students_code;
      const cookie = (req.headers.cookie || '').split(';').map(s=>s.trim()).find(s=>s.startsWith('__Host-ecole-svt='));
      // La signature et la version de cette session viennent d'être vérifiées par school-auth.
      const sessionPayload = JSON.parse(Buffer.from(cookie.slice('__Host-ecole-svt='.length).split('.')[0], 'base64url').toString());
      const now = Math.floor(Date.now()/1000);
      const payload = Buffer.from(JSON.stringify({purpose:PURPOSE,audience:QUIZ,code,
        version:sessionPayload.version,iat:now,exp:Math.min(now+120,sessionPayload.exp),nonce:crypto.randomBytes(16).toString('hex')})).toString('base64url');
      res.setHeader('Location', QUIZ + '/#school-access=' + payload + '.' + signature(payload,secret));
      return res.status(303).end();
    }
    // Quiz SVT appelle cette vérification depuis son serveur ; aucune clé n'est transmise au navigateur.
    if (req.headers.origin && req.headers.origin !== QUIZ) return res.status(403).json({error:'Origine non autorisée.'});
    if (!(req.headers['content-type'] || '').startsWith('application/json')) return res.status(415).json({error:'Format JSON requis.'});
    let body;
    try {body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;} catch {return res.status(400).json({error:'Données invalides.'});}
    const ticket = body?.ticket;
    if (typeof ticket !== 'string' || ticket.length > 2048) invalid();
    const parts = ticket.split('.');
    if (parts.length !== 2) invalid();
    const actual = Buffer.from(parts[1]); const expected = Buffer.from(signature(parts[0],secret));
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual,expected)) invalid();
    let payload;
    try {payload=JSON.parse(Buffer.from(parts[0],'base64url').toString());} catch {invalid();}
    const now = Date.now()/1000;
    if (payload.purpose !== PURPOSE || payload.audience !== QUIZ || typeof payload.code !== 'string'
      || !payload.code || payload.code.length>100 || typeof payload.version !== 'string'
      || !Number.isSafeInteger(payload.iat) || !Number.isSafeInteger(payload.exp)
      || payload.iat>now+5 || payload.exp<=now || payload.exp-payload.iat>120 || payload.exp<=payload.iat) invalid();
    const accounts = await read('school_student_accounts',{student_code:'eq.'+payload.code,select:'session_version',limit:'1'});
    if (accounts[0]?.session_version !== payload.version) invalid();
    const students = await read('Students',{Students_code:'eq.'+payload.code,select:'id,Students_code,first_name,last_name,class_name,active',limit:'2'});
    if (students.length!==1 || students[0].active!==true) invalid('Cet accès élève est désactivé.');
    return res.status(200).json({student:students[0]});
  } catch(error) {
    return res.status(error.status || 503).json({error:error.status ? error.message : 'Accès aux quiz temporairement indisponible. Réessayez depuis Mon espace SVT.'});
  }
};
