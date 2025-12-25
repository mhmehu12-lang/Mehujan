const axios = require("axios");

module.exports.config = {
  name: "prompt",
  version: "1.1.0",
  hasPermssion: 0,
  credits: "SHAHADAT SAHU",
  description: "Generate precise English prompt from replied image",
  commandCategory: "AI",
  usages: "[reply image]",
  cooldowns: 5,
  usePrefix: true
};

const API_HUB =
  "https://raw.githubusercontent.com/shahadat-sahu/SAHU-API/main/SAHU-API.json";

module.exports.run = async function ({ api, event }) {
  try {
    if (!event.messageReply?.attachments?.length) {
      return api.sendMessage("Please reply to a photo.....", event.threadID, event.messageID);
    }

    const attachment = event.messageReply.attachments[0];
    if (attachment.type !== "photo") {
      return api.sendMessage("Please reply to a photo.....", event.threadID, event.messageID);
    }

    let promptURL;
    try {
      const hub = await axios.get(API_HUB);
      promptURL = hub.data.prompt;
      if (!promptURL) {
        return api.sendMessage("Prompt API missing......", event.threadID, event.messageID);
      }
    } catch {
      return api.sendMessage("Failed to load API......", event.threadID, event.messageID);
    }

    const waitMsg = await api.sendMessage("⏳ Generating prompt...", event.threadID);

    const img = await axios.get(attachment.url, { responseType: "arraybuffer" });
    const base64 = Buffer.from(img.data).toString("base64");

    const res = await axios.post(
      promptURL,
      {
        image: "data:image/jpeg;base64," + base64,
        language: "en"
      },
      { timeout: 20000 }
    );

    const output = res.data?.prompt || "No prompt generated.";

    if (waitMsg?.messageID) {
      api.unsendMessage(waitMsg.messageID);
    }

    return api.sendMessage(output, event.threadID, event.messageID);

  } catch (err) {
    return api.sendMessage(
      "API Error call Boss SAHU 😣: " + err.message,
      event.threadID,
      event.messageID
    );
  }
};
