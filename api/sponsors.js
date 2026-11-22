import { createClient } from '@supabase/supabase-js';
import communitySponsors from '../src/communitySponsors.js';

const json = (res, status, body) => res.status(status).setHeader('Cache-Control', 'no-store').json(body);

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { error: 'Method not allowed.' });
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return req.method === 'GET' ? json(res, 200, { sponsors: communitySponsors }) : json(res, 503, { error: 'Sponsor database is not configured.' });
  if (req.method === 'POST' && (!process.env.ADMIN_PASSWORD || req.headers['x-admin-password'] !== process.env.ADMIN_PASSWORD)) return json(res, 401, { error: 'Admin sign-in required.' });
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    if (req.method === 'POST') {
      let created = 0, updated = 0;
      for (const sponsor of communitySponsors) {
        const details = {
          wing: sponsor.wing,
          flat_no: sponsor.flatNo,
          sponsorship_area: sponsor.sponsorshipArea,
          sponsorship_type: 'In-kind',
          contribution_amount: '',
          contribution_details: sponsor.support,
          organization_name: sponsor.name,
          logo_url: sponsor.logo,
          public_showcase_permission: 'yes'
        };
        const { data: matches, error: readError } = await supabase.from('registrations').select('id, apartment, details').eq('type', 'Sponsor').ilike('name', sponsor.name);
        if (readError) return json(res, 500, { error: `Could not check existing sponsor records: ${readError.message}` });
        const record = (matches || []).find(row => row.apartment === sponsor.area || (row.details?.wing === sponsor.wing && String(row.details?.flat_no) === sponsor.flatNo));
        if (record) {
          const { error } = await supabase.from('registrations').update({ apartment: sponsor.area, details: { ...(record.details || {}), ...details } }).eq('id', record.id);
          if (error) return json(res, 500, { error: `Could not update sponsor record: ${error.message}` });
          updated++;
        } else {
          const { error } = await supabase.from('registrations').insert({ type: 'Sponsor', name: sponsor.name, phone: '', email: '', apartment: sponsor.area, details, payment_status: 'Pending', payment_reference: '' });
          if (error) return json(res, 500, { error: `Could not create sponsor record: ${error.message}. Apply the Sponsor registration database migration if the Sponsor record type is not enabled.` });
          created++;
        }
      }
      return json(res, 200, { ok: true, created, updated });
    }
    const { data, error } = await supabase.from('registrations').select('name, details').eq('type', 'Sponsor').order('created_at', { ascending: true });
    if (error) return json(res, 200, { sponsors: communitySponsors });
    const registeredSponsors = (data || []).filter(row => row.details?.public_showcase_permission === 'yes').map(row => {
      const details = row.details || {};
      const logo = typeof details.logo_url === 'string' && /^https:\/\//i.test(details.logo_url) ? details.logo_url : '';
      const support = details.sponsorship_type === 'In-kind'
        ? details.contribution_details || details.sponsorship_area
        : `${details.sponsorship_area || 'Match-day support'} · Cash sponsorship`;
      return { name: String(details.organization_name || row.name).trim().slice(0, 120), logo, support: String(support || '').trim().slice(0, 300), area: String(details.sponsorship_area || '').slice(0, 80), type: details.sponsorship_type === 'In-kind' ? 'In-kind' : 'Cash' };
    }).filter(sponsor => sponsor.name);
    const communityNames = new Set(communitySponsors.map(sponsor => sponsor.name.toLowerCase()));
    const sponsors = [...communitySponsors, ...registeredSponsors.filter(sponsor => !communityNames.has(sponsor.name.toLowerCase()))];
    return json(res, 200, { sponsors });
  } catch {
    return json(res, 200, { sponsors: communitySponsors });
  }
}
