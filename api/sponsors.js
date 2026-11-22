import { createClient } from '@supabase/supabase-js';

const json = (res, status, body) => res.status(status).setHeader('Cache-Control', 'no-store').json(body);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed.' });
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return json(res, 503, { error: 'Sponsor showcase is not available.' });
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data, error } = await supabase.from('registrations').select('name, details').eq('type', 'Sponsor').order('created_at', { ascending: true });
    if (error) return json(res, 500, { error: 'Could not load sponsor profiles.' });
    const sponsors = (data || []).filter(row => row.details?.public_showcase_permission === 'yes').map(row => {
      const details = row.details || {};
      const logo = typeof details.logo_url === 'string' && /^https:\/\//i.test(details.logo_url) ? details.logo_url : '';
      const support = details.sponsorship_type === 'In-kind'
        ? details.contribution_details || details.sponsorship_area
        : `${details.sponsorship_area || 'Match-day support'} · Cash sponsorship`;
      return { name: String(details.organization_name || row.name).trim().slice(0, 120), logo, support: String(support || '').trim().slice(0, 300), area: String(details.sponsorship_area || '').slice(0, 80), type: details.sponsorship_type === 'In-kind' ? 'In-kind' : 'Cash' };
    }).filter(sponsor => sponsor.name);
    return json(res, 200, { sponsors });
  } catch {
    return json(res, 500, { error: 'Could not load sponsor profiles.' });
  }
}
