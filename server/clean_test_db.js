const mongoose = require("mongoose");

async function clean() {
  await mongoose.connect("mongodb://127.0.0.1:27017/student-collaboration-platform");
  const ConnectionRequest = mongoose.model("ConnectionRequest", new mongoose.Schema({
    sender: mongoose.Schema.Types.ObjectId,
    receiver: mongoose.Schema.Types.ObjectId,
    status: String
  }));

  const res = await ConnectionRequest.deleteMany({
    $or: [
      { sender: "6a71d73a40398d806c74fbd8", receiver: "6a71d78640398d806c74fbd9" },
      { sender: "6a71d78640398d806c74fbd9", receiver: "6a71d73a40398d806c74fbd8" }
    ]
  });

  console.log("Cleaned test connection records:", res.deletedCount);
  await mongoose.disconnect();
}

clean();
