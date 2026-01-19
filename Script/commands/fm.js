const axios = require("axios");
const fs = require("fs");
const path = require("path");
const Canvas = require("canvas");

module.exports.config = {
  name: "fm",
  version: "5.3",
  hasPermssion: 0,
  credits: "Helal + Cyber Sujon + Fix & Upgrade by GPT-5",
  description: "Show full group collage with cover group photo and admin list",
  commandCategory: "Group",
  usages: ".fm",
  cooldowns: 10
};

module.exports.run = async function ({ api, event }) {
  try {
    const info = await api.getThreadInfo(event.threadID);
    const groupName = info.threadName || "Unnamed Group";
    const members = info.participantIDs || [];
    const admins = info.adminIDs?.map(a => a.id) || [];
    const groupID = event.threadID;

    api.sendMessage(`🎨 ${groupName} গ্রুপের কোলাজ তৈরি হচ্ছে...`, event.threadID);

    const width = 1920, height = 1080;
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // 🔹 Background gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#0f2027");
    gradient.addColorStop(0.5, "#203a43");
    gradient.addColorStop(1, "#2c5364");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // ✅ Improved & universal group profile/cover picture loader
    let groupPic;
    try {
      const token = "6628568379|c1e620fa708a1d5696fb991c1bde5662";
      let coverUrl;

      // 1️⃣ Try Graph API first
      try {
        const graphUrl = `https://graph.facebook.com/${groupID}?fields=cover,picture&access_token=${token}`;
        const gRes = await axios.get(graphUrl);
        coverUrl =
          gRes.data?.cover?.source ||
          gRes.data?.picture?.data?.url ||
          null;
      } catch (err) {
        console.log("⚠️ Graph থেকে কভার লোড হয়নি:", err.message);
      }

      // 2️⃣ If no image, try Messenger's imageSrc (works for private groups)
      if (!coverUrl && info.imageSrc) {
        coverUrl = info.imageSrc;
        console.log("✅ Messenger imageSrc ব্যবহার করা হলো।");
      }

      // 3️⃣ Fallback default image
      if (!coverUrl) {
        coverUrl = "https://i.imgur.com/0Z8F7jz.png";
        console.log("⚠️ Default fallback ব্যবহার করা হলো।");
      }

      // Load the image
      const imgRes = await axios.get(coverUrl, { responseType: "arraybuffer" });
      groupPic = await Canvas.loadImage(Buffer.from(imgRes.data, "binary"));
    } catch (e) {
      console.log("⚠️ গ্রুপ প্রোফাইল পিকচার লোড হয়নি:", e.message);
      groupPic = await Canvas.loadImage("https://i.imgur.com/0Z8F7jz.png");
    }

    // 🔹 Draw group profile picture
    if (groupPic) {
      const picSize = 200;
      const picX = width / 2 - picSize / 2;
      const picY = 20;
      ctx.save();
      ctx.beginPath();
      ctx.arc(picX + picSize / 2, picY + picSize / 2, picSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(groupPic, picX, picY, picSize, picSize);
      ctx.restore();

      // glowing neon border
      ctx.lineWidth = 8;
      ctx.shadowColor = "#00FFB2";
      ctx.shadowBlur = 25;
      ctx.strokeStyle = "#00FFB2";
      ctx.beginPath();
      ctx.arc(picX + picSize / 2, picY + picSize / 2, picSize / 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 🔹 Group name under picture
    ctx.font = "bold 70px Sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(groupName, width / 2, 280);

    // 🔹 Member/Admin count corners
    ctx.font = "bold 40px Sans-serif";
    ctx.fillStyle = "#FFD700";
    ctx.textAlign = "left";
    ctx.fillText(`👑 Admin: ${admins.length}`, 100, 90);

    ctx.textAlign = "right";
    ctx.fillStyle = "#00FFEE";
    ctx.fillText(`👥 Member: ${members.length}`, width - 100, 90);

    // 🔹 Fetch admin names
    let adminNames = [];
    for (const id of admins) {
      try {
        const user = await api.getUserInfo(id);
        const name = user[id]?.name || "Unknown";
        adminNames.push(name);
      } catch {
        adminNames.push("Unknown");
      }
    }

    // 🔹 Draw all member photos
    const radius = 45;
    const margin = 20;
    const perRow = Math.floor(width / (radius * 2 + margin));
    let x = radius + margin, y = 370;

    for (let i = 0; i < members.length; i++) {
      const id = members[i];
      try {
        const imgURL = `https://graph.facebook.com/${id}/picture?width=200&height=200&access_token=6628568379|c1e620fa708a1d5696fb991c1bde5662`;
        const imgData = await axios.get(imgURL, { responseType: "arraybuffer" });
        const img = await Canvas.loadImage(Buffer.from(imgData.data, "binary"));
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, x - radius, y - radius, radius * 2, radius * 2);
        ctx.restore();

        // admin = golden ring
        if (admins.includes(id)) {
          ctx.lineWidth = 4;
          ctx.strokeStyle = "#FFD700";
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.stroke();
        }

        x += radius * 2 + margin;
        if (x + radius > width) {
          x = radius + margin;
          y += radius * 2 + margin;
        }
      } catch (err) {
        console.log("⚠️ Image load failed:", err.message);
      }
    }

    // 🔹 Admin section bottom
    ctx.font = "bold 40px Sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(`👑 Admin List (${adminNames.length})`, width / 2, height - 150);

    ctx.font = "30px Sans-serif";
    const allAdmins = adminNames.join(", ");
    const lines = wrapText(ctx, allAdmins, width - 100);
    let textY = height - 110;
    for (const line of lines) {
      ctx.fillText(line, width / 2, textY);
      textY += 40;
    }

    // 🔹 Save & send
    const outPath = path.join(__dirname, "fm_group_collage.jpg");
    fs.writeFileSync(outPath, canvas.toBuffer("image/jpeg"));

    await api.sendMessage(
      {
        body: `🌸 ${groupName}\n👥 মোট সদস্য: ${members.length}\n👑 অ্যাডমিন (${adminNames.length}): ${adminNames.join(", ")}`,
        attachment: fs.createReadStream(outPath)
      },
      event.threadID
    );

    fs.unlinkSync(outPath);
  } catch (e) {
    console.log(e);
    api.sendMessage("❌ কোলাজ তৈরির সময় সমস্যা হয়েছে।", event.threadID);
  }
};

// 🔸 Helper function for wrapping long text
function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && i > 0) {
      lines.push(line.trim());
      line = words[i] + " ";
    } else {
      line = testLine;
    }
  }
  lines.push(line.trim());
  return lines;
          }
