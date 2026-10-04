// École SVT — dépôt privé des copies et consultation des pièces jointes.
const crypto = require('node:crypto');
const schoolAuth = require('./school-auth.js');
const TEACHER = '6f2f80f4-54a2-4209-8ae5-ae2666ad63fe';
const PUBLIC_KEY = 'sb_publishable_3U3GQYUOvopdBYANuH_bdg_7_Qgqzg0';
const EXERCISE = 'u1p1-raisonnement';
const BUCKET = 'exercise-uploads';
const TYPES = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const LIMIT = 10 * 1024 * 1024;
const TOTAL = 20 * 1024 * 1024;
function fail(status, message) { const e = new Error(message); e.status = status; throw e; }
function signature(payload, secret) { return crypto.createHmac('sha256', secret).update('ecole-svt-copy-v1:' + payload).digest('base64url'); }
function proof(data, secret) { const payload = Buffer.from(JSON.stringify(data)).toString('base64url'); return payload + '.' + signature(payload, secret); }
function verify(value, secret) {
  if (typeof value !== 'string' || value.length > 12000) fail(400, 'Dépôt invalide.');
  const parts = value.split('.');
  if (parts.length !== 2) fail(400, 'Dépôt invalide.');
  const a = Buffer.from(parts[1]), b = Buffer.from(signature(parts[0], secret));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) fail(400, 'Dépôt invalide.');
  try { return JSON.parse(Buffer.from(parts[0], 'base64url').toString()); }
  catch { fail(400, 'Dépôt invalide.'); }
}
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!['GET','POST'].includes(req.method)) { res.setHeader('Allow','GET, POST'); return res.status(405).json({error:'Méthode non autorisée.'}); }
  const base = (process.env.SUPABASE_URL || '').replace(/\/$/,'');
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!base.startsWith('https://') || !secret) return res.status(503).json({error:'Service non configuré.'});
  async function api(path, options = {}) {
    const response = await fetch(base + path, { ...options, headers: { apikey: secret, 'Content-Type':'application/json', ...options.headers }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) { if (response.status === 409) fail(409,'Un envoi est déjà en cours. Consultez votre travail.'); fail(502,'Service des copies indisponible. Réessayez.'); }
    const text = await response.text(); return text.trim() ? JSON.parse(text) : null;
  }
  function storageUrl(relative) {
    if (typeof relative !== 'string' || !relative.startsWith('/object/')) fail(502,'Lien de copie invalide.');
    return base + '/storage/v1' + relative;
  }
  async function links(submission) {
    const files = submission.answers?.files || [];
    const paths = submission.attachment_paths || [];
    if (paths.length > 8) fail(502,'Nombre de copies invalide.');
    return Promise.all(paths.map(async (path, i) => {
      const data = await api('/storage/v1/object/sign/' + BUCKET + '/' + path, {method:'POST',body:JSON.stringify({expiresIn:900})});
      return { name: files[i]?.name || 'Copie ' + (i+1), url:storageUrl(data.signedURL) };
    }));
  }
  try {
    const authorization = req.headers.authorization || '';
    if (authorization) {
      if (req.method !== 'GET') fail(405,'Consultation uniquement.');
      if (!/^Bearer \S+$/.test(authorization)) fail(401,'Connexion professeur requise.');
      const response = await fetch(base + '/auth/v1/user', {headers:{apikey:PUBLIC_KEY,Authorization:authorization},signal:AbortSignal.timeout(10000)});
      if (!response.ok) fail(401,'Reconnectez-vous.');
      if ((await response.json()).id !== TEACHER) fail(403,'Accès réservé au professeur.');
      const id = req.query?.id;
      if (typeof id !== 'string' || !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id)) fail(400,'Travail invalide.');
      const rows = await api('/rest/v1/exercise_submissions?' + new URLSearchParams({id:'eq.'+id,select:'*',limit:'1'}));
      if (!rows.length) fail(404,'Travail introuvable.');
      return res.status(200).json({files:await links(rows[0])});
    }
    let sessionStatus = 503, sessionData;
    const sessionResponse = {setHeader(){},status(code){sessionStatus=code;return this;},json(data){sessionData=data;return this;}};
    await schoolAuth({method:'GET',headers:req.headers,socket:req.socket,query:{action:'session'}},sessionResponse);
    if (sessionStatus !== 200) return res.status(sessionStatus).json(sessionData);
    const code = sessionData.student.Students_code;
    const query = new URLSearchParams({student_code:'eq.'+code,exercise_id:'eq.'+EXERCISE,select:'*',order:'version.desc',limit:'50'});
    const readWorks = () => api('/rest/v1/exercise_submissions?' + query);
    if (req.method === 'GET') {
      const submissions = await readWorks();
      return res.status(200).json({submissions,files:submissions[0] ? await links(submissions[0]) : []});
    }
    if ((req.headers.origin && req.headers.origin !== 'https://' + req.headers.host) || req.headers['sec-fetch-site'] === 'cross-site') fail(403,'Origine non autorisée.');
    if (!(req.headers['content-type'] || '').startsWith('application/json')) fail(415,'Format JSON requis.');
    let body;
    try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; } catch { fail(400,'Données invalides.'); }
    if (!body || typeof body !== 'object' || Array.isArray(body) || JSON.stringify(body).length > 24000) fail(400,'Données invalides.');
    if (!['prepare','submit'].includes(body.action)) fail(400,'Action inconnue.');
    let works = await readWorks();
    const latest = works[0];
    // Une preuve d'envoi déjà enregistrée permet de confirmer un envoi interrompu.
    let manifest;
    if (body.action === 'submit') {
      manifest = verify(body.proof,secret);
      if (manifest.code !== code || manifest.exercise !== EXERCISE) fail(403,'Ce dépôt ne vous appartient pas.');
      if (latest?.answers?.upload_id === manifest.id) return res.status(200).json({submission:latest});
      if (!Number.isFinite(manifest.exp) || manifest.exp < Date.now()) fail(400,'Dépôt expiré. Sélectionnez de nouveau votre copie.');
    }
    if (latest && latest.status !== 'reviewed') fail(409,latest.status === 'completed' ? 'Ce travail est terminé.' : 'Votre copie attend la correction du professeur.');
    if (body.action === 'prepare') {
      const files = body.files;
      if (!Array.isArray(files) || files.length < 1 || files.length > 8) fail(400,'Choisissez de 1 à 8 fichiers.');
      if (files.some(f => !f || typeof f.name !== 'string' || !f.name.trim() || f.name.length > 200 || /[\x00-\x1f]/.test(f.name) || !Object.hasOwn(TYPES,f.type) || !Number.isInteger(f.size) || f.size < 1 || f.size > LIMIT)
        || files.reduce((n,f)=>n+f.size,0) > TOTAL) fail(400,'PDF ou photos JPEG, PNG, WEBP : 10 Mo par fichier, 20 Mo au total.');
      const attemptKey = crypto.createHash('sha256').update('paper-upload:' + code).digest('hex');
      if (!await api('/rest/v1/rpc/school_login_allowed',{method:'POST',body:JSON.stringify({attempt_key:attemptKey})})) fail(429,'Trop de dépôts. Réessayez dans 15 minutes.');
      const id = crypto.randomUUID();
      const owner = crypto.createHash('sha256').update(code).digest('hex');
      const prepared = files.map((f,i)=>({name:f.name.trim(),type:f.type,size:f.size,path:owner+'/'+EXERCISE+'/'+id+'/'+(i+1)+'.'+TYPES[f.type]}));
      const uploads = await Promise.all(prepared.map(async file => {
        const data = await api('/storage/v1/object/upload/sign/'+BUCKET+'/'+file.path,{method:'POST',body:'{}'});
        return {...file,url:storageUrl(data.url)};
      }));
      return res.status(200).json({uploads,proof:proof({id,code,exercise:EXERCISE,files:prepared,exp:Date.now()+2*60*60*1000},secret)});
    }
    if (!Array.isArray(manifest.files) || manifest.files.length < 1 || manifest.files.length > 8) fail(400,'Dépôt invalide.');
    // Vérifier l'existence et la taille des objets réellement reçus par Storage.
    const prefix = manifest.files[0].path.slice(0,manifest.files[0].path.lastIndexOf('/'));
    const objects = await api('/storage/v1/object/list/'+BUCKET,{method:'POST',body:JSON.stringify({prefix,limit:100,offset:0})});
    for (const file of manifest.files) {
      const object = objects.find(o=>o.name === file.path.split('/').pop());
      if (!object?.id || Number(object.metadata?.size) !== file.size || object.metadata?.mimetype !== file.type) fail(400,'Un fichier manque ou est incomplet. Reprenez le dépôt de votre copie.');
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      works = await readWorks();
      const last = works[0];
      if (last?.answers?.upload_id === manifest.id) return res.status(200).json({submission:last});
      if (last && last.status !== 'reviewed') fail(409,'Votre copie a déjà été envoyée. Consultez votre travail.');
      try {
        const rows = await api('/rest/v1/exercise_submissions',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({student_code:code,exercise_id:EXERCISE,version:(last?.version || 0)+1,answers:{upload_id:manifest.id,files:manifest.files.map(({name,type,size})=>({name,type,size}))},attachment_paths:manifest.files.map(f=>f.path),status:'submitted'})});
        return res.status(201).json({submission:rows[0]});
      } catch(e) { if (e.status !== 409) throw e; }
    }
    fail(409,'Un envoi est déjà en cours. Consultez votre travail.');
  } catch(e) { return res.status(e.status || 502).json({error:e.status ? e.message : 'Service des copies indisponible. Réessayez.'}); }
};
