const { sendConnectionRequestEmail } = require('./services/emailService');

async function sendLiveEmailToKrish() {
  console.log("==========================================");
  console.log("🚀 DISPATCHING LIVE EMAIL TO KRISH");
  console.log("==========================================");
  console.log("Recipient: krishmendapara84@gmail.com");

  const success = await sendConnectionRequestEmail({
    recipientEmail: "krishmendapara84@gmail.com",
    recipientName: "Krish",
    senderName: "Priya Patel",
    senderEmail: "priya@gmail.com"
  });

  if (success) {
    console.log("\n🎉 SUCCESS: Live notification email delivered to krishmendapara84@gmail.com!");
  } else {
    console.log("\n❌ Delivery failed. Check logs above.");
  }
  process.exit(0);
}

sendLiveEmailToKrish();
