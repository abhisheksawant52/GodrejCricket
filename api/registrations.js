import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { isAdminAuthorized, isPlayerRegistrationOpen, PLAYER_REGISTRATION_CUTOFF } from '../src/registrationPolicy.js';

const db = (env, makeClient) => {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const boundedFetch = (input, init = {}) => fetch(input, { ...init, signal: AbortSignal.timeout(7000) });
  return makeClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }, global: { fetch: boundedFetch }
  });
};
const json = (res, status, body) => res.status(status).setHeader('Cache-Control', 'no-store').json(body);
const clean = (s, max = 160) => typeof s === 'string' ? s.trim().slice(0, max) : '';
const PLAYER_PHOTO_BUCKET = 'player-photos';
const VALID_TEAM_NAMES = ['Prudentech Power Panthers', 'Prudentech Power Leopards', 'Preetam Paltan', 'Prisha Smash Queens', 'Bigtrip Royal Lions', 'Ashish Knight Riders', 'Titan Thunder', 'Black Thunder', 'Nest Warriors', 'Nest Sanskriti'];

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

export function createRegistrationHandler({ env = process.env, now = () => Date.now(), makeClient = createClient } = {}) {
  return async function handler(req, res) {
  const supabase = db(env, makeClient);
  if (!supabase) return json(res, 503, { error: 'Registration database is not configured yet.' });

  if (req.method === 'POST') {
    const body = req.body || {};
    const type = clean(body.type, 20);
    const isAdmin = isAdminAuthorized(env.ADMIN_PASSWORD, req.headers['x-admin-password']);
    if (!isAdmin && ['Player', 'Audience', 'Sponsor'].includes(type) && now() >= PLAYER_REGISTRATION_CUTOFF) return json(res, 403, { error: 'Public registration forms are closed.' });
    if (!isAdmin && type === 'Owner') return json(res, 403, { error: 'Team owner registration is closed.' });
    if (!isAdmin && type === 'Player') {
      const { data: settings, error: settingsError } = await supabase.from('site_content').select('player_registration_open').eq('id', 'public').maybeSingle();
      if (settingsError) return json(res, 500, { error: 'Could not check player registration status.' });
      if (!isPlayerRegistrationOpen(settings?.player_registration_open, now())) return json(res, 403, { error: 'Player registration is closed.' });
    }
    if (!isAdmin && type === 'Sponsor' && now() < PLAYER_REGISTRATION_CUTOFF) return json(res, 403, { error: 'Sponsorship registration opens after player registration closes.' });
    if (!isAdmin && type === 'Audience' && now() >= Date.parse('2026-12-13T00:00:00+05:30')) return json(res, 403, { error: 'The two-hour T-shirt order window has closed.' });
    if (isAdmin && ['Player', 'Owner'].includes(type)) {
      const name = clean(body.name), phone = clean(body.phone, 24);
      const wing = clean(body.wing, 60), flatNo = clean(body.flat_no, 60);
      const details = body.details && typeof body.details === 'object' && !Array.isArray(body.details) ? body.details : {};
      if (!name || !phone || !wing || !flatNo) return json(res, 400, { error: 'Name, phone, wing, and flat number are required.' });
      if (type === 'Player' && (!Number.isInteger(Number(details.age)) || !['Men','Women','Kids'].includes(details.player_category))) return json(res, 400, { error: 'Enter a valid player age and category.' });
      const id = randomUUID();
      const { data, error } = await supabase.from('registrations').insert({ id, type, name, phone, email: '', apartment: `${wing} / ${flatNo}`, details: { ...details, wing, flat_no: flatNo }, payment_reference: '', payment_status: 'Pending' }).select('id, created_at').single();
      if (error) return json(res, 500, { error: 'Could not save registration.' });
      return json(res, 201, { ok: true, ...data });
    }
    const name = clean(body.name);
    const phone = clean(body.phone, 24);
    const email = '';
    const wing = clean(body.wing, 60);
    const flatNo = clean(body.flat_no, 60);
    const paymentReference = clean(body.payment_reference, 120);
    const paymentTime = clean(body.payment_time, 40);
    if (!['Player', 'Owner', 'Audience', 'Sponsor'].includes(type) || !name || !phone) return json(res, 400, { error: 'Please complete the required fields.' });
    if (type !== 'Sponsor' && (!wing || !flatNo)) return json(res, 400, { error: 'Please enter your wing and flat number.' });
    const details = body.details && typeof body.details === 'object' && !Array.isArray(body.details) ? body.details : {};
    if (type !== 'Sponsor' && !(isAdmin && type === 'Audience') && !/^([01]\d|2[0-3]):[0-5]\d$/.test(paymentTime)) return json(res, 400, { error: 'Choose a valid payment time using the time picker.' });
    if (type === 'Sponsor') {
      const area = clean(details.sponsorship_area, 40);
      const kind = clean(details.sponsorship_type, 10);
      const amountText = clean(details.contribution_amount, 12);
      const amount = Number(amountText);
      const contributionDetails = clean(details.contribution_details, 300);
      if (!['Snacks & refreshments', 'Cricket equipment', 'First aid & safety', 'Ground & match setup', 'Player support', 'Other'].includes(area)) return json(res, 400, { error: 'Choose a valid sponsorship area.' });
      if (!['Cash', 'In-kind'].includes(kind)) return json(res, 400, { error: 'Choose cash or in-kind sponsorship.' });
      if (kind === 'Cash' && (!/^\d+(\.\d{1,2})?$/.test(amountText) || !Number.isFinite(amount) || amount <= 0)) return json(res, 400, { error: 'Enter a valid contribution amount greater than zero.' });
      if (kind === 'Cash' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(paymentTime)) return json(res, 400, { error: 'Enter the payment time for your cash sponsorship.' });
      if (kind === 'In-kind' && !contributionDetails) return json(res, 400, { error: 'Describe the items or support you would like to contribute.' });
      details.sponsorship_area = area;
      details.sponsorship_type = kind;
      details.contribution_amount = kind === 'Cash' ? amountText : '';
      details.contribution_details = contributionDetails;
    }
    if (type === 'Audience') {
      details.team_name = clean(details.team_name, 80);
      details['t-shirt_size'] = clean(details['t-shirt_size'], 10);
      details['t-shirt_name'] = clean(details['t-shirt_name'], 30);
      details['t-shirt_number'] = clean(details['t-shirt_number'], 3);
    }
    if (type === 'Audience' && !VALID_TEAM_NAMES.includes(clean(details.team_name, 80))) return json(res, 400, { error: 'Choose a valid team for your T-shirt order.' });
    if (type === 'Audience' && !['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].includes(clean(details['t-shirt_size'], 10))) return json(res, 400, { error: 'Choose a valid audience T-shirt size.' });
    if (type === 'Audience' && (!clean(details['t-shirt_name'], 30) || !/^\d{1,3}$/.test(clean(details['t-shirt_number'], 3)))) return json(res, 400, { error: 'Enter the T-shirt name and a number from 0 to 999.' });
    if (type === 'Player') {
      const age = Number(details.age);
      const category = clean(details.player_category, 20);
      details.team_name = clean(details.team_name, 80);
      if (!VALID_TEAM_NAMES.includes(details.team_name)) return json(res, 400, { error: 'Choose a team assignment before registering.' });
      if (!Number.isInteger(age) || age < 8 || age > 120) return json(res, 400, { error: 'Age must be a whole number from 8 to 120.' });
      const eligible = category === 'Kids' ? age <= 15 : ['Men', 'Women'].includes(category) && age >= 16;
      if (!eligible) return json(res, 400, { error: category === 'Kids' ? 'Kids category is for ages 8–15.' : category === 'Women' ? 'Women players must be 16 or older.' : 'Men category is for ages 16–120.' });
      const experienceText = clean(details.experience, 10);
      const experience = Number(experienceText);
      if (!/^\d+$/.test(experienceText) || !Number.isInteger(experience) || experience > 80 || experience > age) return json(res, 400, { error: 'Enter cricket experience as whole years from 0 to 80, no more than the player’s age.' });
    }
    if (type === 'Player' && !details.photo) return json(res, 400, { error: 'A player photo is required to complete player registration.' });
    if (details.photo && (typeof details.photo !== 'string' || !/^data:image\/jpeg;base64,/.test(details.photo) || details.photo.length > 1800000)) return json(res, 400, { error: 'Player photo is too large. Please choose a smaller image and try again.' });
    const startedAt = now();
    const id = randomUUID();
    console.info('[registrations] request accepted', { type, photoBytes: details.photo ? Buffer.byteLength(details.photo) : 0 });
    let result;
    if (type === 'Player') {
      try {
        details.photo = await uploadPlayerPhoto(supabase, details.photo, id);
        console.info('[registrations] player photo stored', { id });
      } catch (cause) {
        console.error('[registrations] photo upload failed', { name: cause?.name, message: cause?.message, durationMs: now() - startedAt });
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
      console.error('[registrations] save request threw', { name: cause?.name, message: cause?.message, durationMs: now() - startedAt });
      return json(res, 502, { error: 'The registration database did not respond. Please retry in a moment.' });
    }
    const { data, error } = result;
    if (error) {
      console.error('[registrations] Supabase insert failed', JSON.stringify({ code: error.code, message: error.message, durationMs: now() - startedAt }));
      if (type === 'Player') void supabase.storage.from(PLAYER_PHOTO_BUCKET).remove([`${id}.jpg`]).catch(() => {});
      return json(res, 500, { error: `Could not save registration${error.code ? ` (${error.code})` : ''}: ${error.message || 'database insert failed'}` });
    }
    console.info('[registrations] insert completed', { type, durationMs: now() - startedAt });
    return json(res, 201, { ok: true, ...data });
  }

  if (!isAdminAuthorized(env.ADMIN_PASSWORD, req.headers['x-admin-password'])) return json(res, 401, { error: 'Admin sign-in required.' });
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
    console.info('[admin] registration delete started');
    if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return json(res, 400, { error: 'Invalid registration ID.' });
    }
    const { data, error } = await supabase.from('registrations').delete().eq('id', id).select('id').maybeSingle();
    if (error) {
      console.error('[admin] registration delete failed', { code: error.code || 'unknown' });
      return json(res, 500, { error: 'Could not delete registration.' });
    }
    if (!data) {
      console.warn('[admin] registration delete found no row');
      return json(res, 404, { error: 'Registration was not found.' });
    }
    console.info('[admin] registration delete completed');
    return json(res, 200, { ok: true });
  }
  if (req.method === 'PATCH') {
    const requestBody = req.body || {};
    if (typeof requestBody.player_registration_open === 'boolean') {
      const { data, error } = await supabase.from('site_content').upsert({ id: 'public', player_registration_open: requestBody.player_registration_open, updated_at: new Date().toISOString() }).select('player_registration_open').single();
      if (error) return json(res, 500, { error: 'Could not save player registration status. Apply the player registration setting migration first.' });
      return json(res, 200, { player_registration_open: data.player_registration_open });
    }
    const { id, ids, auction_import, payment_status, team_name, captain_id, captain_team, jersey_issued, duplicate_reviewed, auction_sold, player_grade, player_profile, edit_registration } = req.body || {};
    if (Array.isArray(auction_import)) {
      const allowedTeams = ['Prudentech Power Panthers', 'Prudentech Power Leopards', 'Preetam Paltan', 'Prisha Smash Queens', 'Bigtrip Royal Lions', 'Ashish Knight Riders', 'Titan Thunder', 'Black Thunder', 'Nest Warriors', 'Nest Sanskriti'];
      const validIds = values => values.every(value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
      if (auction_import.length < 1 || auction_import.length > 500 || !validIds(auction_import.map(item => item?.id)) || new Set(auction_import.map(item => item.id)).size !== auction_import.length) return json(res, 400, { error: 'Upload must contain 1 to 500 unique player records.' });
      if (auction_import.some(item => !['Sold', 'Available'].includes(item.status) || (item.team_name !== null && !allowedTeams.includes(item.team_name)) || !Number.isFinite(item.sold_price) || item.sold_price < 0 || !Number.isFinite(item.base_price) || item.base_price < 0 || !['A+', 'A', 'B', 'B+'].includes(item.player_grade))) return json(res, 400, { error: 'The auction file contains an invalid status, team, price, or grade.' });
      const { data: players, error: readError } = await supabase.from('registrations').select('id, type, details').in('id', auction_import.map(item => item.id));
      if (readError) return json(res, 500, { error: 'Could not verify the auction player records.' });
      if (!players || players.length !== auction_import.length || players.some(player => player.type !== 'Player')) return json(res, 400, { error: 'One or more uploaded players no longer match a player registration. Refresh the dashboard and retry.' });
      const byId = new Map(players.map(player => [player.id, player]));
      const savedAt = new Date().toISOString();
      const results = await Promise.all(auction_import.map(item => {
        const player = byId.get(item.id);
        const oldDetails = player.details && typeof player.details === 'object' && !Array.isArray(player.details) ? player.details : {};
        const sold = item.status === 'Sold';
        const details = {
          ...oldDetails,
          team_name: item.team_name,
          auction_sold: sold,
          auction_sold_at: sold ? (oldDetails.auction_sold ? oldDetails.auction_sold_at || savedAt : savedAt) : null,
          sold_price: sold ? item.sold_price : null,
          base_price: item.base_price,
          player_grade: item.player_grade,
          auction_lot: item.lot
        };
        return supabase.from('registrations').update({ details }).eq('id', item.id);
      }));
      const failed = results.filter(result => result.error);
      if (failed.length) return json(res, 500, { error: `Auction data was saved for ${results.length - failed.length} players; ${failed.length} updates failed. Refresh the dashboard before retrying.` });
      return json(res, 200, { ok: true, updated: auction_import.length });
    }
    if (Array.isArray(ids)) {
      if (!['Paid', 'Pending'].includes(payment_status) || ids.length < 1 || ids.length > 500 || ids.some(value => typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))) return json(res, 400, { error: 'Choose registrations and a valid payment status.' });
      const { error } = await supabase.from('registrations').update({ payment_status }).in('id', [...new Set(ids)]);
      if (error) return json(res, 500, { error: 'Could not update payment statuses.' });
      return json(res, 200, { ok: true });
    }
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
    if (typeof duplicate_reviewed !== 'undefined') {
      if (typeof duplicate_reviewed !== 'boolean') return json(res, 400, { error: 'Review status must be true or false.' });
      const { data: registration, error: readError } = await supabase.from('registrations').select('details').eq('id', id).maybeSingle();
      if (readError) return json(res, 500, { error: 'Could not load the registration.' });
      if (!registration) return json(res, 404, { error: 'Registration was not found.' });
      const details = { ...(registration.details && typeof registration.details === 'object' && !Array.isArray(registration.details) ? registration.details : {}), duplicate_reviewed };
      const { error } = await supabase.from('registrations').update({ details }).eq('id', id);
      if (error) return json(res, 500, { error: 'Could not save duplicate review status.' });
      return json(res, 200, { ok: true });
    }
    if (typeof auction_sold !== 'undefined') {
      if (typeof auction_sold !== 'boolean') return json(res, 400, { error: 'Auction status must be true or false.' });
      const { data: registration, error: readError } = await supabase.from('registrations').select('type, details').eq('id', id).maybeSingle();
      if (readError) return json(res, 500, { error: 'Could not load the player registration.' });
      if (!registration || registration.type !== 'Player') return json(res, 404, { error: 'Player registration was not found.' });
      const details = { ...(registration.details && typeof registration.details === 'object' && !Array.isArray(registration.details) ? registration.details : {}), auction_sold, auction_sold_at: auction_sold ? new Date().toISOString() : null };
      const { error } = await supabase.from('registrations').update({ details }).eq('id', id);
      if (error) return json(res, 500, { error: 'Could not update auction status.' });
      return json(res, 200, { ok: true });
    }
    if (typeof player_grade !== 'undefined') {
      if (!['', 'A', 'A+', 'B', 'B+'].includes(player_grade)) return json(res, 400, { error: 'Choose a valid player grade.' });
      const { data: registration, error: readError } = await supabase.from('registrations').select('type, details').eq('id', id).maybeSingle();
      if (readError) return json(res, 500, { error: 'Could not load the player registration.' });
      if (!registration || registration.type !== 'Player') return json(res, 404, { error: 'Player registration was not found.' });
      const details = { ...(registration.details && typeof registration.details === 'object' && !Array.isArray(registration.details) ? registration.details : {}), player_grade: player_grade || null };
      const { error } = await supabase.from('registrations').update({ details }).eq('id', id);
      if (error) return json(res, 500, { error: 'Could not update player grade.' });
      return json(res, 200, { ok: true });
    }
    if (typeof captain_id !== 'undefined') {
      const allowedTeams = ['Prudentech Power Panthers', 'Prudentech Power Leopards', 'Preetam Paltan', 'Prisha Smash Queens', 'Bigtrip Royal Lions', 'Ashish Knight Riders', 'Titan Thunder', 'Black Thunder', 'Nest Warriors', 'Nest Sanskriti'];
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
      if (typeof incomingDetails.photo === 'string' && incomingDetails.photo.startsWith('data:')) {
        if (registration.type !== 'Player' || !/^data:image\/jpeg;base64,/.test(incomingDetails.photo) || incomingDetails.photo.length > 1800000) return json(res, 400, { error: 'Choose a valid player photo under 1.3 MB.' });
        try { incomingDetails.photo = `${await uploadPlayerPhoto(supabase, incomingDetails.photo, id)}?v=${Date.now()}`; }
        catch { return json(res, 502, { error: 'Could not upload the player photo.' }); }
      }
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
      const allowedTeams = ['Prudentech Power Panthers', 'Prudentech Power Leopards', 'Preetam Paltan', 'Prisha Smash Queens', 'Bigtrip Royal Lions', 'Ashish Knight Riders', 'Titan Thunder', 'Black Thunder', 'Nest Warriors', 'Nest Sanskriti'];
      if (typeof team_name !== 'string' || (team_name !== '' && !allowedTeams.includes(team_name))) return json(res, 400, { error: 'Choose a valid team.' });
      const { data: registration, error: readError } = await supabase.from('registrations').select('type, details').eq('id', id).maybeSingle();
      if (readError) return json(res, 500, { error: 'Could not load the player registration.' });
      if (!registration) return json(res, 404, { error: 'Registration was not found.' });
      if (!['Player', 'Audience'].includes(registration.type)) return json(res, 400, { error: 'Only player or audience registrations can be assigned to a team.' });
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
      if (typeof profile.age !== 'undefined' || typeof profile.experience !== 'undefined') {
        const age = Number(profile.age ?? registration.details?.age);
        const experience = Number(profile.experience ?? registration.details?.experience);
        if (!Number.isInteger(age) || age < 8 || age > 120) return json(res, 400, { error: 'Age must be a whole number from 8 to 120.' });
        if (!Number.isInteger(experience) || experience < 0 || experience > 80 || experience > age) return json(res, 400, { error: 'Experience must be whole years from 0 to 80 and cannot exceed age.' });
      }
      if (typeof profile.photo !== 'undefined') {
        if (typeof profile.photo !== 'string') return json(res, 400, { error: 'Choose a valid player photo.' });
        if (profile.photo.startsWith('data:')) {
          if (!/^data:image\/jpeg;base64,/.test(profile.photo) || profile.photo.length > 1800000) return json(res, 400, { error: 'Player photo is too large or not a supported image.' });
          try { profile.photo = `${await uploadPlayerPhoto(supabase, profile.photo, id)}?v=${Date.now()}`; }
          catch { return json(res, 502, { error: 'Could not upload the higher-resolution player photo.' }); }
        } else if (!/^https:\/\//i.test(profile.photo)) {
          return json(res, 400, { error: 'Choose a valid player photo.' });
        }
      }
      updates.details = { ...(registration.details && typeof registration.details === 'object' && !Array.isArray(registration.details) ? registration.details : {}), ...profile };
    }
    if (!Object.keys(updates).length) return json(res, 400, { error: 'No supported registration update was provided.' });
    const { error } = await supabase.from('registrations').update(updates).eq('id', id);
    if (error) return json(res, 500, { error: 'Could not update registration.' });
    return json(res, 200, { ok: true });
  }
  res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
  return json(res, 405, { error: 'Method not allowed.' });
  };
}

export default createRegistrationHandler();
