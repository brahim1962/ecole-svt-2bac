// Suivi en lecture seule et échanges privés parent-professeur.
const crypto = require('node:crypto');
const parentAuth = require('./parent-auth.js');
const TEACHER = '6f2f80f4-54a2-4209-8ae5-ae2666ad63fe';
const PUBLIC_KEY = 'sb_publishable_3U3GQYUOvopdBYANuH_bdg_7_Qgqzg0';
function fail(status, message) { const error = new Error(message); error.status = status; throw error; }
function code(value) { if (typeof value !== 'string' || !value.trim() || value.length > 100 || /[\x00-\x1f]/.test(value)) fail(400, 'Identifiant invalide.'); return value.trim(); }
module.exports = async function handler(req, res) {
 res.setHeader('Cache-Control', 'no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if (!['GET','POST'].includes(req.method)) {res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Méthode non autorisée.'});}
 const base=(process.env.SUPABASE_URL||'').replace(/\/$/,''),secret=process.env.SUPABASE_SECRET_KEY;
 if(!base.startsWith('https://')||!secret)return res.status(503).json({error:'Service non configuré.'});
 async function api(path,options={}) {const r=await fetch(base+path,{...options,headers:{apikey:secret,'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(10000)});if(!r.ok)fail(502,'Service temporairement indisponible.');const text=await r.text();return text.trim()?JSON.parse(text):null;}
 const query=(table,params)=>api('/rest/v1/'+table+'?'+new URLSearchParams(params));
 async function parentSession(){let status=500,data;const response={setHeader(){},status(n){status=n;return this;},json(value){data=value;return this;}};await parentAuth({method:'GET',headers:req.headers,socket:req.socket,query:{action:'session'}},response);if(status!==200)fail(status,data?.error||'Connectez-vous comme parent.');return data;}
 async function teacher(){const auth=req.headers.authorization||'';if(!/^Bearer \S+$/.test(auth))fail(401,'Connexion professeur requise.');const r=await fetch(base+'/auth/v1/user',{headers:{apikey:PUBLIC_KEY,Authorization:auth},signal:AbortSignal.timeout(10000)});if(!r.ok)fail(401,'Connexion professeur expirée.');if((await r.json()).id!==TEACHER)fail(403,'Accès réservé au professeur.');}
 async function thread(parent,student){const [links,accounts,students]=await Promise.all([query('school_parent_students',{parent_code:'eq.'+parent,student_code:'eq.'+student,select:'parent_code',limit:'1'}),query('school_parent_accounts',{parent_code:'eq.'+parent,active:'eq.true',select:'parent_code',limit:'1'}),query('Students',{Students_code:'eq.'+student,active:'eq.true',select:'Students_code',limit:'1'})]);if(!links.length||!accounts.length||!students.length)fail(403,'Cet enfant n’est pas accessible avec ce compte.');}
 async function messages(parent,student){const rows=await query('school_parent_messages',{parent_code:'eq.'+parent,student_code:'eq.'+student,select:'id,sender_role,body,created_at,read_at',order:'created_at.desc,id.desc',limit:'200'});return rows.reverse();}
 async function quizResults(student){
  try{
   // Les tentatives référencent Students.id ; le code reste validé par la session parent.
   const students=await query('Students',{Students_code:'eq.'+student,active:'eq.true',select:'id',limit:'2'});
   if(students.length!==1||!students[0].id)throw new Error('Élève introuvable.');
   const attempts=await query('quiz_attempts',{student_id:'eq.'+students[0].id,status:'eq.finished',select:'quiz_id,score,finished_at,created_at',order:'created_at.desc,id.desc',limit:'200'});
   const ids=[...new Set(attempts.map(a=>a.quiz_id))];
   let titles=[];
   if(ids.length)titles=await query('quizzes',{id:'in.('+ids.join(',')+')',select:'id,title',limit:'200'});
   const titleMap=new Map(titles.map(q=>[String(q.id),q.title]));
   // Le champ score de Quiz SVT contient déjà la note sur 20.
   return{quizzes:attempts.map(a=>({title:titleMap.get(String(a.quiz_id))||'Quiz',score:a.score??null,max_score:20,completed_at:a.finished_at||a.created_at}))};
  }catch{return{quizzes:[],quiz_notice:'Les résultats des quiz sont temporairement indisponibles. Actualisez le suivi pour réessayer.'};}
 }

 try{
  let body={};if(req.method==='POST'){
   if(req.headers.origin&&req.headers.origin!=='https://'+req.headers.host||req.headers['sec-fetch-site']==='cross-site')fail(403,'Origine non autorisée.');
   if(!(req.headers['content-type']||'').startsWith('application/json'))fail(415,'Format JSON requis.');
   try{body=typeof req.body==='string'?JSON.parse(req.body):req.body;}catch{fail(400,'Requête invalide.');}
   if(!body||typeof body!=='object'||Array.isArray(body))fail(400,'Requête invalide.');if(JSON.stringify(body).length>24000)fail(413,'Requête trop longue.');
  }
  const teacherMode=Boolean(req.headers.authorization);let session;if(teacherMode)await teacher();else session=await parentSession();
  const action=req.method==='GET'?(req.query?.action||'summary'):body.action;
  if(teacherMode&&req.method==='GET'&&action==='threads'){
   const [links,parents,students,recent]=await Promise.all([query('school_parent_students',{select:'parent_code,student_code',limit:'5000'}),query('school_parent_accounts',{active:'eq.true',select:'parent_code,parent_name',limit:'1000'}),query('Students',{active:'eq.true',select:'Students_code,first_name,last_name,class_name',limit:'1000'}),query('school_parent_messages',{select:'id,parent_code,student_code,sender_role,body,created_at,read_at',order:'created_at.desc,id.desc',limit:'1000'})]);
   const ps=new Map(parents.map(p=>[p.parent_code,p])),ss=new Map(students.map(s=>[s.Students_code,s]));
   return res.status(200).json({threads:links.filter(l=>ps.has(l.parent_code)&&ss.has(l.student_code)).map(l=>{const ms=recent.filter(m=>m.parent_code===l.parent_code&&m.student_code===l.student_code);return{...l,parent_name:ps.get(l.parent_code).parent_name,student:ss.get(l.student_code),latest_message:ms[0]||null,unread:ms.filter(m=>m.sender_role==='parent'&&!m.read_at).length};})});
  }
  const student=code(req.method==='GET'?req.query?.student_code:body.student_code);
  const parent=teacherMode?code(req.method==='GET'?req.query?.parent_code:body.parent_code):session.parent.parent_code;
  if(!teacherMode&&!session.students.some(s=>s.Students_code===student))fail(403,'Cet enfant n’est pas rattaché à votre compte.');
  await thread(parent,student);
  if(req.method==='GET'&&['summary','messages'].includes(action)){
   if(action==='messages'||teacherMode)return res.status(200).json({messages:await messages(parent,student)});
   const [submissions,ms,quiz]=await Promise.all([query('exercise_submissions',{student_code:'eq.'+student,select:'exercise_id,version,status,teacher_feedback,score,submitted_at,reviewed_at',order:'version.desc',limit:'1000'}),messages(parent,student),quizResults(student)]);
   return res.status(200).json({submissions,messages:ms,...quiz});
  }
  if(req.method==='POST'&&action==='read'){
   const q=new URLSearchParams({parent_code:'eq.'+parent,student_code:'eq.'+student,sender_role:'eq.'+(teacherMode?'parent':'teacher'),read_at:'is.null'});
   await api('/rest/v1/school_parent_messages?'+q,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({read_at:new Date().toISOString()})});return res.status(200).json({ok:true});
  }
  if(req.method==='POST'&&action==='send'){
   const text=typeof body.body==='string'?body.body.trim():'';if(!text||text.length>5000||/[\x00]/.test(text))fail(400,'Votre message doit contenir entre 1 et 5 000 caractères.');
   const key=crypto.createHash('sha256').update('parent-message:'+parent+':'+(teacherMode?'teacher':'parent')).digest('hex');
   if(!await api('/rest/v1/rpc/school_login_allowed',{method:'POST',body:JSON.stringify({attempt_key:key})}))fail(429,'Trop de messages rapprochés. Réessayez dans 15 minutes.');
   const rows=await api('/rest/v1/school_parent_messages',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({parent_code:parent,student_code:student,sender_role:teacherMode?'teacher':'parent',body:text})});
   const m=rows[0];return res.status(201).json({message:{id:m.id,sender_role:m.sender_role,body:m.body,created_at:m.created_at}});
  }
  fail(400,'Action inconnue.');
 }catch(error){return res.status(error.status||503).json({error:error.status?error.message:'Service temporairement indisponible.'});}
};
