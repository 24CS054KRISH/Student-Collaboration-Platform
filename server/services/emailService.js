const { google } = require('googleapis');
const MailComposer = require('nodemailer/lib/mail-composer');
require('dotenv').config();

/**
 * Creates and configures a Google OAuth2 client.
 * Returns null if required OAuth credentials are missing from environment.
 */
function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'https://developers.google.com/oauthplayground';
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  oAuth2Client.setCredentials({ refresh_token: refreshToken });
  return oAuth2Client;
}

/**
 * Sends a raw MIME email via official Gmail REST API (v1.users.messages.send)
 */
async function sendRawGmailMessage({ from, to, subject, html }) {
  const oAuth2Client = getOAuth2Client();
  if (!oAuth2Client) {
    console.log("ℹ️ Email skipped: Google OAuth credentials not configured in environment.");
    return false;
  }

  try {
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    const senderEmail = process.env.GMAIL_SENDER_EMAIL || 'noreply@collabgrad.com';

    const composer = new MailComposer({
      from: from || `"CollabGrad Platform" <${senderEmail}>`,
      to,
      subject,
      html
    });

    const message = await composer.compile().build();
    
    // Base64URL encode the RFC822 raw message format expected by Gmail API
    const raw = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    console.log(`📧 [Gmail REST API Dispatch] To: "${to}" | Subject: "${subject}"`);

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw }
    });

    console.log(`✉️ [Gmail REST API Response] Status: ${res.status} ${res.statusText} | Message ID: ${res.data.id}`);
    return true;
  } catch (err) {
    console.error("🔒 Safe Email Log: Error dispatching email via Gmail REST API:", err.message);
    if (err.response && err.response.data) {
      console.error("   Details:", JSON.stringify(err.response.data));
    }
    return false;
  }
}

/**
 * Common HTML email template wrapper matching CollabGrad branding.
 */
function renderEmailTemplate({ title, subtitle, bodyHtml, buttonText, buttonUrl }) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin:0; padding:0; background-color:#f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px; margin:30px auto; background-color:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <!-- Header -->
        <tr>
          <td style="padding: 28px 32px; background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); text-align: left;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td>
                  <span style="font-size:22px; font-weight:800; color:#ffffff; letter-spacing:-0.5px;">CollabGrad</span>
                  <span style="font-size:12px; font-weight:600; color:#93c5fd; display:block; margin-top:2px;">Student Collaboration Platform</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td style="padding: 32px; text-align: left;">
            <h1 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; tracking-tight: -0.02em;">
              ${title}
            </h1>
            ${subtitle ? `<p style="font-size: 13px; font-weight: 600; color: #64748b; margin: 0 0 20px 0;">${subtitle}</p>` : ''}
            
            <div style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 24px;">
              ${bodyHtml}
            </div>

            ${buttonText && buttonUrl ? `
              <div style="margin: 28px 0;">
                <a href="${buttonUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; font-size: 13px; font-weight: 700; text-decoration: none; border-radius: 12px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
                  ${buttonText} &rarr;
                </a>
              </div>
            ` : ''}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding: 20px 32px; background-color: #f1f5f9; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="font-size: 11px; color: #94a3b8; margin: 0; font-weight: 500;">
              CollabGrad • Academic Peer Collaboration Platform
            </p>
            <p style="font-size: 10px; color: #cbd5e1; margin: 4px 0 0 0;">
              This is an automated notification email sent via official Gmail REST API + OAuth 2.0.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

/**
 * 1. Connection Request Email Notification
 */
async function sendConnectionRequestEmail({ recipientEmail, recipientName, senderName, senderEmail }) {
  const html = renderEmailTemplate({
    title: "New Connection Request 🤝",
    subtitle: `${senderName} wants to connect with you on CollabGrad`,
    bodyHtml: `
      <p style="margin:0 0 12px 0;">Hi <strong>${recipientName || 'Student'}</strong>,</p>
      <p style="margin:0 0 12px 0;">
        <strong>${senderName}</strong> (${senderEmail}) sent you a peer connection request to collaborate on academic projects and skill sharing.
      </p>
      <p style="margin:0;">You can review and respond to this request in your platform dashboard.</p>
    `,
    buttonText: "Review Pending Request",
    buttonUrl: "http://localhost:5173"
  });

  return await sendRawGmailMessage({
    from: `"${senderName} via CollabGrad" <${process.env.GMAIL_SENDER_EMAIL}>`,
    to: recipientEmail,
    subject: `🤝 ${senderName} sent you a connection request on CollabGrad`,
    html
  });
}

