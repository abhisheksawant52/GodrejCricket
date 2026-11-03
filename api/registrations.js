import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const db = () => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const boundedFetch = (input, init = {}) => fetch(input, { ...init, signal: AbortSignal.timeout(7000) });
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }, global: { fetch: boundedFetch }
  });
};
const json = (res, status, body) => res.status(status).setHeader('Cache-Control', 'no-store').json(body);
const clean = (s, max = 160) => typeof s === 'string' ? s.trim().slice(0, max) : '';
const PLAYER_PHOTO_BUCKET = 'player-photos';

async function uploadPlayerPhoto(supabase, dataUrl, id) {
  const match = /^data:image\/jpeg;base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) throw new Error('Player photo must be a compressed JPG image.');
  const bucket = supabase.storage.from(PLAYER_PHOTO_BUCKET);
  const { data: existingBucket, error: bucketError } = await supabase.storage.getBucket(PLAYER_PHOTO_BUCKET);
  if (!existingBucket && (bucketError?.statusCode === '404' || /not found|does not exist/i.test(bucketError?.message || ''))) {
    const { error: createError } = await supabase.storage.createBucket(PLAYER_PHOTO_BUCKET, {
      public: true, fileSizeLimit: 1500000, allowedMimeTypes: ['image/jpeg']
    });
    if (createError && !/already exists/i.test(createError.message || '')) throw createError;
  } else if (bucketError) {
    throw bucketError;
  }
  const path = `${id}.jpg`;
  const { error: uploadError } = await bucket.upload(path, Buffer.from(match[1], 'base64'), {
    contentType: 'image/jpeg', upsert: true, cacheControl: '31536000'
  });
  if (uploadError) throw uploadError;
  return bucket.getPublicUrl(path).data.publicUrl;
}

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
    if (!['Player', 'Owner', 'Audience'].includes(type) || !name || !phone) return json(res, 400, { error: 'Please complete the required fields.' });
    if (!wing || !flatNo) return json(res, 400, { error: 'Please enter your wing and flat number.' });
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(paymentTime)) return json(res, 400, { error: 'Choose a valid payment time using the time picker.' });
    const details = body.details && typeof body.details === 'object' && !Array.isArray(body.details) ? body.details : {};
    if (type === 'Audience' && !['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].includes(clean(details['t-shirt_size'], 10))) return json(res, 400, { error: 'Choose a valid audience T-shirt size.' });
    if (type === 'Audience' && (!clean(details['t-shirt_name'], 30) || !/^\d{1,3}$/.test(clean(details['t-shirt_number'], 3)))) return json(res, 400, { error: 'Enter the T-shirt name and a number from 0 to 999.' });
    if (type === 'Player') {
      const age = Number(details.age);
      const category = clean(details.player_category, 20);
      const eligible = Number.isInteger(age) && (category === 'Kids' ? age >= 8 && age <= 15 : ['Men', 'Women'].includes(category) && age >= 16);
      if (!eligible) return json(res, 400, { error: category === 'Kids' ? 'Kids category is for ages 8–15.' : 'Men and Women categories are for ages 16+.' });
    }
    if (type === 'Player' && !details.photo) return json(res, 400, { error: 'A player photo is required to complete player registration.' });
    if (details.photo && (typeof details.photo !== 'string' || !/^data:image\/jpeg;base64,/.test(details.photo) || details.photo.length > 1800000)) return json(res, 400, { error: 'Player photo is too large. Please choose a smaller image and try again.' });
    const startedAt = Date.now();
    const id = randomUUID();
    console.info('[registrations] request accepted', { type, photoBytes: details.photo ? Buffer.byteLength(details.photo) : 0 });
    let result;
    if (type === 'Player') {
      try {
        details.photo = await uploadPlayerPhoto(supabase, details.photo, id);
        console.info('[registrations] player photo stored', { id });
      } catch (cause) {
        console.error('[registrations] photo upload failed', { name: cause?.name, message: cause?.message, durationMs: Date.now() - startedAt });
        return json(res, 502, { error: 'Could not upload the player photo. Please retry in a moment.' });
      }
    }
    try {
      result = await supabase.from('registrations').insert({
        id, type, name, phone, email, apartment: `${wing} / ${flatNo}`,
        details: { ...details, wing, flat_no: flatNo, payment_time: paymentTime },
        payment_reference: paymentReference, payment_status: 'Pending'
      }).select('id, created_at').single();
    } catch (cause) {
      console.error('[registrations] save request threw', { name: cause?.name, message: cause?.message, durationMs: Date.now() - startedAt });
      return json(res, 502, { error: 'The registration database did not respond. Please retry in a moment.' });
    }
    const { data, error } = result;
    if (error) {
      console.error('[registrations] Supabase insert failed', JSON.stringify({ code: error.code, message: error.message, durationMs: Date.now() - startedAt }));
      if (type === 'Player') void supabase.storage.from(PLAYER_PHOTO_BUCKET).remove([`${id}.jpg`]).catch(() => {});
      return json(res, 500, { error: `Could not save registration${error.code ? ` (${error.code})` : ''}: ${error.message || 'database insert failed'}` });
    }
    console.info('[registrations] insert completed', { type, durationMs: Date.now() - startedAt });
    return json(res, 201, { ok: true, ...data });
  }

  if (!process.env.ADMIN_PASSWORD || req.headers['x-admin-password'] !== process.env.ADMIN_PASSWORD) return json(res, 401, { error: 'Admin sign-in required.' });
  if (req.method === 'GET') {
    console.info('[admin] registrations fetch started');
    const { data, error } = await supabase.from('registrations').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('[admin] registrations fetch failed', { code: error.code || 'unknown' });
      return json(res, 500, { error: 'Could not load registrations.' });
    }
    console.info('[admin] registrations fetch completed', { count: data?.length || 0 });
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
    const { id, payment_status, team_name, captain_id, captain_team, jersey_issued, player_profile, edit_registration } = req.body || {};
    if (typeof captain_id === 'undefined' && (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) return json(res, 400, { error: 'Invalid registration ID.' });
    if (typeof jersey_issued !== 'undefined') {
      if (typeof jersey_issued !== 'boolean') return json(res, 400, { error: 'Jersey status must be true or false.' });
      const { data: registration, error: readError } = await supabase.from('registrations').select('type, details').eq('id', id).maybeSingle();
      if (readError) return json(res, 500, { error: 'Could not load the player registration.' });
      if (!registration || !['Player', 'Owner', 'Audience'].includes(registration.type)) return json(res, 404, { error: 'Jersey registration was not found.' });
      const details = { ...(registration.details && typeof registration.details === 'object' && !Array.isArray(registration.details) ? registration.details : {}), jersey_issued, jersey_issued_at: jersey_issued ? new Date().toISOString() : null };
      const { error } = await supabase.from('registrations').update({ details }).eq('id', id);
      if (error) return json(res, 500, { error: 'Could not update jersey distribution.' });
      return json(res, 200, { ok: true });
    }
    if (typeof captain_id !== 'undefined') {
      const allowedTeams = ['Nest United', 'The Strikers', 'Boundary Breakers', 'Wicket Warriors', 'Pitch Panthers', 'Rising Royals', 'Power Hitters', 'Crease Kings'];
      if (typeof captain_team !== 'string' || !allowedTeams.includes(captain_team) || typeof captain_id !== 'string') return json(res, 400, { error: 'Choose a valid team and captain.' });
      const { data: players, error: readError } = await supabase.from('registrations').select('id, details').eq('type', 'Player');
      if (readError) return json(res, 500, { error: 'Could not load team players.' });
      if (captain_id && !players.some(player => player.id === captain_id && player.details?.team_name === captain_team)) return json(res, 400, { error: 'The captain must be assigned to this team first.' });
      for (const player of players) {
        if (player.details?.team_name !== captain_team) continue;
        const isCaptain = Boolean(captain_id && player.id === captain_id);
        if (Boolean(player.details?.is_team_captain) === isCaptain) continue;
        const details = { ...(player.details && typeof player.details === 'object' && !Array.isArray(player.details) ? player.details : {}), is_team_captain: isCaptain };
        const { error } = await supabase.from('registrations').update({ details }).eq('id', player.id);
        if (error) return json(res, 500, { error: 'Could not save the team captain.' });
      }
      return json(res, 200, { ok: true });
    }
    const updates = {};
    if (typeof edit_registration !== 'undefined') {
      if (!edit_registration || typeof edit_registration !== 'object' || Array.isArray(edit_registration)) return json(res, 400, { error: 'Invalid registration update.' });
      const { data: registration, error: readError } = await supabase.from('registrations').select('type, details').eq('id', id).maybeSingle();
      if (readError) return json(res, 500, { error: 'Could not load the registration.' });
      if (!registration) return json(res, 404, { error: 'Registration was not found.' });
      const name = clean(edit_registration.name);
      const phone = clean(edit_registration.phone, 24);
      if (!name || !phone) return json(res, 400, { error: 'Name and mobile number are required.' });
      if (!['Paid', 'Pending'].includes(edit_registration.payment_status)) return json(res, 400, { error: 'Choose a valid payment status.' });
      const incomingDetails = edit_registration.details;
      if (!incomingDetails || typeof incomingDetails !== 'object' || Array.isArray(incomingDetails)) return json(res, 400, { error: 'Invalid registration details.' });
      const details = {};
      for (const [key, value] of Object.entries(incomingDetails)) {
        if (!/^[a-z0-9_-]{1,60}$/i.test(key) || typeof value !== 'string') return json(res, 400, { error: 'Registration details must be text fields.' });
        details[key] = clean(value, key === 'photo' ? 1200 : 2000);
      }
      updates.name = name;
      updates.phone = phone;
      updates.email = clean(edit_registration.email, 160);
      updates.payment_reference = clean(edit_registration.payment_reference, 120);
      updates.payment_status = edit_registration.payment_status;
      updates.apartment = `${clean(details.wing, 60)} / ${clean(details.flat_no, 60)}`;
      updates.details = { ...(registration.details && typeof registration.details === 'object' && !Array.isArray(registration.details) ? registration.details : {}), ...details };
    }
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
      const oldDetails = registration.details && typeof registration.details === 'object' && !Array.isArray(registration.details) ? registration.details : {};
      const details = { ...oldDetails, team_name: team_name || null };
      if (oldDetails.is_team_captain && team_name !== oldDetails.team_name) details.is_team_captain = false;
      updates.details = details;
    }
    if (typeof player_profile !== 'undefined') {
      if (!player_profile || typeof player_profile !== 'object' || Array.isArray(player_profile)) return json(res, 400, { error: 'Invalid player details.' });
      const allowed = ['photo', 'player_number', 'player_address', 'age', 'player_category', 'playing_role', 'experience', 'batting', 'bowling', 'matches', 'runs', 'wickets', 'team_name'];
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
