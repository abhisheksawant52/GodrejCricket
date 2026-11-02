import { createClient } from '@supabase/supabase-js';

const json = (res, status, body) => res.status(status).setHeader('Cache-Control', 'no-store').json(body);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed.' });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return json(res, 503, { error: 'Player list is not available yet.' });

  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await supabase.from('registrations')
      .select('id, name, details, payment_status')
      .eq('type', 'Player')
      .order('created_at', { ascending: true });
    if (error) return json(res, 500, { error: 'Could not load the player list.' });
    return json(res, 200, { players: (data || []).map(player => ({ id: player.id, name: player.name, role: player.details?.playing_role || null, team_name: player.details?.team_name || null, photo: player.details?.photo || null, category: player.details?.player_category || null, age: player.details?.age || null, experience: player.details?.experience || null, batting: player.details?.batting || null, bowling: player.details?.bowling || null, matches: player.details?.matches || null, runs: player.details?.runs || null, wickets: player.details?.wickets || null, payment_status: player.payment_status === 'Paid' ? 'Paid' : 'Pending' })) });
  } catch {
    return json(res, 500, { error: 'Could not load the player list.' });
  }
}
