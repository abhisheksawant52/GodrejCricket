import { createClient } from '@supabase/supabase-js';

const db = () => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
};
const json = (res, status, body) => res.status(status).setHeader('Cache-Control', 'no-store').json(body);
const clean = (s, max = 160) => typeof s === 'string' ? s.trim().slice(0, max) : '';

export default async function handler(req, res) {
  const supabase = db();
  if (!supabase) return json(res, 503, { error: 'Registration database is not configured yet.' });

  if (req.method === 'POST') {
    const body = req.body || {};
    const type = clean(body.type, 20);
    const name = clean(body.name);
    const phone = clean(body.phone, 24);
    const email = '';
    const wing = clean(body.wing, 60);
    const flatNo = clean(body.flat_no, 60);
    const paymentReference = clean(body.payment_reference, 120);
    const paymentTime = clean(body.payment_time, 40);
    if (!['Player', 'Owner'].includes(type) || !name || !phone) return json(res, 400, { error: 'Please complete the required fields.' });
    if (!wing || !flatNo) return json(res, 400, { error: 'Please enter your wing and flat number.' });
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(paymentTime)) return json(res, 400, { error: 'Choose a valid payment time using the time picker.' });
    const { data, error } = await supabase.from('registrations').insert({
      type, name, phone, email, apartment: `${wing} / ${flatNo}`,
      details: { ...(body.details && typeof body.details === 'object' && !Array.isArray(body.details) ? body.details : {}), wing, flat_no: flatNo },
      payment_reference: paymentReference, payment_status: 'Pending'
    }).select('id, created_at').single();
    if (error) return json(res, 500, { error: 'Could not save your registration. Please try again.' });
    return json(res, 201, { ok: true, ...data });
  }

  if (!process.env.ADMIN_PASSWORD || req.headers['x-admin-password'] !== process.env.ADMIN_PASSWORD) return json(res, 401, { error: 'Admin sign-in required.' });
  if (req.method === 'GET') {
    const { data, error } = await supabase.from('registrations').select('*').order('created_at', { ascending: false });
    if (error) return json(res, 500, { error: 'Could not load registrations.' });
    return json(res, 200, { registrations: data });
  }
  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return json(res, 400, { error: 'Invalid registration ID.' });
    }
    const { data, error } = await supabase.from('registrations').delete().eq('id', id).select('id').maybeSingle();
    if (error) return json(res, 500, { error: 'Could not delete registration.' });
    if (!data) return json(res, 404, { error: 'Registration was not found.' });
    return json(res, 200, { ok: true });
  }
  if (req.method === 'PATCH') {
    const { id, payment_status, team_name, player_profile } = req.body || {};
    if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return json(res, 400, { error: 'Invalid registration ID.' });
    const updates = {};
    if (typeof payment_status !== 'undefined') {
      if (!['Paid', 'Pending'].includes(payment_status)) return json(res, 400, { error: 'Invalid payment update.' });
      updates.payment_status = payment_status;
    }
    if (typeof team_name !== 'undefined') {
      const allowedTeams = ['Nest United', 'The Strikers', 'Boundary Breakers', 'Wicket Warriors', 'Pitch Panthers', 'Rising Royals', 'Power Hitters', 'Crease Kings'];
      if (typeof team_name !== 'string' || (team_name !== '' && !allowedTeams.includes(team_name))) return json(res, 400, { error: 'Choose a valid team.' });
      const { data: registration, error: readError } = await supabase.from('registrations').select('type, details').eq('id', id).maybeSingle();
      if (readError) return json(res, 500, { error: 'Could not load the player registration.' });
      if (!registration) return json(res, 404, { error: 'Registration was not found.' });
      if (registration.type !== 'Player') return json(res, 400, { error: 'Only player registrations can be assigned to a team.' });
      updates.details = { ...(registration.details && typeof registration.details === 'object' && !Array.isArray(registration.details) ? registration.details : {}), team_name: team_name || null };
    }
    if (typeof player_profile !== 'undefined') {
      if (!player_profile || typeof player_profile !== 'object' || Array.isArray(player_profile)) return json(res, 400, { error: 'Invalid player details.' });
      const allowed = ['photo', 'age', 'player_category', 'playing_role', 'experience', 'batting', 'bowling', 'matches', 'runs', 'wickets', 'team_name'];
      const { data: registration, error: readError } = await supabase.from('registrations').select('type, details').eq('id', id).maybeSingle();
      if (readError) return json(res, 500, { error: 'Could not load the player registration.' });
      if (!registration) return json(res, 404, { error: 'Registration was not found.' });
      if (registration.type !== 'Player') return json(res, 400, { error: 'Only player registrations have player details.' });
      const profile = Object.fromEntries(allowed.filter(key => typeof player_profile[key] !== 'undefined').map(key => [key, player_profile[key]]));
      if (profile.photo && (typeof profile.photo !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(profile.photo) || profile.photo.length > 700000)) return json(res, 400, { error: 'Player photo must be a compressed JPG, PNG or WebP under 500 KB.' });
      updates.details = { ...(registration.details && typeof registration.details === 'object' && !Array.isArray(registration.details) ? registration.details : {}), ...profile };
    }
    if (!Object.keys(updates).length) return json(res, 400, { error: 'No supported registration update was provided.' });
    const { error } = await supabase.from('registrations').update(updates).eq('id', id);
    if (error) return json(res, 500, { error: 'Could not update registration.' });
    return json(res, 200, { ok: true });
  }
  res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
  return json(res, 405, { error: 'Method not allowed.' });
}
