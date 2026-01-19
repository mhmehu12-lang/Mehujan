const axios = require("axios");

module.exports.config = {
  name: "fbcover",
  version: "6.9",
  hasPermssion: 0,
  credits: "MOHAMMAD AKASH x unknow",
  description: "Facebook cover generate",
  commandCategory: "AI",
  usages: "v1/v2/v3 - name - title - address - email - phone - color",
  cooldowns: 5
};

module.exports.run = async function ({ api, event, args, Users }) {
  const { threadID, messageID, senderID, messageReply, type, mentions } = event;

  // Base API URL আনার ফাংশন
  const baseApiUrl = async () => {
    try {
      const base = await axios.get(
        `https://raw.githubusercontent.com/Mostakim0978/D1PT0/refs/heads/main/baseApiUrl.json`
      );
      return base.data.api;
    } catch (e) {
      return "https://api.dipto-api.xyz"; // ব্যাকআপ API ইউআরএল
    }
  };

  let uid;
  if (type === "message_reply") {
    uid = messageReply.senderID;
  } else if (Object.keys(mentions).length > 0) {
    uid = Object.keys(mentions)[0];
  } else {
    uid = senderID;
  }

  // ইউজার নেম নেওয়া
  let userName = "User";
  try {
    userName = await Users.getNameUser(uid);
  } catch (e) {
    userName = "Facebook User";
  }

  const input = args.join(" ");
  if (!input) {
    return api.sendMessage(
      `❌| ভুল ফরম্যাট!\nব্যবহার করুন: !fbcover v1 - নাম - পদবি - ঠিকানা - ইমেইল - ফোন - রঙ`,
      threadID,
      messageID
    );
  }

  const msg = input.split("-");
  const v = msg[0]?.trim() || "v1";
  const name = msg[1]?.trim() || " ";
  const subname = msg[2]?.trim() || " ";
  const address = msg[3]?.trim() || " ";
  const email = msg[4]?.trim() || " ";
  const phone = msg[5]?.trim() || " ";
  const color = msg[6]?.trim() || "white";

  api.sendMessage(
    `Processing your cover, wait koro baby 😘`,
    threadID,
    (err, info) => {
      if (!err) {
        setTimeout(() => api.unsendMessage(info.messageID), 4000);
      }
    },
    messageID
  );

  try {
    const baseUrl = await baseApiUrl();
    const imgUrl = `${baseUrl}/cover/${v}?name=${encodeURIComponent(name)}&subname=${encodeURIComponent(subname)}&number=${encodeURIComponent(phone)}&address=${encodeURIComponent(address)}&email=${encodeURIComponent(email)}&colour=${encodeURIComponent(color)}&uid=${uid}`;

    const response = await axios.get(imgUrl, { responseType: "stream" });

    return api.sendMessage(
      {
        body:
          `✿━━━━━━━━━━━━━━━━━━━━✿\n` +
          `🔵 FIRST NAME: ${name}\n` +
          `⚫ SECOND NAME: ${subname}\n` +
          `⚪ ADDRESS: ${address}\n` +
          `📫 MAIL: ${email}\n` +
          `☎️ PHONE NO.: ${phone}\n` +
          `☢️ COLOR: ${color}\n` +
          `💁 USER: ${userName}\n` +
          `✅ Version: ${v}\n` +
          `✿━━━━━━━━━━━━━━━━━━━━✿`,
        attachment: response.data
      },
      threadID,
      messageID
    );
  } catch (error) {
    console.error(error);
    return api.sendMessage(
      "❌ কভার তৈরি করতে সমস্যা হয়েছে। API ডাউন থাকতে পারে।",
      threadID,
      messageID
    );
  }
};
