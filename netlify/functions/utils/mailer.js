// netlify/functions/utils/mailer.js
// Shared transactional email utility
// Uses nodemailer + Namecheap Private Email SMTP
// No third-party paid service required

const nodemailer = require('nodemailer');

// Transporter is created once and reused within a function invocation
let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  const host = process.env.SMTP_HOST || 'mail.privateemail.com';
  const port = parseInt(process.env.SMTP_PORT || '465');
  const user = process.env.SMTP_USER; // hello@humanunity.us
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error('SMTP_USER and SMTP_PASS environment variables are required');
  }

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465 (SSL), false for 587 (STARTTLS)
    auth: { user, pass },
    // Namecheap requires SPA to be disabled — plain LOGIN auth
    authMethod: 'LOGIN',
  });

  return _transporter;
}

/**
 * Send a transactional email
 * @param {Object} options
 * @param {string[]} options.to       - Array of recipient email addresses
 * @param {string}   options.subject  - Email subject line
 * @param {string}   options.htmlBody - HTML email body
 * @param {string}   [options.textBody] - Optional plain text fallback
 */
async function sendEmail({ to, subject, htmlBody, textBody }) {
  if (!to || to.length === 0) {
    console.warn('sendEmail: no recipients, skipping');
    return;
  }

  const transporter = getTransporter();

  const from = `Human Unity <${process.env.SMTP_USER}>`;

  // Send to each recipient individually to avoid exposing
  // member email addresses to each other in the To: field
  const results = await Promise.allSettled(
    to.map(recipient =>
      transporter.sendMail({
        from,
        to: recipient,
        subject,
        html: htmlBody,
        text: textBody || stripHtml(htmlBody),
      })
    )
  );

  // Log any failures without throwing — email failure shouldn't
  // break the main operation (proposal write, etc.)
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.error(`sendEmail: failed to send to ${to[i]}:`, result.reason?.message);
    } else {
      console.log(`sendEmail: sent to ${to[i]}, messageId: ${result.value?.messageId}`);
    }
  });
}

// Simple HTML stripper for plain text fallback
function stripHtml(html) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

module.exports = { sendEmail };
