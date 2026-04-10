// netlify/functions/check-proposal-windows.js
// Scheduled function — runs every hour via Netlify cron
// Checks all open proposals:
//   - Window closed + no objections → auto-approve, publish to events.json
//   - Window closed + objections → move to 'dialogue', notify members

const schedule = require('@netlify/functions').schedule;

const GITHUB_TOKEN  = process.env.GITHUB_TOKEN;
const GITHUB_REPO   = process.env.GITHUB_REPO;
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const MC_API_KEY    = process.env.MAILCHIMP_API_KEY;

async function getFile(path) {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`GitHub GET failed: ${res.status}`);
  const data = await res.json();
  return { json: JSON.parse(Buffer.from(data.content, 'base64').toString('utf8')), sha: data.sha };
}

async function writeFile(path, content, sha, message) {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`, {
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
  });
  if (!res.ok) throw new Error(`GitHub PUT failed: ${(await res.json()).message}`);
}

async function sendTransactional({ to, subject, htmlBody }) {
  if (!MC_API_KEY || !to.length) return;
  await fetch('https://mandrillapp.com/api/1.0/messages/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key: MC_API_KEY,
      message: {
        html: htmlBody,
        subject,
        from_email: 'hello@humanunity.us',
        from_name: 'Human Unity',
        to: to.map(e => ({ email: e, type: 'to' })),
      },
    }),
  });
}

function approvalHtml(proposal, chapter) {
  return `<html><body style="font-family:sans-serif;background:#F4F3EF;padding:32px">
    <div style="max-width:520px;margin:0 auto;background:white;border-radius:6px;overflow:hidden">
      <div style="background:#12122A;padding:28px 32px">
        <p style="color:#2ABFA3;font-size:11px;text-transform:uppercase;letter-spacing:.1em;margin:0 0 12px;font-weight:600">${chapter.name}, ${chapter.state}</p>
        <h2 style="color:white;margin:0;font-size:22px">"${proposal.title}" is on the calendar 🗓</h2>
      </div>
      <div style="padding:28px 32px">
        <p style="color:#444;font-size:15px;line-height:1.6">The 5-day consent window closed with no objections. This event has been approved and added to your chapter calendar.</p>
        <p style="color:#555;font-size:13px">📅 ${proposal.proposedDate} · ${proposal.proposedTime}<br>📍 ${proposal.location}</p>
        <a href="https://humanunity.us/members/dashboard.html" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#2ABFA3;color:white;border-radius:100px;text-decoration:none;font-size:14px;font-weight:600">View on dashboard →</a>
      </div>
    </div>
  </body></html>`;
}

function dialogueHtml(proposal, chapter) {
  return `<html><body style="font-family:sans-serif;background:#F4F3EF;padding:32px">
    <div style="max-width:520px;margin:0 auto;background:white;border-radius:6px;overflow:hidden">
      <div style="background:#12122A;padding:28px 32px">
        <p style="color:#2ABFA3;font-size:11px;text-transform:uppercase;letter-spacing:.1em;margin:0 0 12px;font-weight:600">${chapter.name}, ${chapter.state}</p>
        <h2 style="color:white;margin:0;font-size:22px">Dialogue needed: "${proposal.title}"</h2>
      </div>
      <div style="padding:28px 32px">
        <p style="color:#444;font-size:15px;line-height:1.6">The consent window closed with unresolved objections. This proposal is now in dialogue — the proposer and objector(s) need to work through the concern together.</p>
        <a href="https://humanunity.us/members/consent.html" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#2ABFA3;color:white;border-radius:100px;text-decoration:none;font-size:14px;font-weight:600">View the dialogue →</a>
      </div>
    </div>
  </body></html>`;
}

const handler = async () => {
  console.log('check-proposal-windows: running at', new Date().toISOString());

  try {
    const [proposalsFile, eventsFile, chaptersFile] = await Promise.all([
      getFile('data/proposals.json'),
      getFile('data/events.json'),
      getFile('data/chapters.json'),
    ]);

    const proposals = proposalsFile.json;
    const events    = eventsFile.json;
    const chapters  = chaptersFile.json;

    const now = new Date();
    let proposalsChanged = false;
    let eventsChanged    = false;

    for (const proposal of proposals) {
      if (proposal.status !== 'open') continue;
      if (new Date(proposal.windowClosesAt) > now) continue;

      // Window has closed
      const chapter = chapters.find(c => c.id === proposal.chapterId);
      const members = chapter?.memberEmails || [];
      const hasObjection = proposal.responses.some(r => r.type === 'objection');

      if (!hasObjection) {
        // Auto-approve
        proposal.status = 'approved';
        proposalsChanged = true;

        const newEvent = {
          id: `evt-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
          chapterId: proposal.chapterId,
          title: proposal.title,
          description: proposal.description,
          date: proposal.proposedDate,
          time: proposal.proposedTime,
          location: proposal.location,
          status: 'approved',
          proposedBy: proposal.proposedBy,
          approvedAt: now.toISOString(),
          fromProposalId: proposal.id,
        };

        events.push(newEvent);
        eventsChanged = true;

        console.log(`Auto-approved: "${proposal.title}" (${proposal.id})`);

        if (members.length && chapter) {
          await sendTransactional({
            to: members,
            subject: `"${proposal.title}" is on the calendar 🗓`,
            htmlBody: approvalHtml(proposal, chapter),
          });
        }

      } else {
        // Enter dialogue
        proposal.status = 'dialogue';
        proposalsChanged = true;

        console.log(`Entered dialogue: "${proposal.title}" (${proposal.id})`);

        if (members.length && chapter) {
          await sendTransactional({
            to: members,
            subject: `Dialogue needed: "${proposal.title}"`,
            htmlBody: dialogueHtml(proposal, chapter),
          });
        }
      }
    }

    // Write back only if something changed
    if (proposalsChanged) {
      await writeFile('data/proposals.json', proposals, proposalsFile.sha,
        'chore: auto-process expired proposal windows');
    }
    if (eventsChanged) {
      await writeFile('data/events.json', events, eventsFile.sha,
        'chore: publish auto-approved events');
    }

    console.log('check-proposal-windows: done');
    return { statusCode: 200 };

  } catch (err) {
    console.error('check-proposal-windows error:', err);
    return { statusCode: 500 };
  }
};

// Runs every hour — Netlify cron syntax
exports.handler = schedule('0 * * * *', handler);
