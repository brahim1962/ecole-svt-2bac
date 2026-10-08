// Suivi personnel en lecture seule.
const schoolAuth = require('./school-auth.js');

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({
      error: 'Méthode non autorisée.'
    });
  }

  const base = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const secret = process.env.SUPABASE_SECRET_KEY;

  if (!base.startsWith('https://') || !secret) {
    return res.status(503).json({
      error: 'Service non configuré.'
    });
  }

  async function api(path) {
    const response = await fetch(base + path, {
      headers: { apikey: secret },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      fail(502, 'Service temporairement indisponible.');
    }

    return response.json();
  }

  const query = (table, params) =>
    api('/rest/v1/' + table + '?' + new URLSearchParams(params));

  async function quizResults(studentCode) {
    try {
      const students = await query('Students', {
        Students_code: 'eq.' + studentCode,
        active: 'eq.true',
        select: 'id',
        limit: '2'
      });

      if (students.length !== 1 || !students[0].id) {
        throw new Error('Élève introuvable.');
      }

      const attempts = await query('quiz_attempts', {
        student_id: 'eq.' + students[0].id,
        status: 'eq.finished',
        select: 'quiz_id,score,finished_at,created_at',
        order: 'created_at.desc,id.desc',
        limit: '200'
      });

      const ids = [...new Set(attempts.map(a => a.quiz_id))];
      let titles = [];

      if (ids.length) {
        titles = await query('quizzes', {
          id: 'in.(' + ids.join(',') + ')',
          select: 'id,title',
          limit: '200'
        });
      }

      const titleMap = new Map(
        titles.map(q => [String(q.id), q.title])
      );

      return {
        quizzes: attempts.map(a => ({
          title: titleMap.get(String(a.quiz_id)) || 'Quiz',
          score: a.score ?? null,
          max_score: 20,
          completed_at: a.finished_at || a.created_at
        }))
      };
    } catch {
      return {
        quizzes: [],
        quiz_notice:
          'Les résultats des quiz sont temporairement indisponibles. Actualise le suivi pour réessayer.'
      };
    }
  }

  try {
    let status = 500;
    let session;

    const sessionResponse = {
      setHeader() {},
      status(value) {
        status = value;
        return this;
      },
      json(value) {
        session = value;
        return this;
      }
    };

    await schoolAuth(
      {
        method: 'GET',
        headers: req.headers,
        socket: req.socket,
        query: { action: 'session' }
      },
      sessionResponse
    );

    if (status !== 200) {
      fail(status, session?.error || 'Reconnecte-toi.');
    }

    const student = session?.student;

    if (!student?.Students_code) {
      fail(401, 'Reconnecte-toi.');
    }

    // Le code provient exclusivement de la session vérifiée.
    const studentCode = student.Students_code;

    const [submissions, quiz] = await Promise.all([
      query('exercise_submissions', {
        student_code: 'eq.' + studentCode,
        select:
          'exercise_id,version,status,teacher_feedback,score,submitted_at,reviewed_at',
        order: 'version.desc',
        limit: '1000'
      }),
      quizResults(studentCode)
    ]);

    return res.status(200).json({
      student,
      submissions,
      ...quiz
    });
  } catch (error) {
    return res.status(error.status || 503).json({
      error: error.status
        ? error.message
        : 'Service temporairement indisponible.'
    });
  }
};
