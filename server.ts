import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import nodemailer from "nodemailer";

const __dirname = process.cwd();
const DB_FILE = path.join(__dirname, "db.json");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash",
  systemInstruction: "أنت مساعد الدعم الفني لمتجر سكانور (Scanor Store). المتجر متخصص في شحن شدات ببجي موبايل (UC). أنت تتحدث باللهجة السعودية أو السودانية حسب لهجة العميل، بأسلوب مهذب واحترافي. قدم المساعدة بخصوص طرق الدفع (بنك الراجحي، بنك الخرطوم)، وكيفية العثور على Player ID، وتتبع الطلبات. أسعارنا منافسة جداً (أرباح المتجر 2% فقط). التوصيل فوري وتلقائي."
});

// Nodemailer setup
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendOrderNotification(order: any) {
  const adminEmail = process.env.NOTIFICATION_EMAIL || "mohmedelmotaz151@gmail.com";
  
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log("Email credentials missing. Notification would be sent to:", adminEmail);
    console.log("Order Data:", JSON.stringify(order, null, 2));
    return;
  }

  const mailOptions: any = {
    from: `"Scanor Store" <${process.env.EMAIL_USER}>`,
    to: adminEmail,
    subject: `طلب جديد - ${order.amount} شدة`,
    text: `
      تم استلام طلب جديد:
      ID اللاعب: ${order.playerId}
      الباقة: ${order.amount} + ${order.bonus} شدة
      المبلغ: ${order.price} ${order.currency}
      وسيلة الدفع: ${order.paymentMethod}
      البريد: ${order.email}
      الهاتف: ${order.phone}
      ID الطلب: ${order.id}
    `,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="color: #f59e0b;">طلب جديد في Scanor Store</h2>
        <hr/>
        <p><strong>ID اللاعب:</strong> ${order.playerId}</p>
        <p><strong>الباقة:</strong> ${order.amount} + ${order.bonus} شدة</p>
        <p><strong>المبلغ:</strong> ${order.price} ${order.currency}</p>
        <p><strong>وسيلة الدفع:</strong> ${order.paymentMethod === "al_rajhi" ? "مصرف الراجحي" : "بنك الخرطوم"}</p>
        <p><strong>البريد:</strong> ${order.email}</p>
        <p><strong>الهاتف:</strong> ${order.phone}</p>
        <p><strong>ID الطلب في قاعدة البيانات:</strong> ${order.id}</p>
        <hr/>
        <p style="color: #666; font-size: 12px;">تم إرسال هذا الإشعار تلقائياً.</p>
      </div>
    `,
    attachments: order.receiptImage ? [
      {
        filename: `receipt_${order.id || Date.now()}.png`,
        path: order.receiptImage
      }
    ] : []
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.response);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

// Initialize dummy DB
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({
    orders: [],
    support_chats: []
  }, null, 2));
}

function readDB() {
  return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
}

function writeDB(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // --- API Routes ---
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "Scanor Store" });
  });

  // AI Support Chat
  app.post("/api/support/chat", async (req, res) => {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    try {
      const chat = model.startChat({
        history: history || [],
      });

      const result = await chat.sendMessage(message);
      const response = await result.response;
      res.json({ text: response.text() });
    } catch (err) {
      console.error("Gemini Error:", err);
      res.status(500).json({ error: "فشل الاتصال بذكاء الوست" });
    }
  });

  // Order Notification
  app.post("/api/notify-order", async (req, res) => {
    const order = req.body;
    if (!order) return res.status(400).json({ error: "Order details required" });

    try {
      await sendOrderNotification(order);
      res.json({ success: true, message: "Notification sent" });
    } catch (err) {
      console.error("Notification Error:", err);
      res.status(500).json({ error: "Failed to send notification" });
    }
  });

  // --- Vite / Static Handling ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Sudanese Games Server running on http://localhost:${PORT}`);
  });
}

startServer();
