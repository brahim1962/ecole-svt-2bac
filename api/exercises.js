// École SVT — consultation et correction des travaux par le professeur.
// Les accès élèves seront ajoutés avec leur authentification dédiée.
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
