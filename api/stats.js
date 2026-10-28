import { createClient } from '@supabase/supabase-js';

const json = (res, status, body) => res.status(status).setHeader('Cache-Control', 'no-store').json(body);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed.' });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return json(res, 503, { error: 'Registration database is not configured.' });

  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const types = ['Player', 'Owner', 'Audience'];
    const results = await Promise.all(types.map(type =>
      supabase.from('registrations').select('id', { count: 'exact', head: true }).eq('type', type)
    ));
    if (results.some(result => result.error)) return json(res, 500, { error: 'Could not load registration totals.' });

    const [players, owners, audience] = results.map(result => result.count || 0);
    return json(res, 200, {
      counts: { total: players + owners + audience, players, owners, audience },
      updated_at: new Date().toISOString()
    });
  } catch {
    return json(res, 500, { error: 'Could not load registration totals.' });
  }
}
