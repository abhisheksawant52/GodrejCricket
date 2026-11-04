import { createClient } from '@supabase/supabase-js';

const json = (res, status, body) => res.status(status).setHeader('Cache-Control', 'no-store').json(body);

export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return json(res, 503, { error: 'Player list is not available yet.' });
  if (req.method === 'POST') {
    const { id, phone, photo } = req.body || {};
    if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return json(res, 400, { error: 'Invalid player registration.' });
    if (typeof phone !== 'string' || !phone.trim() || typeof photo !== 'string' || !/^data:image\/jpeg;base64,/.test(photo) || photo.length > 1800000) return json(res, 400, { error: 'Enter your registered phone number and choose a valid image.' });
    try {
      const supabase = createClient(url, key, { auth: { persistSession: false } });
      const { data: player, error: readError } = await supabase.from('registrations').select('phone, details, type').eq('id', id).maybeSingle();
      if (readError) return json(res, 500, { error: 'Could not verify this player registration.' });
      if (!player || player.type !== 'Player' || player.phone.replace(/\D/g, '').slice(-10) !== phone.replace(/\D/g, '').slice(-10)) return json(res, 403, { error: 'That phone number does not match this player registration.' });
      const details = player.details && typeof player.details === 'object' && !Array.isArray(player.details) ? player.details : {};
      const match = /^data:image\/jpeg;base64,([\s\S]+)$/.exec(photo);
      const bucketName = 'player-photos';
      const { data: existingBucket, error: bucketError } = await supabase.storage.getBucket(bucketName);
      if (!existingBucket && (bucketError?.statusCode === '404' || /not found|does not exist/i.test(bucketError?.message || ''))) {
        const { error: createError } = await supabase.storage.createBucket(bucketName, { public: true, fileSizeLimit: 1500000, allowedMimeTypes: ['image/jpeg'] });
        if (createError && !/already exists/i.test(createError.message || '')) return json(res, 502, { error: 'Could not prepare player photo storage.' });
      } else if (bucketError) return json(res, 502, { error: 'Could not access player photo storage.' });
      const bucket = supabase.storage.from(bucketName);
      const path = `${id}.jpg`;
      const { error: uploadError } = await bucket.upload(path, Buffer.from(match[1], 'base64'), { contentType: 'image/jpeg', upsert: true, cacheControl: '31536000' });
      if (uploadError) return json(res, 502, { error: 'Could not upload the player photo.' });
      const photoUrl = `${bucket.getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
      const { error } = await supabase.from('registrations').update({ details: { ...details, photo: photoUrl } }).eq('id', id);
      if (error) return json(res, 500, { error: 'Could not save the player photo.' });
      return json(res, 200, { ok: true });
    } catch { return json(res, 500, { error: 'Could not save the player photo.' }); }
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { error: 'Method not allowed.' });
  }

  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await supabase.from('registrations')
      .select('id, name, details, payment_status')
      .eq('type', 'Player')
      .order('created_at', { ascending: true });
    if (error) return json(res, 500, { error: 'Could not load the player list.' });
    return json(res, 200, { players: (data || []).map(player => ({
      id: player.id,
      name: player.name,
      role: player.details?.playing_role || null,
      team_name: player.details?.team_name || null,
      is_team_captain: Boolean(player.details?.is_team_captain),
      photo: player.details?.photo || null,
      payment_status: player.payment_status === 'Paid' ? 'Paid' : 'Pending'
    })) });
  } catch {
    return json(res, 500, { error: 'Could not load the player list.' });
  }
}
