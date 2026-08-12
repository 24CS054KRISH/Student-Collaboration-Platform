const {
  sendConnectionRequestEmail,
  sendConnectionAcceptedEmail,
  sendProjectJoinEmail
} = require('./services/emailService');

async function testEmailService() {
  console.log("🚀 Testing Email Service Non-Blocking Safe Execution...");
  
  // Attempt to send connection request email (should safely log info & return false if credentials empty)
  const reqRes = await sendConnectionRequestEmail({
    recipientEmail: "testrecipient@example.com",
    recipientName: "Test Student",
    senderName: "Aarav Sharma",
    senderEmail: "aarav@example.com"
  });
  console.log("Connection Request Email Result:", reqRes ? "SUCCESS" : "SKIPPED/FAILED SAFELY (EXPECTED IF NO ENV TOKENS YET)");

  const accRes = await sendConnectionAcceptedEmail({
    recipientEmail: "testsender@example.com",
    recipientName: "Aarav Sharma",
    accepterName: "Priya Patel"
  });
  console.log("Connection Accepted Email Result:", accRes ? "SUCCESS" : "SKIPPED/FAILED SAFELY (EXPECTED IF NO ENV TOKENS YET)");

  console.log("✅ Email service tests completed without throwing uncaught exceptions!");
  process.exit(0);
}

testEmailService();
