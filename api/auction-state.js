import { createClient } from '@supabase/supabase-js';
import { sessionIsValid } from './auction-auth.js';

const respond = (res, status, body) => res.status(status).setHeader('Cache-Control', 'no-store').json(body);

export default async function handler(req, res) {
  if (!sessionIsValid(req)) return respond(res, 401, { error: 'Admin sign-in required.' });
  if (!['GET', 'PUT'].includes(req.method)) {
    res.setHeader('Allow', 'GET, PUT');
    return respond(res, 405, { error: 'Method not allowed.' });
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return respond(res, 503, { error: 'Auction sync is not configured.' });
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  if (req.method === 'GET') {
    const { data, error } = await supabase.from('gnpl_auction_state').select('state, updated_at').eq('id', 'godrej-nest-cricket-league').maybeSingle();
    if (error) return respond(res, 503, { error: 'Auction state table is missing or unavailable.' });
    return respond(res, 200, { state: data?.state || null, updatedAt: data?.updated_at || null });
  }
  const state = req.body?.state;
  if (!state || typeof state !== 'object' || Array.isArray(state) || JSON.stringify(state).length > 900000) return respond(res, 400, { error: 'Invalid auction state.' });
  const { error } = await supabase.from('gnpl_auction_state').upsert({ id: 'godrej-nest-cricket-league', state, updated_at: new Date().toISOString() });
  if (error) return respond(res, 503, { error: 'Could not save auction state.' });
  return respond(res, 200, { ok: true, updatedAt: new Date().toISOString() });
}
