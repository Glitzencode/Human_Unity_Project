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

  const { chapterId, type, targetId, title, description, goalAmount, category, proposedBy } = body;
  if (!chapterId || !title || !goalAmount || !proposedBy || !category) {
    return { statusCode: 400, body: JSON.stringify({ message: 'Missing required fields' }) };
  }

  try {
    const [goalsFile, chapFile] = await Promise.all([
      getFile('data/fund-goals.json'),
      getFile('data/chapters.json'),
    ]);

    const chapter = chapFile.content.find(c => c.id === chapterId);
    if (!chapter) return { statusCode: 404, body: JSON.stringify({ message: 'Chapter not found' }) };

    // Goals go through a consent round — stored as pending until approved
    const newGoal = {
      id: `goal-${Date.now()}`,
      chapterId, type: type || 'chapter', targetId: targetId || chapterId,
      title, description, goalAmount: parseFloat(goalAmount),
      category, status: 'pending',
      proposedBy, proposedAt: new Date().toISOString(),
      windowClosesAt: new Date(Date.now() + 120 * 60 * 60 * 1000).toISOString(),
      responses: []
    };

    const updated = [...goalsFile.content, newGoal];
    await writeFile('data/fund-goals.json', updated, goalsFile.sha,
      `Propose goal: "${title}" for ${chapterId}`);

    // Email chapter members
    const memberEmails = chapter.memberEmails || [];
    for (const email of memberEmails) {
      if (email === proposedBy) continue;
      try {
        await mailer.sendMail({
          from: '"Human Unity" <hello@humanunity.us>',
          to: email,
          subject: `Funding goal proposed: "${title}"`,
          html: `
            <p>A new funding goal has been proposed for <strong>${chapter.name}, ${chapter.state}</strong>.</p>
            <p><strong>${title}</strong> — $${parseFloat(goalAmount).toFixed(2)}</p>
            ${description ? `<p>${description}</p>` : ''}
            <p>Category: ${category}</p>
            <p>Proposed by: ${proposedBy}</p>
            <p>The consent window closes in 5 days.</p>
            <p><a href="https://humanunity.us/members/chapter-fund.html">Review goal →</a></p>
          `
        });
      } catch (e) { console.error('Email error:', e.message); }
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, goal: newGoal }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ message: err.message }) };
  }
};
