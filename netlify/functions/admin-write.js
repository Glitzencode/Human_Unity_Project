// netlify/functions/admin-write.js
// Admin-only direct write to data JSON files
// Requires the calling user to have the 'admin' role in Netlify Identity

const GITHUB_TOKEN  = process.env.GITHUB_TOKEN;
const GITHUB_REPO   = process.env.GITHUB_REPO;
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

// Allowed files — prevent writes outside /data/
const ALLOWED_FILES = [
  'data/chapters.json',
  'data/events.json',
  'data/proposals.json',
];

async function getFileSha(path) {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`,
    { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' } }
  );
  if (!res.ok) throw new Error(`Could not get SHA for ${path}: ${res.status}`);
  const data = await res.json();
  return data.sha;
}

async function writeFile(path, content, sha, message) {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'),
        sha,
        branch: GITHUB_BRANCH,
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'GitHub write failed');
  }
}

function decodeJWT(token) {
  try {
    const payload = Buffer.from(token.split('.')[1], 'base64url').toString();
    return JSON.parse(payload);
  } catch {
    throw new Error('Invalid token');
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed' }) };
  }

  // Auth
  const token = (event.headers.authorization || '').replace('Bearer ', '');
  if (!token) return { statusCode: 401, body: JSON.stringify({ message: 'Unauthorized' }) };

  let user;
  try {
    user = decodeJWT(token);
  } catch {
    return { statusCode: 401, body: JSON.stringify({ message: 'Invalid token' }) };
  }

  // Role check — must be admin
  const roles = user.app_metadata?.roles || [];
  if (!roles.includes('admin')) {
    return { statusCode: 403, body: JSON.stringify({ message: 'Admin access required' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ message: 'Invalid JSON' }) };
  }

  const { file, content, message } = body;

  // Validate file path
  if (!ALLOWED_FILES.includes(file)) {
    return { statusCode: 400, body: JSON.stringify({ message: `File not allowed: ${file}` }) };
  }

  if (!Array.isArray(content) && typeof content !== 'object') {
    return { statusCode: 400, body: JSON.stringify({ message: 'Content must be JSON' }) };
  }

  try {
    const sha = await getFileSha(file);
    await writeFile(
      file,
      content,
      sha,
      message || `Admin write to ${file} by ${user.email}`
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error('admin-write error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: err.message || 'Internal server error' }),
    };
  }
};
