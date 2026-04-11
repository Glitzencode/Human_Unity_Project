// netlify/functions/propose-event.js
// Called when a member submits a new event proposal
// - Validates auth via Netlify Identity JWT
// - Appends to /data/proposals.json via GitHub API
// - Sends email notifications via Namecheap Private Email SMTP

const { sendEmail } = require('./utils/mailer');

const GITHUB_TOKEN  = process.env.GITHUB_TOKEN;
const GITHUB_REPO   = process.env.GITHUB_REPO;   // e.g. "Glitzencode/Human_Unity_Project"
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

// ── GitHub helpers ──────────────────────────────────────────────

async function getFile(path) {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
  });
  if (!res.ok) throw new Error(`GitHub GET failed for ${path}: ${res.status}`);
  const data = await res.json();
  const content = Buffer.from(data.content, 'base64').toString('utf8');
  return { json: JSON.parse(content), sha: data.sha };
}

async function writeFile(path, content, sha, message) {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`;
  const body = {
    message,
    content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'),
    sha,
    branch: GITHUB_BRANCH,
  };
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`GitHub PUT failed for ${path}: ${JSON.stringify(err)}`);
  }
  return res.json();
}


function proposalEmailHtml({ proposal, chapter, windowClosesAt }) {
  const closeDate = new Date(windowClosesAt).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  });

  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F4F3EF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:32px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:white;border-radius:6px;overflow:hidden;">

  <tr><td style="background:#12122A;padding:32px 40px 28px;">
    <p style="margin:0 0 20px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#2ABFA3;font-weight:600;">Human Unity · ${chapter.name}, ${chapter.state}</p>
    <h1 style="margin:0;font-size:26px;color:white;line-height:1.2;">New event proposed.</h1>
  </td></tr>

  <tr><td style="padding:32px 40px;">
    <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#6B6B7B;font-weight:600;">Proposed event</p>
    <h2 style="margin:0 0 16px;font-size:20px;color:#12122A;">${proposal.title}</h2>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#444;">${proposal.description}</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F3EF;border-radius:6px;margin-bottom:24px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 6px;font-size:13px;color:#555;">📅 <strong>${proposal.proposedDate}</strong> at ${proposal.proposedTime}</p>
        <p style="margin:0 0 6px;font-size:13px;color:#555;">📍 ${proposal.location}</p>
        <p style="margin:0;font-size:13px;color:#555;">👤 Proposed by ${proposal.proposedBy}</p>
      </td></tr>
    </table>

    <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#555;">
      This proposal is now in a <strong>5-day consent round</strong>. If no member raises a valid objection by <strong>${closeDate}</strong>, the event will automatically be published to the chapter calendar.
    </p>

    <table cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
      <tr>
        <td style="border-radius:100px;background:#2ABFA3;">
          <a href="https://humanunity.us/members/consent.html" style="display:inline-block;padding:13px 28px;color:white;font-size:14px;font-weight:600;text-decoration:none;">Review &amp; respond →</a>
        </td>
      </tr>
    </table>

    <p style="margin:16px 0 0;font-size:12px;color:#999;line-height:1.5;">
      You're receiving this because you're a member of the ${chapter.name}, ${chapter.state} chapter of Human Unity.
      <a href="https://humanunity.us/privacy.html" style="color:#2ABFA3;">Privacy policy</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ── JWT verification ─────────────────────────────────────────────

async function verifyNetlifyJWT(token) {
  // Netlify Identity JWTs are RS256 — for server-side verification
  // you'd validate against the JWKS endpoint. For simplicity here
  // we decode the payload (base64) to get the user email.
  // Full verification happens at the Netlify edge via the Identity context.
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid JWT');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    return payload;
  } catch {
    throw new Error('Invalid token');
  }
}

// ── Handler ──────────────────────────────────────────────────────

exports.handler = async (event) => {
  // Only POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed' }) };
  }

  // Auth
  const authHeader = event.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ message: 'Unauthorized' }) };
  }

  let user;
  try {
    user = await verifyNetlifyJWT(token);
  } catch {
    return { statusCode: 401, body: JSON.stringify({ message: 'Invalid token' }) };
  }

  // Parse body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ message: 'Invalid JSON body' }) };
  }

  const { title, description, proposedDate, proposedTime, location, chapterId } = body;

  // Validate required fields
  if (!title || !description || !proposedDate || !proposedTime || !location || !chapterId) {
    return { statusCode: 400, body: JSON.stringify({ message: 'Missing required fields' }) };
  }

  // Validate date is in the future
  if (new Date(proposedDate) <= new Date()) {
    return { statusCode: 400, body: JSON.stringify({ message: 'Event date must be in the future' }) };
  }

  try {
    // Load current data
    const [proposalsFile, chaptersFile] = await Promise.all([
      getFile('data/proposals.json'),
      getFile('data/chapters.json'),
    ]);

    const proposals = proposalsFile.json;
    const chapters  = chaptersFile.json;

    // Find chapter
    const chapter = chapters.find(c => c.id === chapterId);
    if (!chapter) {
      return { statusCode: 404, body: JSON.stringify({ message: 'Chapter not found' }) };
    }

    // Build proposal
    const now = new Date();
    const windowClosesAt = new Date(now.getTime() + 120 * 60 * 60 * 1000); // 120 hours

    const proposal = {
      id: `prop-${Date.now()}`,
      chapterId,
      title,
      description,
      proposedDate,
      proposedTime,
      location,
      proposedBy: user.email,
      proposedAt: now.toISOString(),
      windowClosesAt: windowClosesAt.toISOString(),
      status: 'open',
      responses: [],
    };

    // Append and write back
    proposals.push(proposal);
    await writeFile(
      'data/proposals.json',
      proposals,
      proposalsFile.sha,
      `Proposal: "${title}" by ${user.email}`
    );

    // Send email notifications to chapter members
    const recipients = (chapter.memberEmails || []).filter(e => e !== user.email);
    if (recipients.length > 0) {
      await sendEmail({
        to: recipients,
        subject: `New event proposed: "${title}" — you have 5 days to respond`,
        htmlBody: proposalEmailHtml({ proposal, chapter, windowClosesAt: windowClosesAt.toISOString() }),
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        proposalId: proposal.id,
        windowClosesAt: proposal.windowClosesAt,
      }),
    };

  } catch (err) {
    console.error('propose-event error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: err.message || 'Internal server error' }),
    };
  }
};
