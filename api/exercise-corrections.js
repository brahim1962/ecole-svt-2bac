// École SVT — correction de référence après validation finale.
const schoolAuth = require('./school-auth.js');
const CORRECTIONS = {
  "u1p1-restitution": {
    "sections": [
      {
        "title": "I · QCM — 2 points",
        "paragraphs": [
          "1 : d ; 2 : d ; 3 : b ; 4 : d."
        ]
      },
      {
        "title": "II · Associations — 1 point",
        "paragraphs": [
          "1 : d ; 2 : c ; 3 : b ; 4 : a.",
          "La chaîne respiratoire se situe dans la membrane interne ; la glycolyse dans le hyaloplasme ; le cycle de Krebs dans la matrice. Le gradient de protons se trouve de part et d’autre de la membrane interne."
        ]
      },
      {
        "title": "III · Associations — 1 point",
        "paragraphs": [
          "1 : c ; 2 : a ; 3 : d ; 4 : b.",
          "Fermentation alcoolique : c ; respiration : a ; glycolyse : d ; fermentation lactique : b."
        ]
      },
      {
        "title": "IV · Définitions — 1 point",
        "paragraphs": [
          "1. La glycolyse est un ensemble de réactions du hyaloplasme qui transforme une molécule de glucose en deux molécules de pyruvate, avec production nette de deux ATP et réduction de deux NAD⁺ en NADH + H⁺.",
          "2. La chaîne respiratoire est un ensemble de complexes protéiques de la membrane interne mitochondriale qui assurent le transfert des électrons et l’oxydation des transporteurs réduits NADH et FADH₂."
        ]
      },
      {
        "title": "V · Vrai ou faux — 1 point",
        "paragraphs": [
          "a : Faux ; b : Vrai ; c : Vrai ; d : Faux."
        ]
      }
    ]
  },
  "u1p1-raisonnement": {
    "sections": [
      {
        "title": "1 · Analyse du spermogramme",
        "paragraphs": [
          "Le volume de 2,49 mL dépasse le seuil de 1,5 mL et la concentration de 65,34 millions/mL dépasse le seuil de 15 millions/mL. La mobilité de 37,98 % est inférieure au seuil de 40 %.",
          "Dans cet exercice, l’infertilité s’explique par la faible mobilité des spermatozoïdes malgré un volume et une concentration satisfaisants."
        ]
      },
      {
        "title": "2 · Activité mitochondriale",
        "paragraphs": [
          "a. La mobilité augmente lorsque l’activité de la citrate synthase et celle du complexe I augmentent.",
          "b. Une faible activité de la citrate synthase réduit la production de transporteurs réduits par le cycle de Krebs. Une faible activité du complexe I limite leur oxydation, le transfert des électrons et le pompage des protons. La production d’ATP diminue, ce qui réduit les mouvements des flagelles et la mobilité des spermatozoïdes."
        ]
      },
      {
        "title": "3 · Effet du succinate",
        "paragraphs": [
          "Le succinate, substrat du cycle de Krebs, permet la réduction du FAD en FADH₂. Les électrons sont transférés par le complexe II puis par les complexes III et IV. Le pompage des protons par ces derniers favorise la synthèse d’ATP et améliore la mobilité des spermatozoïdes."
        ]
      }
    ]
  },
  "u1p1-restitution-2": {
    "sections": [
      {
        "title": "I · Restitution — 2 points",
        "paragraphs": [
          "1. La chaîne respiratoire est un ensemble de complexes protéiques de la membrane interne mitochondriale assurant des réactions d’oxydoréduction et le transfert des électrons.",
          "Le rendement énergétique est le pourcentage de l’énergie du glucose conservée dans l’ATP : rendement = énergie des ATP produits / énergie du glucose × 100.",
          "2. En présence de dioxygène, les levures réalisent la respiration. Selon le bilan utilisé dans ce cours : C₆H₁₂O₆ + 6 O₂ + 38 ADP + 38 Pi → 6 CO₂ + 6 H₂O + 38 ATP.",
          "En absence de dioxygène, elles réalisent la fermentation alcoolique : C₆H₁₂O₆ + 2 ADP + 2 Pi → 2 CH₃CH₂OH + 2 CO₂ + 2 ATP."
        ]
      },
      {
        "title": "II · QCM — 2 points",
        "paragraphs": [
          "1 : b ; 2 : a ; 3 : a ; 4 : a."
        ]
      },
      {
        "title": "III · Associations — 1 point",
        "paragraphs": [
          "1 : c ; 2 : e ; 3 : b ; 4 : a.",
          "Glycolyse : c ; cycle de Krebs : e ; fermentation lactique : b ; fermentation alcoolique : a."
        ]
      }
    ]
  },
  "u1p1-raisonnement-2": {
    "sections": [
      {
        "title": "1 · Comparaison et explication",
        "paragraphs": [
          "a. Chez le malade, le pyruvate est plus élevé (0,12 contre 0,08 mmol/L) ainsi que le lactate (2,2 contre 1 mmol/L). Le nombre de mitochondries et l’activité des enzymes de la glycolyse sont élevés dans les deux cas (+++). L’activité mitochondriale est faible chez le malade (+), contre élevée chez le sujet sain (+++).",
          "b. La faible activité mitochondriale limite l’oxydation du pyruvate. Celui-ci s’accumule et la fermentation lactique augmente, ce qui explique la concentration élevée de lactate."
        ]
      },
      {
        "title": "2 · Résultats expérimentaux",
        "paragraphs": [
          "Chez le malade, la consommation de dioxygène est faible (0,021 contre 0,179 UA), l’activité de l’ATP synthase est faible (0,030 contre 0,301) et la production d’ATP est réduite."
        ]
      },
      {
        "title": "3 · ATP synthase",
        "paragraphs": [
          "La déformation du canal de l’ATP synthase limite le retour des protons vers la matrice et diminue la production d’ATP. L’accumulation des protons dans l’espace intermembranaire freine la chaîne respiratoire et réduit la consommation de dioxygène."
        ]
      },
      {
        "title": "4 · Symptômes du cas étudié",
        "paragraphs": [
          "La faible respiration réduit la production d’ATP disponible pour les muscles et explique la fatigue musculaire. L’augmentation de la fermentation lactique entraîne une production accrue de lactate, associée à l’acidose décrite et à la fatigue."
        ]
      }
    ]
  },
  "u1p1-restitution-3": {
    "sections": [
      {
        "title": "I · Définition — 0,75 point",
        "paragraphs": [
          "Une sphère pédonculée correspond à une ATP synthase, protéine de la membrane interne mitochondriale qui catalyse la phosphorylation de l’ADP en ATP."
        ]
      },
      {
        "title": "II · Réaction — 0,75 point",
        "paragraphs": [
          "CH₃COCOOH + NAD⁺ + CoA → CH₃CO–CoA + (NADH + H⁺) + CO₂.",
          "Les trois éléments à compléter sont le pyruvate (CH₃COCOOH), le transporteur réduit NADH + H⁺ et le dioxyde de carbone CO₂."
        ]
      },
      {
        "title": "III · Cinq QCM — 2,5 points",
        "paragraphs": [
          "1 : b ; 2 : c ; 3 : d ; 4 : a ; 5 : c. Chaque réponse vaut 0,5 point.",
          "La membrane externe est comparable à la membrane plasmique. Dans la convention énergétique de ce cours, l’oxydation d’un pyruvate correspond à 15 ATP. Les transporteurs réduits sont oxydés et le dioxygène est réduit en eau. L’ADP est phosphorylé. La décarboxylation oxydative du pyruvate produit l’acétyl-CoA."
        ]
      },
      {
        "title": "IV · Vrai ou faux — 1 point",
        "paragraphs": [
          "1 : Vrai ; 2 : Faux ; 3 : Faux ; 4 : Vrai. Chaque réponse vaut 0,25 point.",
          "La chaîne respiratoire se trouve dans la membrane interne. La glycolyse transforme le glucose en pyruvate dans le hyaloplasme. Le passage des protons par l’ATP synthase permet leur retour vers la matrice."
        ]
      }
    ]
  },
  "u1p1-raisonnement-3": {
    "sections": [
      {
        "title": "1 · Dioxygène et ATP — 1 point",
        "paragraphs": [
          "À t₁, l’ajout de glucose ne modifie pas les concentrations d’ATP et de dioxygène. À t₂, l’ajout de pyruvate provoque une faible diminution du dioxygène et une faible augmentation de l’ATP. À t₃, avec pyruvate, ADP et Pi, le dioxygène diminue progressivement et l’ATP augmente.",
          "La synthèse mitochondriale d’ATP est donc liée à la consommation de dioxygène et nécessite les substrats indiqués."
        ]
      },
      {
        "title": "2 · Protons — 1 point",
        "paragraphs": [
          "Avant l’ajout de dioxygène, la concentration extérieure en H⁺ est pratiquement nulle. Après l’ajout, elle augmente rapidement jusqu’à environ 45 × 10⁻⁹ mol/L, vers 20 secondes, puis diminue progressivement jusqu’au niveau initial vers 4 minutes.",
          "L’oxydation des transporteurs réduits en présence de dioxygène permet le pompage des protons de la matrice vers le milieu extérieur des mitochondries dans cette expérience."
        ]
      },
      {
        "title": "3 · Transfert des électrons — 1,25 point",
        "paragraphs": [
          "a. Solution 1 : le NADH + H⁺ est oxydé par le complexe I et Q est réduit. Solution 2 : Q réduit est oxydé par le complexe III et C est réduit. Solution 3 : C réduit est oxydé par le complexe IV et le dioxygène est réduit en eau.",
          "b. Une succession de réactions d’oxydoréduction transfère les électrons du NADH + H⁺ vers Q, puis C, puis le dioxygène, accepteur final réduit en eau."
        ]
      },
      {
        "title": "4 · Gradient de protons — 1 point",
        "paragraphs": [
          "Lorsque pHᵢ < pHₑ, la concentration intérieure en H⁺ est supérieure à la concentration extérieure : les vésicules produisent de l’ATP. Lorsque pHᵢ ≥ pHₑ, elles n’en produisent pas dans les conditions de l’expérience.",
          "La synthèse d’ATP nécessite un gradient de protons orienté dans le sens de leur passage par l’ATP synthase. Dans une mitochondrie, ce passage s’effectue de l’espace intermembranaire vers la matrice."
        ]
      },
      {
        "title": "5 · Couplage énergétique — 0,75 point",
        "paragraphs": [
          "L’oxydation des transporteurs réduits fournit les électrons à la chaîne respiratoire. L’énergie du transfert permet le pompage des H⁺ de la matrice vers l’espace intermembranaire et crée un gradient.",
          "Le retour des H⁺ vers la matrice par l’ATP synthase fournit l’énergie de la phosphorylation : ADP + Pi → ATP. Le dioxygène accepte les électrons en fin de chaîne et est réduit en eau."
        ]
      }
    ]
  }
};
module.exports = async function(req,res) {
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET') {res.setHeader('Allow','GET');return res.status(405).json({error:'Méthode non autorisée.'});}
 try {
  let status=503,session;
  await schoolAuth({method:'GET',headers:req.headers,socket:req.socket,query:{action:'session'}},{setHeader(){},status(n){status=n;return this;},json(v){session=v;return this;}});
  if(status!==200)return res.status(status).json(session);
  const exercise=req.query?.exercise_id;
  if(typeof exercise!=='string'||!Object.hasOwn(CORRECTIONS,exercise))return res.status(400).json({error:'Exercice invalide.'});
  const base=(process.env.SUPABASE_URL||'').replace(/\/$/,'');
  const secret=process.env.SUPABASE_SECRET_KEY;
  if(!base||!secret)return res.status(503).json({error:'Configuration du serveur incomplète.'});
  const query=new URLSearchParams({student_code:'eq.'+session.student.Students_code,exercise_id:'eq.'+exercise,select:'id,version,status',order:'version.desc',limit:'1'});
  const response=await fetch(base+'/rest/v1/exercise_submissions?'+query,{headers:{apikey:secret,Authorization:'Bearer '+secret},signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('database');
  const [latest]=await response.json();
  if(!latest||latest.status!=='completed')return res.status(403).json({error:'La correction sera disponible lorsque le professeur aura indiqué « Travail terminé ».'});
  return res.status(200).json({submission_id:latest.id,version:latest.version,correction:CORRECTIONS[exercise]});
 } catch {return res.status(503).json({error:'La correction ne peut pas être chargée pour le moment. Réessayez.'});}
};
