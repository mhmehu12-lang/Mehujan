const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const { createCanvas, loadImage } = require("canvas");

// ব্যালেন্স ফাইল হ্যান্ডেলিং
const balancePath = path.join(__dirname, "cache", "coinxbalance.json");
if (!fs.existsSync(balancePath)) {
    if (!fs.existsSync(path.join(__dirname, "cache"))) fs.mkdirSync(path.join(__dirname, "cache"));
    fs.writeFileSync(balancePath, JSON.stringify({}, null, 2));
}

function getBalance(userID) {
    const data = JSON.parse(fs.readFileSync(balancePath));
    if (data[userID]?.balance != null) return data[userID].balance;
    return 100;
}

function setBalance(userID, balance) {
    const data = JSON.parse(fs.readFileSync(balancePath));
    data[userID] = { balance };
    fs.writeFileSync(balancePath, JSON.stringify(data, null, 2));
}

async function loadUserDP(uid) {
    try {
        const url = `https://graph.facebook.com/${uid}/picture?height=1500&width=1500&access_token=6628568379|c1e620fa708a1d5696fb991c1bde5662`;
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        return await loadImage(Buffer.from(response.data));
    } catch (e) {
        return await loadImage("https://i.postimg.cc/kgjgP6QX/messenger-dp.png");
    }
}

function drawBubble(ctx, x, y, w, h, color, tailLeft = true) {
    const radius = 40;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.fill();

    if (tailLeft) {
        ctx.beginPath();
        ctx.moveTo(x, y + 60);
        ctx.lineTo(x - 38, y + 90);
        ctx.lineTo(x, y + 120);
        ctx.closePath();
        ctx.fill();
    } else {
        ctx.beginPath();
        ctx.moveTo(x + w, y + 60);
        ctx.lineTo(x + w + 38, y + 90);
        ctx.lineTo(x + w, y + 120);
        ctx.closePath();
        ctx.fill();
    }
}

module.exports.config = {
    name: "fakechat",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "MOHAMMAD AKASH",
    description: "Messenger FakeChat Dark Mode",
    commandCategory: "fun",
    usages: "@mention - text1 - [text2]",
    cooldowns: 5
};

module.exports.run = async function ({ api, event, args, Users }) {
    const { threadID, messageID, senderID, mentions } = event;

    if (args.length < 2) return api.sendMessage("ব্যবহার করার নিয়ম:\n!fakechat @mention - মেসেজ ১ - মেসেজ ২", threadID, messageID);

    const input = args.join(" ").split("-").map(a => a.trim());
    let [target, text1, text2 = ""] = input;

    let uid;
    if (Object.keys(mentions).length > 0) {
        uid = Object.keys(mentions)[0];
    } else if (/^\d{6,}$/.test(args[0])) {
        uid = args[0];
    } else {
        return api.sendMessage("❌ দয়া করে কাউকে মেনশন করুন বা সঠিক UID দিন!", threadID, messageID);
    }

    // ব্যালেন্স চেক
    let bal = getBalance(senderID);
    const cost = 50;
    if (bal < cost) return api.sendMessage("❌ আপনার পর্যাপ্ত ব্যালেন্স নেই (৫০ কয়েন প্রয়োজন)", threadID, messageID);
    setBalance(senderID, bal - cost);

    try {
        const name = await Users.getNameUser(uid) || "User";
        const dp = await loadUserDP(uid);

        const width = 1080, height = 700; // উচ্চতা একটু কমানো হয়েছে দেখতে সুন্দর লাগার জন্য
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext("2d");

        // Background
        ctx.fillStyle = "#18191A";
        ctx.fillRect(0, 0, width, height);

        // Profile Picture
        ctx.save();
        ctx.beginPath();
        ctx.arc(120, 180, 90, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(dp, 30, 90, 180, 180);
        ctx.restore();

        // Name & Status
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 50px Arial";
        ctx.fillText(name, 250, 150);
        ctx.fillStyle = "#aaaaaa";
        ctx.font = "35px Arial";
        ctx.fillText("Active now", 250, 205);

        // Receiver Bubble (Left)
        drawBubble(ctx, 100, 300, 600, 140, "#303030", true);
        ctx.fillStyle = "#ffffff";
        ctx.font = "45px Arial";
        ctx.fillText(text1, 140, 385);

        // Sender Bubble (Right)
        if (text2) {
            const bWidth = 600;
            const bX = width - bWidth - 100;
            drawBubble(ctx, bX, 500, bWidth, 140, "#0084FF", false);
            ctx.fillStyle = "#ffffff";
            ctx.font = "45px Arial";
            ctx.fillText(text2, bX + 40, 585);
        }

        const imgPath = path.join(__dirname, "cache", `${senderID}_fchat.png`);
        fs.writeFileSync(imgPath, canvas.toBuffer());

        return api.sendMessage({
            body: "✅ ফেকচ্যাট তৈরি হয়েছে (-৫০ কয়েন)",
            attachment: fs.createReadStream(imgPath)
        }, threadID, () => fs.unlinkSync(imgPath), messageID);

    } catch (error) {
        console.log(error);
        return api.sendMessage("একটি ভুল হয়েছে, আবার চেষ্টা করুন।", threadID, messageID);
    }
};
