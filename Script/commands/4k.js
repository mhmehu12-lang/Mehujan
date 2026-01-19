const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

module.exports.config = {
  name: "4k",
  version: "1.0.1",
  hasPermssion: 0,
  credits: "SHAHADAT SAHU",
  description: "Enhance Photo - Reply to an image to upscale",
  commandCategory: "Image Editing Tools",
  usages: "Reply to an image",
  cooldowns: 5
};

module.exports.run = async ({ api, event }) => {
  const { threadID, messageID, messageReply, type } = event;

  // চেক করা হচ্ছে রিপ্লাই দেওয়া হয়েছে কি না এবং সেটি ফটো কি না
  if (type !== "message_reply" || !messageReply.attachments || messageReply.attachments[0].type !== "photo") {
    return api.sendMessage("📸 Please reply to an image to enhance it!", threadID, messageID);
  }

  const cacheDir = path.join(__dirname, "cache");
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
  const tempPath = path.join(cacheDir, `4k_${Date.now()}.jpg`);

  const imgUrl = messageReply.attachments[0].url;

  try {
    const wait = await api.sendMessage("⏳ Enhancing your photo in 4K... Please wait.", threadID);

    // API URL কনফিগ ফাইল থেকে আনা
    const configUrl = "https://raw.githubusercontent.com/shahadat-sahu/SAHU-API/refs/heads/main/SAHU-API.json";
    const apiConfig = await axios.get(configUrl);
    const apiUrl = apiConfig.data["4k"];

    if (!apiUrl) throw new Error("API URL not found in config");

    // ইমেজ এনহ্যান্স করা
    const enhanceUrl = `${apiUrl}?imageUrl=${encodeURIComponent(imgUrl)}`;
    const res = await axios.get(enhanceUrl);
    const resultImg = res.data?.result;

    if (!resultImg) throw new Error("Enhanced image URL not found");

    // ইমেজ ডাউনলোড করা
    const imageResponse = await axios.get(resultImg, { responseType: "arraybuffer" });
    fs.writeFileSync(tempPath, Buffer.from(imageResponse.data, "binary"));

    // মেসেজ পাঠানো
    await api.sendMessage({
      body: "✔️ 4K Enhance Successful!",
      attachment: fs.createReadStream(tempPath)
    }, threadID, () => {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }, messageID);

    // লোডিং মেসেজ আনসেন্ড করা
    return api.unsendMessage(wait.messageID);

  } catch (e) {
    console.error(e);
    return api.sendMessage("❌ API Error! Please try again later or contact the developer.", threadID, messageID);
  }
};
