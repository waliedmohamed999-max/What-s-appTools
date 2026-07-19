const config = require('./config');

let transporterPromise = null;

// Lazy singleton: nodemailer is a fairly heavy import and most deployments never
// configure SMTP, so avoid paying for it (and avoid connecting) until first use.
function getTransporter() {
  if (!config.SMTP_HOST) return null;
  if (!transporterPromise) {
    const nodemailer = require('nodemailer');
    transporterPromise = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE,
      auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASS } : undefined
    });
  }
  return transporterPromise;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Strip characters that could break a mail header out of subject-line text.
function sanitizeForHeader(value) {
  return String(value).replace(/[\r\n]+/g, ' ').trim();
}

// Best-effort: failures here must never break the /api/leads response, since the
// lead is already safely stored in data/leads.json regardless of email delivery.
async function sendLeadNotification(lead) {
  const transporter = getTransporter();
  if (!transporter) return;

  const fields = [
    ['Name', lead.name],
    ['Phone', lead.phone],
    ['Email', lead.email],
    ['Message', lead.message]
  ].filter(([, value]) => value);

  const text = fields.map(([label, value]) => `${label}: ${value}`).join('\n');
  const html = `<h2>New DMS website lead</h2><ul>${fields
    .map(([label, value]) => `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</li>`)
    .join('')}</ul>`;

  await transporter.sendMail({
    from: config.SMTP_FROM,
    to: config.LEAD_NOTIFY_EMAIL,
    replyTo: lead.email || undefined,
    subject: `New DMS lead — ${sanitizeForHeader(lead.name)}`,
    text,
    html
  });
}

module.exports = { sendLeadNotification };
