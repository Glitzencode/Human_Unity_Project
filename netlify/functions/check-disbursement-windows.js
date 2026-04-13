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
}

exports.handler = async () => {
  try {
    const [disbFile, chapFile] = await Promise.all([
      getFile('data/disbursements.json'),
      getFile('data/chapters.json'),
    ]);

    const now = new Date();
    let changed = false;
    const disbursements = disbFile.content;

    for (const disb of disbursements) {
      if (disb.status !== 'open') continue;
      if (new Date(disb.windowClosesAt) > now) continue;

      const objections = disb.responses.filter(r => r.type === 'objection');
      if (objections.length === 0) {
        disb.status = 'approved';
        disb.approvedAt = now.toISOString();
        changed = true;

        const chapter = chapFile.content.find(c => c.id === disb.chapterId);
        const memberEmails = chapter?.memberEmails || [];
        for (const email of memberEmails) {
          try {
            await mailer.sendMail({
              from: '"Human Unity" <hello@humanunity.us>',
              to: email,
              subject: `Disbursement approved: "${disb.title}"`,
              html: `
                <p>The disbursement <strong>"${disb.title}"</strong> has been approved by consent.</p>
                <p><strong>Amount:</strong> $${disb.amount.toFixed(2)}</p>
                <p>No objections were raised during the 5-day consent window.</p>
                <p><a href="https://humanunity.us/members/chapter-fund.html">View fund →</a></p>
              `
            });
          } catch (e) { console.error('Email error:', e.message); }
        }
      } else {
        disb.status = 'dialogue';
        changed = true;
      }
    }

    if (changed) {
      await writeFile('data/disbursements.json', disbursements, disbFile.sha,
        'Auto-process expired disbursement windows');
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ message: err.message }) };
  }
};
