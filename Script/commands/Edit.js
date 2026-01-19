const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

// Renz API JSON
const noobcore = "https://raw.githubusercontent.com/noobcore404/NC-STORE/main/NCApiUrl.json";

async function getRenzApi() {
  const res = await axios.get(noobcore, { timeout: 10000 });
  if (!res.data?.renz) throw new Error("Renz API not found in JSON");
  return res.data.renz;
}

module.exports.config = {
  name: "edit",
  version: "1.0",
  hasPermssion: 0,
  credits: "rX x AKASH",
  description: "Generate or edit images using text prompts",
  commandCategory: "image",
  usages: "<prompt> | Reply to an image with your prompt",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID, messageReply, type } = event;
  const prompt = args.join(" ").trim();

  if (!prompt) {
    return api.sendMessage(
      "❌ Pʟᴇᴀsᴇ ᴘʀᴏᴠɪᴅᴇ ᴀ ᴘʀᴏᴍᴘᴛ.\n\nExamples:\n!edit a cyberpunk city\n!edit make me anime (reply to an image)",
      threadID,
      messageID
    );
  }

  const loadingMsg = await api.sendMessage("⏳ Pʀᴏᴄᴇssɪɴɢ ʏᴏᴜʀ ɪᴍᴀɢᴇ...", threadID);

  const cacheDir = path.join(__dirname, "cache");
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
  const imgPath = path.join(cacheDir, `${Date.now()}_gptgen.png`);

  try {
    const BASE_URL = await getRenzApi();
    let apiURL = `${BASE_URL}/api/gptimage?prompt=${encodeURIComponent(prompt)}`;

    // Image Edit Logic (If replying to a photo)
    if (type === "message_reply" && messageReply.attachments && messageReply.attachments[0]?.type === "photo") {
      const repliedImage = messageReply.attachments[0];
      apiURL += `&ref=${encodeURIComponent(repliedImage.url)}`;
      if (repliedImage.width && repliedImage.height) {
        apiURL += `&width=${repliedImage.width}&height=${repliedImage.height}`;
      }
    } else {
      // Default generation size
      apiURL += `&width=512&height=512`;
    }

    const res = await axios.get(apiURL, {
      responseType: "arraybuffer",
      timeout: 180000
    });

    fs.writeFileSync(imgPath, Buffer.from(res.data, "utf-8"));

    await api.unsendMessage(loadingMsg.messageID);

    const isEdit = type === "message_reply" && messageReply.attachments?.[0]?.type === "photo";

    return api.sendMessage(
      {
        body: isEdit
          ? `🖌 Image edited successfully.\nPrompt: ${prompt}`
          : `🖼 Image generated successfully.\nPrompt: ${prompt}`,
        attachment: fs.createReadStream(imgPath)
      },
      threadID,
      () => {
        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
      },
      messageID
    );

  } catch (err) {
    console.error("GPTGEN Error:", err?.response?.data || err.message);
    if (loadingMsg.messageID) await api.unsendMessage(loadingMsg.messageID);
    return api.sendMessage("❌ Fᴀɪʟᴇᴅ ᴛᴏ ᴘʀᴏᴄᴇss ɪᴍᴀɢᴇ. Tʜᴇ API ᴍɪɢʜᴛ ʙᴇ ᴅᴏᴡɴ.", threadID, messageID);
  }
};
