require('dotenv').config();
const { sendVerificationOtpEmail } = require('./services/emailService');

async function testOtpEmail() {
  const recipient = process.argv[2] || process.env.TEST_RECIPIENT_EMAIL || 'skillsync1209@gmail.com';
  console.log('====================================================');
  console.log('📧 TESTING REAL OTP EMAIL DISPATCH VIA GMAIL REST API');
  console.log('====================================================');
  console.log(`Sender:    ${process.env.GMAIL_SENDER_EMAIL || 'skillsync1209@gmail.com'}`);
  console.log(`Recipient: ${recipient}`);
  console.log('----------------------------------------------------');

  const testOtp = Math.floor(100000 + Math.random() * 900000).toString();

  const success = await sendVerificationOtpEmail({
    recipientEmail: recipient,
    recipientName: 'SkillSync Student',
    otp: testOtp
  });

  if (success) {
    console.log(`\n🎉 SUCCESS: OTP verification email dispatched to ${recipient}!`);
    console.log('   Check the inbox to verify formatting and delivery.');
  } else {
    console.log('\n❌ FAILED: Email dispatch did not succeed.');
    console.log('   Verify that GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN in server/.env are valid.');
  }
  process.exit(success ? 0 : 1);
}

testOtpEmail();
