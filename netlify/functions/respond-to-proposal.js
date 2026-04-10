// netlify/functions/respond-to-proposal.js
// Called when a member consents to or objects to a proposal
// - Validates auth
// - Updates proposal responses in proposals.json
// - On objection: notifies proposer by email
// - If window has closed with no objections: moves to events.json + notifies chapter

const GITHUB_TOKEN  = process.env.GITHUB_TOKEN;
const GITHUB_REPO   = process.env.GITHUB_REPO;
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const MC_API_KEY    = process.env.MAILCHIMP_API_KEY;

// ── GitHub helpers ───────────────────────────────────────────────

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
    throw new Error(`GitHub PUT failed: ${JSON.stringify(err)}`);
  }
  return res.json();
}

// ── Mailchimp / Mandrill helper ───────────────────────────────────

async function sendTransactional({ to, subject, htmlBody }) {
  if (!MC_API_KEY) {
    console.warn('MAILCHIMP_API_KEY not set — skipping email');
    return;
  }
  const res = await fetch('https://mandrillapp.com/api/1.0/messages/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key: MC_API_KEY,
      message: {
        html: htmlBody,
        subject,
        from_email: 'hello@humanunity.us',
        from_name: 'Human Unity',
        to: to.map(email => ({ email, type: 'to' })),
      },
    }),
  });
  if (!res.ok) console.error('Mandrill error:', await res.text());
}

// ── Email templates ──────────────────────────────────────────────

