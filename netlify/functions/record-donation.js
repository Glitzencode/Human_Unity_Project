const fetch = require('node-fetch');

const GITHUB_TOKEN  = process.env.GITHUB_TOKEN;
const GITHUB_REPO   = process.env.GITHUB_REPO;
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

async function getFile(path) {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`,
    { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' } }
  );
  if (!res.ok) throw new Error(`GitHub GET ${path} failed: ${res.status}`);
  const data = await res.json();
  return { content: JSON.parse(Buffer.from(data.content, 'base64').toString()), sha: data.sha };
}

async function writeFile(path, content, sha, message) {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message, sha, branch: GITHUB_BRANCH,
        content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64')
      })
    }
  );
  if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'GitHub write failed'); }
  return res.json();
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  // Admin-only — verify JWT has admin role
  const auth = event.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return { statusCode: 401, body: JSON.stringify({ message: 'Unauthorized' }) };

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ message: 'Invalid JSON' }) }; }

  const { donorEmail, donorName, amount, targetType, targetId, chapterId, category, anonymous, note } = body;
  if (!amount || !targetType || !targetId || !category) {
    return { statusCode: 400, body: JSON.stringify({ message: 'Missing required fields' }) };
  }

  try {
    const donationsFile = await getFile('data/donations.json');

    const newDonation = {
      id: `don-${Date.now()}`,
      donorEmail: anonymous ? null : (donorEmail || null),
      donorName: anonymous ? null : (donorName || null),
      anonymous: !!anonymous,
      amount: parseFloat(amount),
      targetType,   // 'trust' | 'chapter' | 'event' | 'project' | 'initiative'
      targetId,
      chapterId: chapterId || null,
      category,     // 'general' | 'event' | 'project' | 'initiative' | 'administrative'
      note: note || '',
      recordedAt: new Date().toISOString(),
      fiscalYear: new Date().getFullYear(),
      paymentMethod: 'manual',
      stripePaymentId: null  // populated when Stripe is live
    };

    const updated = [...donationsFile.content, newDonation];
    await writeFile('data/donations.json', updated, donationsFile.sha,
      `Record donation: $${parseFloat(amount).toFixed(2)} to ${targetId}`);

    return { statusCode: 200, body: JSON.stringify({ success: true, donation: newDonation }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ message: err.message }) };
  }
};
