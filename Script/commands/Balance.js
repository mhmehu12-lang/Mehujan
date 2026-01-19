const { createCanvas } = require('canvas');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const API_URL = "https://balance-bot-api.onrender.com";

async function getBalance(userID) {
    try {
        const response = await axios.get(`${API_URL}/api/balance/${userID}`, { timeout: 5000 });
        return response.data.balance || 100;
    } catch (error) {
        return 100;
    }
}

async function transferBalance(senderID, receiverID, amount) {
    try {
        const response = await axios.post(`${API_URL}/api/balance/transfer`, {
            senderID, receiverID, amount
        });
        return response.data;
    } catch (error) {
        return { success: false, message: "API connection failed." };
    }
}

function formatBalance(num) {
    return num.toLocaleString('en-US') + " $";
}

function getCardType(balance) {
    if (balance >= 1000000) return { type: "SAPPHIRE", color: "#0F52BA" };
    if (balance >= 250000) return { type: "GOLD", color: "#FFD700" };
    if (balance >= 100000) return { type: "SILVER", color: "#C0C0C0" };
    if (balance >= 50000) return { type: "PLATINUM", color: "#E5E4E2" };
    if (balance >= 10000) return { type: "CLASSIC", color: "#4169E1" };
    return { type: "STANDARD", color: "#808080" };
}

module.exports.config = {
    name: "balance",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "MOHAMMAD AKASH",
    description: "Check balance with a custom bank card",
    commandCategory: "economy",
    usages: "[transfer @mention amount] or leave blank",
    cooldowns: 5
};

module.exports.run = async function ({ api, event, args, Users }) {
    const { threadID, senderID, messageID, mentions } = event;
    const cacheDir = path.join(__dirname, 'cache');
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    // --- Transfer Logic ---
    if (args[0] === "transfer") {
        if (Object.keys(mentions).length === 0) return api.sendMessage("দয়া করে যাকে পাঠাবেন তাকে মেনশন করুন।", threadID, messageID);
        
        const targetID = Object.keys(mentions)[0];
        const amount = parseFloat(args[args.length - 1]);
        
        if (isNaN(amount) || amount <= 0) return api.sendMessage("টাকার পরিমাণ সঠিক নয়।", threadID, messageID);
        if (targetID === senderID) return api.sendMessage("নিজেকে টাকা পাঠানো সম্ভব নয়।", threadID, messageID);

        const res = await transferBalance(senderID, targetID, amount);
        if (!res.success) return api.sendMessage(`❌ ব্যর্থ হয়েছে: ${res.message}`, threadID, messageID);

        const senderName = await Users.getNameUser(senderID);
        const receiverName = await Users.getNameUser(targetID);
        
        return api.sendMessage(
            `✅ লেনদেন সফল!\n━━━━━━━━━━━━━━━━\n📤 প্রেরক: ${senderName}\n📥 প্রাপক: ${receiverName}\n💰 পরিমাণ: ${formatBalance(amount)}\n💳 বর্তমান ব্যালেন্স: ${formatBalance(res.senderBalance)}`,
            threadID, messageID
        );
    }

    // --- Card Generation Logic ---
    try {
        const balance = await getBalance(senderID);
        const userName = await Users.getNameUser(senderID);
        const cardInfo = getCardType(balance);
        const cardNumber = senderID.toString().padStart(16, '0').replace(/(.{4})/g, '$1  ').trim();
        const cvv = Math.floor(Math.random() * 899) + 100;

        const width = 850, height = 500;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Background & Card Design
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#111111';
        roundRect(ctx, 20, 20, width - 40, height - 40, 30, true);

        // Text: Global Bank
        ctx.font = 'bold 40px Arial';
        ctx.fillStyle = '#00d4ff';
        ctx.fillText('GLOBAL BANK', 60, 80);

        // Card Number
        ctx.font = '35px Courier New';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(cardNumber, 60, 200);

        // Balance Section
        ctx.fillStyle = 'rgba(0, 212, 255, 0.1)';
        roundRect(ctx, 500, 50, 300, 100, 15, true);
        ctx.font = '20px Arial';
        ctx.fillStyle = '#00d4ff';
        ctx.fillText('AVAILABLE BALANCE', 520, 85);
        ctx.font = 'bold 35px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(formatBalance(balance), 520, 130);

        // Holder Name
        ctx.font = '18px Arial';
        ctx.fillStyle = '#AAAAAA';
        ctx.fillText('CARD HOLDER', 60, 300);
        ctx.font = 'bold 28px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(userName.toUpperCase().substring(0, 20), 60, 340);

        // Expiry & CVV
        ctx.font = '18px Arial';
        ctx.fillStyle = '#AAAAAA';
        ctx.fillText('VALID THRU', 60, 400);
        ctx.fillText('CVV', 250, 400);
        ctx.font = 'bold 22px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('12/28', 60, 430);
        ctx.fillText(cvv.toString(), 250, 430);

        // Card Type Badge
        ctx.fillStyle = cardInfo.color;
        roundRect(ctx, 650, 400, 150, 50, 10, true);
        ctx.font = 'bold 22px Arial';
        ctx.fillStyle = '#000';
        ctx.fillText(cardInfo.type, 670, 435);

        // Chip
        ctx.fillStyle = '#FFD700';
        roundRect(ctx, 60, 110, 80, 55, 10, true);

        const filePath = path.join(cacheDir, `card_${senderID}.png`);
        fs.writeFileSync(filePath, canvas.toBuffer('image/png'));

        return api.sendMessage({
            body: `💳 আপনার ডিজিটাল ব্যাংক কার্ড, ${userName}!`,
            attachment: fs.createReadStream(filePath)
        }, threadID, () => fs.unlinkSync(filePath), messageID);

    } catch (e) {
        console.error(e);
        api.sendMessage("কার্ড তৈরি করতে সমস্যা হয়েছে।", threadID, messageID);
    }
};

function roundRect(ctx, x, y, w, h, r, fill = false) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    if (fill) ctx.fill();
}