function objectionEmailHtml({ proposal, reason, objectorEmail, chapter }) {
  return `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F4F3EF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:white;border-radius:6px;overflow:hidden;">
  <tr><td style="background:#12122A;padding:32px 40px 28px;">
    <p style="margin:0 0 16px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#2ABFA3;font-weight:600;">Human Unity · ${chapter.name}, ${chapter.state}</p>
    <h1 style="margin:0;font-size:24px;color:white;line-height:1.2;">An objection was raised.</h1>
  </td></tr>
  <tr><td style="padding:32px 40px;">
    <p style="margin:0 0 8px;font-size:13px;color:#6B6B7B;">Your proposal <strong style="color:#12122A;">"${proposal.title}"</strong> received an objection from <strong style="color:#12122A;">${objectorEmail}</strong>.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF3F0;border-left:3px solid #D85A30;border-radius:0 6px 6px 0;margin:20px 0;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#D85A30;">Objection</p>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#3A1A10;">${reason}</p>
      </td></tr>
    </table>

    <p style="margin:0 0 20px;font-size:14px;line-height:1.65;color:#555;">
      An objection isn't a veto — it's an invitation to resolve a specific concern. Reach out to ${objectorEmail} directly, or respond in the consent round to work through it together. If the concern is resolved, they can withdraw the objection and the proposal moves forward.
    </p>

    <table cellpadding="0" cellspacing="0">
      <tr><td style="border-radius:100px;background:#2ABFA3;">
        <a href="https://humanunity.us/members/consent.html" style="display:inline-block;padding:12px 24px;color:white;font-size:14px;font-weight:600;text-decoration:none;">View consent round →</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function approvalEmailHtml({ proposal, chapter }) {
  const eventDate = new Date(proposal.proposedDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  });

  return `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F4F3EF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:white;border-radius:6px;overflow:hidden;">
  <tr><td style="background:#12122A;padding:32px 40px 28px;">
    <p style="margin:0 0 16px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#2ABFA3;font-weight:600;">Human Unity · ${chapter.name}, ${chapter.state}</p>
    <h1 style="margin:0;font-size:24px;color:white;line-height:1.2;">"${proposal.title}" is on the calendar. 🗓</h1>
  </td></tr>
  <tr><td style="padding:32px 40px;">
    <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#444;">
      The consent round closed with no objections. This event has been approved and published to your chapter calendar.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F3EF;border-radius:6px;margin-bottom:24px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 6px;font-size:13px;color:#555;">📅 <strong>${eventDate}</strong> at ${proposal.proposedTime}</p>
        <p style="margin:0 0 6px;font-size:13px;color:#555;">📍 ${proposal.location}</p>
        <p style="margin:0;font-size:13px;color:#555;">${proposal.description}</p>
      </td></tr>
    </table>

    <table cellpadding="0" cellspacing="0">
      <tr><td style="border-radius:100px;background:#2ABFA3;">
        <a href="https://humanunity.us/members/dashboard.html" style="display:inline-block;padding:12px 24px;color:white;font-size:14px;font-weight:600;text-decoration:none;">View on dashboard →</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function dialogueEmailHtml({ proposal, chapter }) {
  return `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F4F3EF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:white;border-radius:6px;overflow:hidden;">
  <tr><td style="background:#12122A;padding:32px 40px 28px;">
    <p style="margin:0 0 16px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#2ABFA3;font-weight:600;">Human Unity · ${chapter.name}, ${chapter.state}</p>
    <h1 style="margin:0;font-size:24px;color:white;line-height:1.2;">Dialogue needed: "${proposal.title}"</h1>
  </td></tr>
  <tr><td style="padding:32px 40px;">
    <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#444;">
      The consent window has closed but this proposal has unresolved objections. It's now in dialogue — the proposer and objector(s) need to work through the concern before it can be approved or withdrawn.
    </p>
    <table cellpadding="0" cellspacing="0">
      <tr><td style="border-radius:100px;background:#2ABFA3;">
        <a href="https://humanunity.us/members/consent.html" style="display:inline-block;padding:12px 24px;color:white;font-size:14px;font-weight:600;text-decoration:none;">View the dialogue →</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

// ── JWT decode ───────────────────────────────────────────────────

async function verifyNetlifyJWT(token) {
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
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed' }) };
  }

  // Auth
  const token = (event.headers.authorization || '').replace('Bearer ', '');
  if (!token) return { statusCode: 401, body: JSON.stringify({ message: 'Unauthorized' }) };

  let user;
  try {
    user = await verifyNetlifyJWT(token);
  } catch {
    return { statusCode: 401, body: JSON.stringify({ message: 'Invalid token' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ message: 'Invalid JSON' }) };
  }

  const { proposalId, type, reason } = body;

  if (!proposalId || !type) {
    return { statusCode: 400, body: JSON.stringify({ message: 'proposalId and type required' }) };
  }
  if (!['consent', 'objection'].includes(type)) {
    return { statusCode: 400, body: JSON.stringify({ message: 'type must be consent or objection' }) };
  }
  if (type === 'objection' && !reason?.trim()) {
    return { statusCode: 400, body: JSON.stringify({ message: 'Objection requires a reason' }) };
  }

  try {
    // Load all data
    const [proposalsFile, eventsFile, chaptersFile] = await Promise.all([
      getFile('data/proposals.json'),
      getFile('data/events.json'),
      getFile('data/chapters.json'),
    ]);

    const proposals = proposalsFile.json;
    const events    = eventsFile.json;
    const chapters  = chaptersFile.json;

    // Find proposal
    const idx = proposals.findIndex(p => p.id === proposalId);
    if (idx === -1) {
      return { statusCode: 404, body: JSON.stringify({ message: 'Proposal not found' }) };
    }

    const proposal = proposals[idx];

    // Check proposal is still open
    if (proposal.status !== 'open') {
      return { statusCode: 409, body: JSON.stringify({ message: `Proposal is ${proposal.status} — cannot respond` }) };
    }

    // Check member hasn't already responded
    const alreadyResponded = proposal.responses.find(r => r.member === user.email);
    if (alreadyResponded) {
      return { statusCode: 409, body: JSON.stringify({ message: 'You have already responded to this proposal' }) };
    }

    // Find chapter
    const chapter = chapters.find(c => c.id === proposal.chapterId);
    if (!chapter) {
      return { statusCode: 404, body: JSON.stringify({ message: 'Chapter not found' }) };
    }

    // Add response
    proposal.responses.push({
      member: user.email,
      type,
      reason: reason || null,
      at: new Date().toISOString(),
    });

    const allMembers = chapter.memberEmails || [];
    const hasObjection = proposal.responses.some(r => r.type === 'objection');
    const windowClosed = new Date() > new Date(proposal.windowClosesAt);

    // Determine new status
    if (windowClosed && !hasObjection) {
      // Auto-approve
      proposal.status = 'approved';
    } else if (windowClosed && hasObjection) {
      // Enter dialogue
      proposal.status = 'dialogue';
    }
    // else stays 'open'

    // Write updated proposals
    await writeFile(
      'data/proposals.json',
      proposals,
      proposalsFile.sha,
      `Proposal "${proposal.title}": ${user.email} ${type}`
    );

    // If approved — move to events.json
    if (proposal.status === 'approved') {
      const newEvent = {
        id: `evt-${Date.now()}`,
        chapterId: proposal.chapterId,
        title: proposal.title,
        description: proposal.description,
        date: proposal.proposedDate,
        time: proposal.proposedTime,
        location: proposal.location,
        status: 'approved',
        proposedBy: proposal.proposedBy,
        approvedAt: new Date().toISOString(),
        fromProposalId: proposal.id,
      };
      events.push(newEvent);
      await writeFile(
        'data/events.json',
        events,
        eventsFile.sha,
        `Event approved: "${proposal.title}"`
      );

      // Notify all chapter members
      if (allMembers.length > 0) {
        await sendTransactional({
          to: allMembers,
          subject: `"${proposal.title}" is on the calendar 🗓`,
          htmlBody: approvalEmailHtml({ proposal, chapter }),
        });
      }
    }

    // If objection raised — notify proposer
    if (type === 'objection') {
      await sendTransactional({
        to: [proposal.proposedBy],
        subject: `An objection was raised on your proposal: "${proposal.title}"`,
        htmlBody: objectionEmailHtml({
          proposal,
          reason,
          objectorEmail: user.email,
          chapter,
        }),
      });
    }

    // If entered dialogue — notify all members
    if (proposal.status === 'dialogue') {
      if (allMembers.length > 0) {
        await sendTransactional({
          to: allMembers,
          subject: `Dialogue needed: "${proposal.title}"`,
          htmlBody: dialogueEmailHtml({ proposal, chapter }),
        });
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        proposalStatus: proposal.status,
      }),
    };

  } catch (err) {
    console.error('respond-to-proposal error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: err.message || 'Internal server error' }),
    };
  }
};
