const { google } = require('googleapis');
const MailComposer = require('nodemailer/lib/mail-composer');
require('dotenv').config();

async function sendViaGmailRestApi() {
  console.log("==========================================");
  console.log("🚀 TESTING GMAIL REST API (v1.users.messages.send)");
  console.log("==========================================");

  try {
    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'https://developers.google.com/oauthplayground'
    );

    oAuth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    // Compose raw MIME email
    const mailOptions = {
      from: `"CollabGrad Platform" <${process.env.GMAIL_SENDER_EMAIL}>`,
      to: "krishmendapara84@gmail.com",
      subject: "🤝 Test Connection Request via Gmail API REST",
      html: `
        <div style="font-family:sans-serif; padding:20px; border:1px solid #e2e8f0; border-radius:12px;">
          <h2 style="color:#2563eb;">CollabGrad Platform</h2>
          <p>Hi <strong>Krish</strong>,</p>
          <p>This is a live test notification email sent via official Gmail REST API + OAuth 2.0!</p>
        </div>
      `
    };

    const composer = new MailComposer(mailOptions);
    const message = await composer.compile().build();
    
    // Base64URL encode the raw message
    const raw = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw }
    });

    console.log("🎉 SUCCESS: Sent email via Gmail REST API!");
    console.log("   - Message ID:", res.data.id);
    console.log("   - Thread ID:", res.data.threadId);
    console.log("   - Response Status:", res.status, res.statusText);
  } catch (err) {
    console.error("❌ Gmail REST API Error:", err.message);
    if (err.response && err.response.data) {
      console.error("   Details:", JSON.stringify(err.response.data));
    }
  }
  process.exit(0);
}

sendViaGmailRestApi();
