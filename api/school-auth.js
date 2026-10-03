// Connexion eleve privee. Les identifiants Supabase restent sur le serveur.
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const derive = promisify(crypto.scrypt);
const TEACHER = '6f2f80f4-54a2-4209-8ae5-ae2666ad63fe';
const PUBLIC_KEY = 'sb_publishable_3U3GQYUOvopdBYANuH_bdg_7_Qgqzg0';
const COOKIE = '__Host-ecole-svt';
const HOURS = 8 * 60 * 60;
function equal(a, b) {
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function sign(value, secret) {
  return crypto.createHmac('sha256', secret).update('ecole-svt-session-v1:' + value).digest('base64url');
}
function cookie(res, value, age) {
  res.setHeader('Set-Cookie', `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`);
}
function failure(status, message) {
  const error = new Error(message); error.status = status; throw error;
}
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'Methode non autorisee.' });
  }
  const base = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!base.startsWith('https://') || !secret) return res.status(503).json({ error: 'Connexion non configuree.' });
  async function api(path, options = {}) {
    const reply = await fetch(base + path, {
      ...options, headers: { apikey: secret, 'Content-Type': 'application/json', ...options.headers },
      signal: AbortSignal.timeout(10000)
    });
    if (!reply.ok) failure(502, 'Service temporairement indisponible.');
    return reply.status === 204 ? null : reply.json();
  }
  async function account(code) {
    const q = new URLSearchParams({ student_code: 'eq.' + code, select: 'student_code,password_hash,session_version', limit: '1' });
    return (await api('/rest/v1/school_student_accounts?' + q))[0];
  }
  async function student(code) {
    const q = new URLSearchParams({ Students_code: 'eq.' + code, select: 'Students_code,first_name,last_name,class_name,active', limit: '2' });
    const rows = await api('/rest/v1/Students?' + q);
    return rows.length === 1 && rows[0].active === true ? rows[0] : null;
  }
  async function teacher() {
    const authorization = req.headers.authorization || '';
    if (!/^Bearer \S+$/.test(authorization)) failure(401, 'Connectez-vous comme professeur.');
    const reply = await fetch(base + '/auth/v1/user', {
      headers: { apikey: PUBLIC_KEY, Authorization: authorization }, signal: AbortSignal.timeout(10000)
    });
    if (!reply.ok) failure(401, 'Connexion professeur expiree.');
    if ((await reply.json()).id !== TEACHER) failure(403, 'Acces reserve au professeur.');
  }
  try {
    if (req.method === 'POST') {
      const origin = req.headers.origin;
      const host = req.headers.host;
      if (origin && origin !== 'https://' + host) failure(403, 'Origine non autorisee.');
      if (req.headers['sec-fetch-site'] === 'cross-site') failure(403, 'Origine non autorisee.');
    }
    let body = {};
    if (req.method === 'POST') {
      if (!(req.headers['content-type'] || '').startsWith('application/json')) failure(415, 'Format JSON requis.');
      try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
      catch { failure(400, 'Requete invalide.'); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) failure(400, 'Requete invalide.');
      if (JSON.stringify(body).length > 4096) failure(413, 'Requete trop longue.');
    }
    const action = req.method === 'GET' ? req.query?.action || 'session' : body.action;
    if (action === 'accounts' && req.method === 'GET') {
      await teacher();
      const students = await api('/rest/v1/Students?select=Students_code,first_name,last_name,class_name,active&order=last_name.asc&limit=1000');
      const accounts = await api('/rest/v1/school_student_accounts?select=student_code&limit=1000');
      const codes = new Set(accounts.map(a => a.student_code));
      return res.status(200).json({ students: students.map(s => ({ ...s, has_password: codes.has(s.Students_code) })) });
    }
    if (action === 'logout' && req.method === 'POST') {
      cookie(res, '', 0); return res.status(200).json({ ok: true });
    }
    if (action === 'session' && req.method === 'GET') {
      const entry = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='));
      const value = entry ? entry.slice(COOKIE.length + 1) : '';
      const parts = value.split('.');
      if (parts.length !== 2 || value.length > 2048 || !equal(Buffer.from(parts[1]), Buffer.from(sign(parts[0], secret)))) failure(401, 'Connectez-vous avec votre code et votre mot de passe.');
      let payload;
      try { payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString()); } catch { failure(401, 'Session invalide.'); }
      if (typeof payload.code !== 'string' || !Number.isFinite(payload.exp) || payload.exp <= Date.now() / 1000) failure(401, 'Connexion expiree.');
      const a = await account(payload.code);
      const s = await student(payload.code);
      if (!a || !s || a.session_version !== payload.version) failure(401, 'Reconnectez-vous.');
      return res.status(200).json({ student: s });
    }
    if (!['login', 'set-password'].includes(action) || req.method !== 'POST') failure(400, 'Action inconnue.');
    if (action === 'set-password') await teacher();
    const code = typeof body.student_code === 'string' ? body.student_code.trim() : '';
    const password = body.password;
    if (!code || code.length > 100 || /[\x00-\x1f]/.test(code) || typeof password !== 'string' || password.length > 128 || !password) failure(400, 'Code ou mot de passe invalide.');
    if (action === 'set-password') {
      if (password.length < 10) failure(400, 'Utilisez au moins 10 caracteres pour le mot de passe.');
      if (!await student(code)) failure(400, 'Eleve introuvable ou desactive.');
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = (await derive(password, salt, 64)).toString('hex');
      // Chaque changement de mot de passe invalide les anciennes sessions.
      const version = crypto.randomUUID();
      await api('/rest/v1/school_student_accounts?on_conflict=student_code', {
        method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ student_code: code, password_hash: `scrypt:${salt}:${hash}`, session_version: version })
      });
      return res.status(200).json({ ok: true });
    }
    const ip = req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const key = crypto.createHash('sha256').update(String(ip).split(',')[0].trim() + ':' + code).digest('hex');
    if (!await api('/rest/v1/rpc/school_login_allowed', { method: 'POST', body: JSON.stringify({ attempt_key: key }) })) failure(429, 'Trop de tentatives. Reessayez dans 15 minutes.');
    const a = await account(code);
    const s = await student(code);
    const stored = a?.password_hash || '';
    const valid = /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(stored);
    const [, salt, hash] = valid ? stored.split(':') : ['scrypt', '0'.repeat(32), '0'.repeat(128)];
    const candidate = await derive(password, salt, 64);
    if (!valid || !equal(candidate, Buffer.from(hash, 'hex')) || !s) failure(401, 'Code ou mot de passe incorrect.');
    const payload = Buffer.from(JSON.stringify({ code, version: a.session_version, exp: Math.floor(Date.now() / 1000) + HOURS })).toString('base64url');
    cookie(res, payload + '.' + sign(payload, secret), HOURS);
    return res.status(200).json({ student: s });
  } catch (error) {
    return res.status(error.status || 503).json({ error: error.status ? error.message : 'Service temporairement indisponible.' });
  }
};
