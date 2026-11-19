import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE = 'gnpl_auction_admin';
const SESSION_SECONDS = 8 * 60 * 60;
const json = (res, status, body) => res.status(status).setHeader('Cache-Control', 'no-store').json(body);
const signature = (expires, secret) => createHmac('sha256', secret).update(`auction-admin:${expires}`).digest('hex');

function readCookie(req) {
  const entry = String(req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith(`${COOKIE}=`));
  return entry ? decodeURIComponent(entry.slice(COOKIE.length + 1)) : '';
}

export function sessionIsValid(req, secret = process.env.ADMIN_PASSWORD) {
  if (!secret) return false;
  const [expiresText, supplied = ''] = readCookie(req).split('.');
  const expires = Number(expiresText);
  if (!Number.isSafeInteger(expires) || expires <= Date.now()) return false;
  const expected = signature(expires, secret);
  const suppliedBuffer = Buffer.from(supplied, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  return suppliedBuffer.length === expectedBuffer.length && timingSafeEqual(suppliedBuffer, expectedBuffer);
}

export default function handler(req, res) {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) return json(res, 503, { error: 'Admin access is not configured.' });

  if (req.method === 'GET') return json(res, sessionIsValid(req, secret) ? 200 : 401, { authenticated: sessionIsValid(req, secret) });

  if (req.method === 'DELETE') {
    const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
    res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`);
    return json(res, 200, { authenticated: false });
  }

  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });
  const supplied = typeof req.body?.password === 'string' ? req.body.password : '';
  const expectedHash = createHash('sha256').update(secret).digest();
  const suppliedHash = createHash('sha256').update(supplied).digest();
  if (!timingSafeEqual(suppliedHash, expectedHash)) return json(res, 401, { error: 'Admin sign-in required.' });

  const expires = Date.now() + SESSION_SECONDS * 1000;
  const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${expires}.${signature(expires, secret)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${secure}`);
  return json(res, 200, { authenticated: true });
}
