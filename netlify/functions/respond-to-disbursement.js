const { mailer } = require('./utils/mailer');
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

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ message: 'Invalid JSON' }) }; }

  const { disbursementId, member, type, reason } = body;
  if (!disbursementId || !member || !type) {
    return { statusCode: 400, body: JSON.stringify({ message: 'Missing required fields' }) };
  }

  try {
    const [disbFile, chapFile] = await Promise.all([
      getFile('data/disbursements.json'),
      getFile('data/chapters.json'),
    ]);

    const disbursements = disbFile.content;
    const idx = disbursements.findIndex(d => d.id === disbursementId);
    if (idx === -1) return { statusCode: 404, body: JSON.stringify({ message: 'Disbursement not found' }) };

    const disb = disbursements[idx];
    if (disb.status !== 'open') return { statusCode: 400, body: JSON.stringify({ message: 'Consent window is closed' }) };

    // Remove any existing response from this member
    disb.responses = disb.responses.filter(r => r.member !== member);
    disb.responses.push({ member, type, reason: reason || '', at: new Date().toISOString() });

    // Handle objection → dialogue state
    if (type === 'objection') {
      disb.status = 'dialogue';
      const chapter = chapFile.content.find(c => c.id === disb.chapterId);
      const memberEmails = chapter?.memberEmails || [];
      for (const email of memberEmails) {
        try {
          await mailer.sendMail({
            from: '"Human Unity" <hello@humanunity.us>',
            to: email,
            subject: `Objection raised: "${disb.title}"`,
            html: `
              <p>An objection has been raised to the disbursement <strong>"${disb.title}"</strong>.</p>
              <p><strong>Objection from:</strong> ${member}</p>
              ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
              <p>This disbursement is now in dialogue. Visit your member dashboard to participate.</p>
              <p><a href="https://humanunity.us/members/chapter-fund.html">View disbursement →</a></p>
            `
          });
        } catch (e) { console.error('Email error:', e.message); }
      }
    }

    disbursements[idx] = disb;
    await writeFile('data/disbursements.json', disbursements, disbFile.sha,
      `Response to disbursement ${disbursementId}: ${type} by ${member}`);

    return { statusCode: 200, body: JSON.stringify({ success: true, disbursement: disb }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ message: err.message }) };
  }
};
