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
    const wing = clean(body.wing, 60);
    const flatNo = clean(body.flat_no, 60);
    const paymentReference = clean(body.payment_reference, 120);
    if (!['Player', 'Owner', 'Audience'].includes(type) || !name || !phone || !email) return json(res, 400, { error: 'Please complete the required fields.' });
    if (!wing || !flatNo) return json(res, 400, { error: 'Please enter your wing and flat number.' });
    if (!paymentReference) return json(res, 400, { error: 'Enter a Google Pay transaction ID or payment time.' });
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
    const { id, payment_status } = req.body || {};
    if (!id || !['Paid', 'Pending'].includes(payment_status)) return json(res, 400, { error: 'Invalid payment update.' });
    const { error } = await supabase.from('registrations').update({ payment_status }).eq('id', id);
    if (error) return json(res, 500, { error: 'Could not update payment status.' });
    return json(res, 200, { ok: true });
  }
  res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
  return json(res, 405, { error: 'Method not allowed.' });
}
