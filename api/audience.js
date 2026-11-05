import { createClient } from '@supabase/supabase-js';

const json = (res, status, body) => res.status(status).setHeader('Cache-Control', 'no-store').json(body);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed.' });
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return json(res, 503, { error: 'Audience T-shirt status is not available yet.' });
  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await supabase.from('registrations')
      .select('name, details, payment_status')
      .eq('type', 'Audience')
      .order('created_at', { ascending: true });
    if (error) return json(res, 500, { error: 'Could not load Audience T-shirt status.' });
    return json(res, 200, { orders: (data || []).map(order => ({
      name: order.name,
      size: order.details?.['t-shirt_size'] || null,
      payment_status: order.payment_status === 'Paid' ? 'Paid' : 'Pending',
      shirt_status: order.details?.jersey_issued ? 'Issued' : 'Not issued yet'
    })) });
  } catch {
    return json(res, 500, { error: 'Could not load Audience T-shirt status.' });
  }
}
