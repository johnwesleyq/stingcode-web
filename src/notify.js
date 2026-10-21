// Emails you when a new inquiry arrives, using Resend (resend.com).
// Needs RESEND_API_KEY and ALERT_EMAIL_TO. Without them, alerts are simply skipped.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const oneLine = s => String(s ?? '').replace(/[\r\n]+/g, ' ').slice(0, 120);

export const alertsEnabled = () => !!(process.env.RESEND_API_KEY && process.env.ALERT_EMAIL_TO);

export async function sendInquiryAlert(inq, siteUrl) {
  if (!alertsEnabled()) return { skipped: true };
  const rows = [
    ['Name', inq.name], ['Company', inq.company], ['Email', inq.email], ['Phone', inq.phone],
    ['Needs', inq.service], ['Budget', inq.budget], ['Timeline', inq.timeline],
  ].filter(([, v]) => v);
  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;color:#132019">
  <h2 style="margin:0 0 4px">New inquiry from ${esc(inq.name)}</h2>
  <p style="margin:0 0 16px;color:#5b6b62">Sent through the stingcode.com contact form</p>
  <table style="border-collapse:collapse;width:100%;font-size:15px">
    ${rows.map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#5b6b62;width:90px;vertical-align:top">${k}</td><td style="padding:6px 0">${esc(v)}</td></tr>`).join('')}
  </table>
  <div style="margin:16px 0;padding:12px 14px;background:#f2f5f3;border-left:3px solid #e8a317;white-space:pre-wrap;font-size:15px">${esc(inq.message)}</div>
  <p style="font-size:14px;color:#5b6b62">Reply to this email to answer ${esc(inq.name)} directly, or open the <a href="${esc(siteUrl)}/admin">back office</a> to convert it to a lead.</p>
</div>`;
  const text = `New inquiry from ${inq.name}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${inq.message}\n\nReply to this email to answer them directly. Back office: ${siteUrl}/admin`;

  const r = await fetch(process.env.RESEND_API_URL || 'https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.ALERT_EMAIL_FROM || 'StingCode Website <onboarding@resend.dev>',
      to: process.env.ALERT_EMAIL_TO.split(',').map(s => s.trim()).filter(Boolean),
      reply_to: inq.email,
      subject: `New inquiry: ${oneLine(inq.name)}${inq.company ? ' · ' + oneLine(inq.company) : ''}${inq.service ? ' · ' + oneLine(inq.service) : ''}`,
      html, text,
    }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return { sent: true };
}
