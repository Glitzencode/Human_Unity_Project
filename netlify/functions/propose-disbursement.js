const { mailer } = require('./utils/mailer');
const fetch = require('node-fetch');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO  = process.env.GITHUB_REPO;
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

  const { chapterId, targetType, targetId, title, description, amount, proposedBy, memberEmail } = body;
  if (!chapterId || !title || !amount || !proposedBy) {
    return { statusCode: 400, body: JSON.stringify({ message: 'Missing required fields' }) };
  }

  try {
    const [disbFile, chapFile, goalsFile] = await Promise.all([
      getFile('data/disbursements.json'),
      getFile('data/chapters.json'),
      getFile('data/fund-goals.json'),
    ]);

    const chapter = chapFile.content.find(c => c.id === chapterId);
    if (!chapter) return { statusCode: 404, body: JSON.stringify({ message: 'Chapter not found' }) };

    const windowClosesAt = new Date(Date.now() + 120 * 60 * 60 * 1000).toISOString();
    const newDisb = {
      id: `disb-${Date.now()}`,
      chapterId, targetType: targetType || 'chapter', targetId: targetId || chapterId,
      title, description, amount: parseFloat(amount),
      proposedBy, proposedAt: new Date().toISOString(),
      windowClosesAt, status: 'open', responses: []
    };

    const updated = [...disbFile.content, newDisb];
    await writeFile('data/disbursements.json', updated, disbFile.sha,
      `Propose disbursement: "${title}" for ${chapterId}`);

    // Email chapter members
    const memberEmails = chapter.memberEmails || [];
    for (const email of memberEmails) {
      if (email === proposedBy) continue;
      try {
        await mailer.sendMail({
          from: '"Human Unity" <hello@humanunity.us>',
          to: email,
          subject: `Disbursement proposed: "${title}"`,
          html: `
            <p>A disbursement has been proposed for <strong>${chapter.name}, ${chapter.state}</strong>.</p>
            <p><strong>${title}</strong> — $${parseFloat(amount).toFixed(2)}</p>
            ${description ? `<p>${description}</p>` : ''}
            <p>Proposed by: ${proposedBy}</p>
            <p>The consent window closes in 5 days. Visit your member dashboard to respond.</p>
            <p><a href="https://humanunity.us/members/chapter-fund.html">Review disbursement →</a></p>
          `
        });
      } catch (e) { console.error('Email error:', e.message); }
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, disbursement: newDisb }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ message: err.message }) };
  }
};
