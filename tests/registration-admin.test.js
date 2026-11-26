import test from 'node:test';
import assert from 'node:assert/strict';
import { createRegistrationHandler } from '../api/registrations.js';
import { isAdminAuthorized, isPlayerRegistrationOpen, PLAYER_REGISTRATION_CUTOFF } from '../src/registrationPolicy.js';

const makeResponse = () => ({
  statusCode: 200,
  headers: {},
  status(code) { this.statusCode = code; return this; },
  setHeader(name, value) { this.headers[name] = value; return this; },
  json(body) { this.body = body; return this; },
});

function makeDatabase(initialPlayerSetting = null) {
  const state = { playerSetting: initialPlayerSetting, insertedRegistration: null };
  const client = {
    from(table) {
      const query = {
        payload: null,
        select() { return this; },
        eq() { return this; },
        maybeSingle: async () => table === 'site_content'
          ? { data: state.playerSetting === null ? null : { player_registration_open: state.playerSetting }, error: null }
          : { data: null, error: null },
        upsert(payload) { this.payload = payload; state.playerSetting = payload.player_registration_open; return this; },
        insert(payload) { this.payload = payload; state.insertedRegistration = payload; return this; },
        single: async function () { return table === 'site_content'
          ? { data: { player_registration_open: this.payload.player_registration_open }, error: null }
          : { data: { id: this.payload.id, created_at: '2026-11-26T12:00:00.000Z' }, error: null }; },
      };
      return query;
    },
    storage: {
      getBucket: async () => ({ data: { name: 'player-photos' }, error: null }),
      from: () => ({
        upload: async () => ({ error: null }),
        getPublicUrl: () => ({ data: { publicUrl: 'https://storage.example/player.jpg' } }),
      }),
    },
  };
  return { state, client };
}

const makeHandler = (client, now = () => PLAYER_REGISTRATION_CUTOFF + 60_000) => createRegistrationHandler({
  env: { SUPABASE_URL: 'https://database.example', SUPABASE_SERVICE_ROLE_KEY: 'test-service-key', ADMIN_PASSWORD: 'test-admin-password' },
  now,
  makeClient: () => client,
});

const playerRequest = () => ({
  method: 'POST',
  headers: {},
  body: {
    type: 'Player', name: 'Test Player', phone: '9999999999', wing: 'A', flat_no: '1201', payment_time: '10:30',
    details: { age: 25, player_category: 'Women', experience: '2', photo: 'data:image/jpeg;base64,YQ==' },
  },
});

test('public player registration succeeds when Admin has opened it', async () => {
  const { client, state } = makeDatabase(true);
  const res = makeResponse();
  await makeHandler(client)(playerRequest(), res);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.ok, true);
  assert.equal(state.insertedRegistration.type, 'Player');
  assert.equal(state.insertedRegistration.details.photo, 'https://storage.example/player.jpg');
});

test('public player registration is rejected when Admin has closed it', async () => {
  const { client, state } = makeDatabase(false);
  const res = makeResponse();
  await makeHandler(client)(playerRequest(), res);
  assert.equal(res.statusCode, 403);
  assert.match(res.body.error, /closed/i);
  assert.equal(state.insertedRegistration, null);
});

test('Admin can save the open setting; requests without the Admin password are rejected', async () => {
  const { client, state } = makeDatabase(false);
  const handler = makeHandler(client);
  const forbidden = makeResponse();
  await handler({ method: 'PATCH', headers: {}, body: { player_registration_open: true } }, forbidden);
  assert.equal(forbidden.statusCode, 401);
  assert.equal(state.playerSetting, false);

  const saved = makeResponse();
  await handler({ method: 'PATCH', headers: { 'x-admin-password': 'test-admin-password' }, body: { player_registration_open: true } }, saved);
  assert.equal(saved.statusCode, 200);
  assert.deepEqual(saved.body, { player_registration_open: true });
  assert.equal(state.playerSetting, true);
});

test('registration cutoff uses the Admin override when present and the date default otherwise', () => {
  assert.equal(isPlayerRegistrationOpen(true, PLAYER_REGISTRATION_CUTOFF + 1), true);
  assert.equal(isPlayerRegistrationOpen(false, PLAYER_REGISTRATION_CUTOFF - 1), false);
  assert.equal(isPlayerRegistrationOpen(null, PLAYER_REGISTRATION_CUTOFF - 1), true);
  assert.equal(isPlayerRegistrationOpen(null, PLAYER_REGISTRATION_CUTOFF), false);
});

test('Admin password policy rejects missing configuration and incorrect passwords', () => {
  assert.equal(isAdminAuthorized('', 'test-admin-password'), false);
  assert.equal(isAdminAuthorized('test-admin-password', ''), false);
  assert.equal(isAdminAuthorized('test-admin-password', 'wrong-password'), false);
  assert.equal(isAdminAuthorized('test-admin-password', 'test-admin-password'), true);
});
