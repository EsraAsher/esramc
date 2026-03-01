import crypto from 'crypto';

const MAX_DRIFT_MS = 5 * 60 * 1000;
const replayCache = new Map();

function pruneReplayCache(now) {
  for (const [key, expiresAt] of replayCache.entries()) {
    if (expiresAt <= now) replayCache.delete(key);
  }
}

function getRawBody(req) {
  if (typeof req.rawBody === 'string') return req.rawBody;
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
    return JSON.stringify(req.body);
  }
  return '';
}

export function safeCompare(valueA, valueB) {
  const a = String(valueA || '');
  const b = String(valueB || '');
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function validateHmacRequest(req, secret) {
  const signature = req.headers['x-signature'];
  const timestampHeader = req.headers['x-timestamp'];

  if (!signature) {
    return { present: false, ok: false };
  }

  if (!timestampHeader) {
    return { present: true, ok: false, reason: 'missing_timestamp' };
  }

  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp)) {
    return { present: true, ok: false, reason: 'invalid_timestamp' };
  }

  const now = Date.now();
  if (Math.abs(now - timestamp) > MAX_DRIFT_MS) {
    return { present: true, ok: false, reason: 'timestamp_drift' };
  }

  pruneReplayCache(now);

  const replayKey = `${signature}:${timestamp}`;
  if (replayCache.has(replayKey)) {
    return { present: true, ok: false, reason: 'replay' };
  }

  const rawBody = getRawBody(req);
  const payload = `${req.method}\n${req.originalUrl}\n${timestamp}\n${rawBody}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  if (!safeCompare(signature, expectedSignature)) {
    return { present: true, ok: false, reason: 'invalid_signature' };
  }

  replayCache.set(replayKey, now + MAX_DRIFT_MS);
  return { present: true, ok: true };
}