/**
 * 2. Connection Accepted Email Notification
 */
async function sendConnectionAcceptedEmail({ recipientEmail, recipientName, accepterName }) {
  const html = renderEmailTemplate({
    title: "Connection Request Accepted! 🎉",
    subtitle: `${accepterName} accepted your connection request`,
    bodyHtml: `
      <p style="margin:0 0 12px 0;">Hi <strong>${recipientName || 'Student'}</strong>,</p>
      <p style="margin:0 0 12px 0;">
        Great news! <strong>${accepterName}</strong> has accepted your connection request on CollabGrad.
      </p>
      <p style="margin:0;">You can now exchange direct chat messages, view shared projects, and start collaborating!</p>
    `,
    buttonText: "View My Connections",
    buttonUrl: "http://localhost:5173"
  });

  return await sendRawGmailMessage({
    from: `"CollabGrad Platform" <${process.env.GMAIL_SENDER_EMAIL}>`,
    to: recipientEmail,
    subject: `🎉 ${accepterName} accepted your connection request!`,
    html
  });
}

/**
 * 3. Project Join / Application Email Notification
 */
async function sendProjectJoinEmail({ recipientEmail, recipientName, projectTitle, joiningUserName, type = 'application' }) {
  const titleText = type === 'accepted' ? "Welcome to the Team! 🚀" : "New Team Join Request 🚀";
  const subtitleText = type === 'accepted' 
    ? `You joined "${projectTitle}"`
    : `${joiningUserName} applied to join "${projectTitle}"`;

  const bodyHtml = type === 'accepted'
    ? `
      <p style="margin:0 0 12px 0;">Hi <strong>${recipientName || 'Student'}</strong>,</p>
      <p style="margin:0 0 12px 0;">
        Congratulations! You have been accepted into the project team for <strong>"${projectTitle}"</strong>.
      </p>
      <p style="margin:0;">Head over to your workspace to view project milestones, team roster, and group chat channels.</p>
    `
    : `
      <p style="margin:0 0 12px 0;">Hi <strong>${recipientName || 'Student'}</strong>,</p>
      <p style="margin:0 0 12px 0;">
        <strong>${joiningUserName}</strong> submitted an application to join your project team <strong>"${projectTitle}"</strong>.
      </p>
      <p style="margin:0;">Review their profile, skills, and application details on your Pending Requests dashboard.</p>
    `;

  const html = renderEmailTemplate({
    title: titleText,
    subtitle: subtitleText,
    bodyHtml,
    buttonText: "Open Project Workspace",
    buttonUrl: "http://localhost:5173"
  });

  return await sendRawGmailMessage({
    from: `"CollabGrad Platform" <${process.env.GMAIL_SENDER_EMAIL}>`,
    to: recipientEmail,
    subject: type === 'accepted' ? `🚀 Joined Project: "${projectTitle}"` : `📋 New Team Application for "${projectTitle}"`,
    html
  });
}

/**
 * 4. Project Update Email Notification (Modular helper)
 */
async function sendProjectUpdateEmail({ recipientEmail, recipientName, projectTitle, updateMessage }) {
  const html = renderEmailTemplate({
    title: `Project Update: "${projectTitle}" 📢`,
    subtitle: `Status update from project lead`,
    bodyHtml: `
      <p style="margin:0 0 12px 0;">Hi <strong>${recipientName || 'Student'}</strong>,</p>
      <p style="margin:0 0 12px 0;">There is a new update regarding your project <strong>"${projectTitle}"</strong>:</p>
      <div style="background-color:#f8fafc; border-left:4px solid #2563eb; padding:12px 16px; margin:16px 0; font-style:italic;">
        "${updateMessage}"
      </div>
    `,
    buttonText: "View Project Details",
    buttonUrl: "http://localhost:5173"
  });

  return await sendRawGmailMessage({
    from: `"CollabGrad Platform" <${process.env.GMAIL_SENDER_EMAIL}>`,
    to: recipientEmail,
    subject: `📢 Project Update: "${projectTitle}"`,
    html
  });
}

module.exports = {
  sendConnectionRequestEmail,
  sendConnectionAcceptedEmail,
  sendProjectJoinEmail,
  sendProjectUpdateEmail
};
