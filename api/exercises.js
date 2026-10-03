// École SVT — travaux des élèves et corrections du professeur.
const schoolAuth = require('./school-auth.js');
const TEACHER_ID = '6f2f80f4-54a2-4209-8ae5-ae2666ad63fe';
const PUBLIC_KEY = 'sb_publishable_3U3GQYUOvopdBYANuH_bdg_7_Qgqzg0';

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Méthode non autorisée.' });
  }
  const base = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!base || !secret) return res.status(503).json({ error: 'Configuration du serveur incomplète.' });
  // Sans jeton professeur, vérifier la session élève sur le serveur.
  if (!req.headers.authorization) {
    try {
      let sessionStatus = 503;
      let sessionData;
      const sessionResponse = {
        setHeader() {},
        status(code) { sessionStatus = code; return this; },
        json(data) { sessionData = data; return this; }
      };
      await schoolAuth({ ...req, method: 'GET', query: { action: 'session' } }, sessionResponse);
      if (sessionStatus !== 200) return res.status(sessionStatus).json(sessionData);
      const code = sessionData.student.Students_code;
      const headers = { apikey: secret, 'Content-Type': 'application/json' };
      const exercise = 'u1p1-restitution';
      const query = new URLSearchParams({ student_code: 'eq.' + code,
        exercise_id: 'eq.' + exercise, select: '*', order: 'version.desc', limit: '50' });
      async function readWorks() {
        const reply = await fetch(base + '/rest/v1/exercise_submissions?' + query, {
          headers, signal: AbortSignal.timeout(10000)
        });
        if (!reply.ok) throw new Error('database');
        return reply.json();
      }
      if (req.method === 'GET') {
        return res.status(200).json({ submissions: await readWorks() });
      }
      if ((req.headers.origin && req.headers.origin !== 'https://' + req.headers.host)
        || req.headers['sec-fetch-site'] === 'cross-site') {
        return res.status(403).json({ error: 'Origine non autorisée.' });
      }
      if (!(req.headers['content-type'] || '').startsWith('application/json')) {
        return res.status(415).json({ error: 'Format JSON requis.' });
      }
      let body;
      try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
      catch { return res.status(400).json({ error: 'Données invalides.' }); }
      if (!body || Array.isArray(body) || typeof body !== 'object'
        || JSON.stringify(body).length > 20000 || body.exercise_id !== exercise) {
        return res.status(400).json({ error: 'Exercice ou données invalides.' });
      }
      const answers = body.answers;
      const keys = ['I-1','I-2','I-3','I-4','II-1','II-2','II-3','II-4',
        'III-1','III-2','III-3','III-4','IV-1','IV-2','V-1','V-2','V-3','V-4'];
      if (!answers || Array.isArray(answers) || typeof answers !== 'object'
        || Object.keys(answers).length !== keys.length || keys.some(key => {
          const value = answers[key];
          return typeof value !== 'string' || (key.startsWith('IV-')
            ? !value.trim() || value.length > 4000
            : key.startsWith('V-') ? !['true','false'].includes(value)
            : !['a','b','c','d'].includes(value));
        })) return res.status(400).json({ error: 'Complétez toutes les réponses.' });
      const cleanAnswers = Object.fromEntries(keys.map(key => [key, answers[key].trim()]));
      for (let attempt = 0; attempt < 3; attempt++) {
        const works = await readWorks();
        const latest = works[0];
        // Un double clic ou une réponse réseau perdue ne crée pas deux copies.
        if (latest && keys.every(key => latest.answers?.[key] === cleanAnswers[key])) {
          return res.status(200).json({ submission: latest });
        }
        if (latest && latest.status !== 'reviewed') {
          return res.status(409).json({ error: latest.status === 'completed'
            ? 'Ce travail est terminé.' : 'Votre travail attend la correction du professeur.' });
        }
        const reply = await fetch(base + '/rest/v1/exercise_submissions', {
          method: 'POST', headers: { ...headers, Prefer: 'return=representation' },
          body: JSON.stringify({ student_code: code, exercise_id: exercise,
            version: (latest?.version || 0) + 1, answers: cleanAnswers,
            attachment_paths: [], status: 'submitted' }),
          signal: AbortSignal.timeout(10000)
        });
        if (reply.status === 409) continue;
        if (!reply.ok) throw new Error('database');
        return res.status(201).json({ submission: (await reply.json())[0] });
      }
      return res.status(409).json({ error: 'Un envoi est déjà en cours. Consultez votre travail.' });
    } catch {
      return res.status(502).json({ error: 'Service indisponible. Réessayez dans un instant.' });
    }
  }
  const authorization = req.headers.authorization || '';
  if (!/^Bearer \S+$/.test(authorization)) return res.status(401).json({ error: 'Connexion professeur requise.' });
  try {
    const authResponse = await fetch(base + '/auth/v1/user', {
      headers: { apikey: PUBLIC_KEY, Authorization: authorization },
      signal: AbortSignal.timeout(10000)
    });
    if (!authResponse.ok) return res.status(401).json({ error: 'Veuillez vous reconnecter.' });
    const user = await authResponse.json();
    if (user.id !== TEACHER_ID) return res.status(403).json({ error: 'Accès réservé au professeur.' });
    const headers = { apikey: secret, 'Content-Type': 'application/json' };
    if (req.method === 'GET') {
      const response = await fetch(base + '/rest/v1/exercise_submissions?select=*&order=submitted_at.desc&limit=500', {
        headers, signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) throw new Error('database');
      return res.status(200).json({ submissions: await response.json() });
    }
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Données invalides.' }); }
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return res.status(400).json({ error: 'Données invalides.' });
    const { id, teacher_feedback, score, status } = body;
    if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      || typeof teacher_feedback !== 'string' || teacher_feedback.length > 20000
      || !['reviewed', 'completed'].includes(status)
      || !(score === null || (typeof score === 'number' && Number.isFinite(score) && score >= 0))) {
      return res.status(400).json({ error: 'Retour, note ou statut invalide.' });
    }
    const response = await fetch(base + '/rest/v1/exercise_submissions?id=eq.' + encodeURIComponent(id), {
      method: 'PATCH', headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({ teacher_feedback, score, status, reviewed_at: new Date().toISOString() }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error('database');
    const rows = await response.json();
    if (!rows.length) return res.status(404).json({ error: 'Travail introuvable.' });
    return res.status(200).json({ submission: rows[0] });
  } catch {
    return res.status(502).json({ error: 'Service indisponible. Réessayez dans un instant.' });
  }
};
