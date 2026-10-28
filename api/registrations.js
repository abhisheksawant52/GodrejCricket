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
    const email = clean(body.email, 180);
    if (!['Player', 'Owner', 'Audience'].includes(type) || !name || !phone || !email) return json(res, 400, { error: 'Please complete the required fields.' });
    const { data, error } = await supabase.from('registrations').insert({
      type, name, phone, email, apartment: clean(body.apartment, 120),
      details: body.details && typeof body.details === 'object' ? body.details : {},
      payment_reference: clean(body.payment_reference, 100), payment_status: 'Pending'
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
  if (req.method === 'PATCH') {
    const { id, payment_status } = req.body || {};
    if (!id || !['Paid', 'Pending'].includes(payment_status)) return json(res, 400, { error: 'Invalid payment update.' });
    const { error } = await supabase.from('registrations').update({ payment_status }).eq('id', id);
    if (error) return json(res, 500, { error: 'Could not update payment status.' });
    return json(res, 200, { ok: true });
  }
  res.setHeader('Allow', 'GET, POST, PATCH');
  return json(res, 405, { error: 'Method not allowed.' });
}
