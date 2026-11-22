import { createClient } from '@supabase/supabase-js';

const response = (res, status, body) => res.status(status).setHeader('Cache-Control', 'no-store').json(body);
const db = () => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
};

export default async function handler(req, res) {
  const supabase = db();
  if (!supabase) return response(res, 503, { error: 'Content database is not configured.' });
  if (req.method === 'GET') {
    const { data, error } = await supabase.from('site_content').select('schedule, announcements, updated_at').eq('id', 'public').maybeSingle();
    if (error) return response(res, 500, { error: 'Could not load league updates.' });
    return response(res, 200, { schedule: data?.schedule || [], announcements: data?.announcements || [], updated_at: data?.updated_at || null });
  }
  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'GET, PUT');
    return response(res, 405, { error: 'Method not allowed.' });
  }
  if (!process.env.ADMIN_PASSWORD || req.headers['x-admin-password'] !== process.env.ADMIN_PASSWORD) return response(res, 401, { error: 'Admin sign-in required.' });
  const { schedule, announcements } = req.body || {};
  if (!Array.isArray(schedule) || !Array.isArray(announcements) || schedule.length > 100 || announcements.length > 100) return response(res, 400, { error: 'Provide valid schedule and announcements lists.' });
  const cleanText = (v, max) => typeof v === 'string' ? v.trim().slice(0, max) : '';
  const safeSchedule = schedule.map(item => ({ id: cleanText(item?.id, 60), date: cleanText(item?.date, 30), time: cleanText(item?.time, 30), home: cleanText(item?.home, 100), away: cleanText(item?.away, 100), venue: cleanText(item?.venue, 160), status: ['Upcoming', 'Completed'].includes(item?.status) ? item.status : 'Upcoming', homeScore: cleanText(item?.homeScore, 30), awayScore: cleanText(item?.awayScore, 30), winner: cleanText(item?.winner, 100), result: cleanText(item?.result, 240) }));
  if (safeSchedule.some(item => !item.id || !item.date || !item.home || !item.away)) return response(res, 400, { error: 'Each fixture needs a date, home team, and away team.' });
  const safeAnnouncements = announcements.map(item => ({ id: cleanText(item?.id, 60), title: cleanText(item?.title, 120), message: cleanText(item?.message, 1200), date: cleanText(item?.date, 30), active: item?.active !== false })).filter(item => item.id && item.title && item.message);
  const { data, error } = await supabase.from('site_content').upsert({ id: 'public', schedule: safeSchedule, announcements: safeAnnouncements, updated_at: new Date().toISOString() }).select('schedule, announcements, updated_at').single();
  if (error) return response(res, 500, { error: 'Could not save league updates. Apply the site_content database migration first.' });
  return response(res, 200, data);
}
