function normalizeSecret(value) {
  return String(value || '').trim();
}

function isVercelCronRequest(req) {
  const cronHeader = req.headers['x-vercel-cron'];
  if (cronHeader === '1' || cronHeader === 1) {
    return true;
  }

  const userAgent = String(req.headers['user-agent'] || '').toLowerCase();
  return userAgent.includes('vercel-cron');
}

function isAuthorizedCronRequest(req) {
  if (isVercelCronRequest(req)) {
    return true;
  }

  const cronSecret = normalizeSecret(process.env.CRON_SECRET);
  if (!cronSecret) {
    return false;
  }

  const authHeader = normalizeSecret(
    String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''),
  );
  if (authHeader && authHeader === cronSecret) {
    return true;
  }

  return normalizeSecret(req.headers['x-cron-secret']) === cronSecret;
}

module.exports = {
  isAuthorizedCronRequest,
};
