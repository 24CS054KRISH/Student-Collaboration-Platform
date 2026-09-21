require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

async function exchange() {
  const code = process.argv[2];
  if (!code) {
    console.log('❌ Error: Please provide the authorization code.');
    console.log('Usage: node exchange_code.js 4/0A...');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'https://developers.google.com/oauthplayground'
  );

  try {
    const { tokens } = await oauth2Client.getToken(code.trim());
    if (!tokens.refresh_token) {
      console.log('⚠️ Warning: No refresh token returned. (Google only returns a refresh token on the first authorization or when prompt=consent is used).');
      console.log('Access token received successfully.');
      return;
    }

    console.log('✅ Success: Received new refresh token!');

    // Update server/.env
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');

    if (envContent.includes('GOOGLE_REFRESH_TOKEN=')) {
      envContent = envContent.replace(
        /GOOGLE_REFRESH_TOKEN=.*/,
        `GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`
      );
    } else {
      envContent += `\nGOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`;
    }

    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log('💾 Automatically updated GOOGLE_REFRESH_TOKEN in server/.env!');
    console.log('🎉 You are now ready to send emails from skillsync1209@gmail.com!');
  } catch (err) {
    console.error('❌ Error exchanging code for tokens:', err.message);
    if (err.response && err.response.data) {
      console.error('Details:', err.response.data);
    }
  }
}

exchange();
