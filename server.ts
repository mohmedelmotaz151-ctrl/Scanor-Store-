import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import nodemailer from "nodemailer";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

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
      اسم اللاعب: ${order.playerName || 'غير مسجل'}
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
        <p><strong>اسم اللاعب:</strong> ${order.playerName || 'غير مسجل'}</p>
        <p><strong>الباقة:</strong> ${order.amount} + ${order.bonus} شدة</p>
        <p><strong>المبلغ:</strong> ${order.price} ${order.currency}</p>
        <p><strong>وسيلة الدفع:</strong> ${order.paymentMethod === "al_rajhi" ? "مصرف الراجحي" : order.paymentMethod === "bok" ? "بنك الخرطوم" : "دفع إلكتروني (Fatora)"}</p>
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

  // Security Middlewares
  app.use(helmet({
    contentSecurityPolicy: false, // Disable for easier dev/applet integration
  }));
  app.use(cors());
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '10mb' }));

  // Rate Limiting
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { error: "Too many requests, please try again later." },
    validate: { trustProxy: false }
  });

  app.use(generalLimiter);

  const chatLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // Limit each IP to 10 chat requests per minute
    message: { error: "هدئ من روعك! الكثير من الرسائل حالياً." },
    validate: { trustProxy: false }
  });

  const paymentLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5, // Limit each IP to 5 payment attempts per 5 minutes
    message: { error: "محاولات دفع كثيرة. يرجى الانتظار قليلاً." },
    validate: { trustProxy: false }
  });

  // Validation Helper
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // --- API Routes ---
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "Scanor Store" });
  });

  // AI Support Chat
  app.post("/api/support/chat", chatLimiter, async (req, res) => {
    const { message, history } = req.body;
    if (!message || message.length > 500) {
      return res.status(400).json({ error: "الرسالة غير صالحة أو طويلة جداً" });
    }

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

  // Order Notification (Protected)
  app.post("/api/notify-order", async (req, res) => {
    const order = req.body;
    const internalSecret = req.headers['x-internal-secret'];
    
    // Simple protection for internal notification endpoint
    if (process.env.APP_INTERNAL_SECRET && internalSecret !== process.env.APP_INTERNAL_SECRET) {
      return res.status(401).json({ error: "Unauthorized access" });
    }

    if (!order || !order.playerId || !order.amount) {
      return res.status(400).json({ error: "Order details incomplete" });
    }

    try {
      await sendOrderNotification(order);
      res.json({ success: true, message: "Notification sent" });
    } catch (err) {
      console.error("Notification Error:", err);
      res.status(500).json({ error: "Failed to send notification" });
    }
  });

  // Fatora Payment Integration
  app.post("/api/payment/fatora", paymentLimiter, async (req, res) => {
    const { amount, currency, orderId, email, name, phone } = req.body;

    // Basic Validation
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: "المبلغ غير صحيح" });
    }
    if (email && !isValidEmail(email)) {
      return res.status(400).json({ error: "البريد الإلكتروني غير صحيح" });
    }
    if (!orderId) {
      return res.status(400).json({ error: "رقم الطلب مطلوب" });
    }
    
    // Security: Only use environment variable, fail if missing
    const apiKey = process.env.FATORA_API_KEY;

    if (!apiKey) {
      console.error("CRITICAL: FATORA_API_KEY is missing from environment variables");
      return res.status(500).json({ 
        error: "إعدادات بوابة الدفع (API Key) غير مكتملة في الخادم. يرجى التواصل مع الإدارة." 
      });
    }

    // Detect protocol and host properly
    const forwardedProto = req.get('x-forwarded-proto');
    const forwardedHost = req.get('x-forwarded-host');
    
    // Detection of Base URL for callbacks
    // In AI Studio / Cloud Run environments, we usually want https and the forwarded host
    const protocol = forwardedProto || (req.get('host')?.includes('localhost') ? 'http' : 'https');
    const host = forwardedHost || req.get('host');
    const baseUrl = process.env.BASE_URL || `${protocol}://${host}`;

    const fatoraBody = {
      amount: parseFloat(amount),
      currency: currency || "SAR",
      order_id: String(orderId),
      client_name: name || "Customer",
      client_email: email || "customer@example.com",
      client_mobile: phone || "0500000000",
      language: "ar",
      success_url: `${baseUrl}/track?id=${orderId}&payment=success`,
      failure_url: `${baseUrl}/track?id=${orderId}&payment=failed`,
      cancel_url: `${baseUrl}/track?id=${orderId}&payment=cancelled`,
      fatora_note: `Order ${orderId} - ${name}`
    };

    console.log("Initiating Fatora payment to https://api.fatora.io/v1/payments/checkout");
    console.log("Base URL for callbacks:", baseUrl);

    try {
      const response = await fetch("https://api.fatora.io/v1/payments/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${apiKey}`, // Recommended for newer accounts
          "api_key": apiKey // Keeping as fallback
        },
        body: JSON.stringify(fatoraBody),
      });

      const responseText = await response.text();
      console.log(`Fatora API Response Status: ${response.status}`);
      
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Fatora non-JSON response:", responseText);
        let errorHint = "بوابة الدفع ردت باستجابة غير متوقعة.";
        if (responseText.includes("<html") || responseText.includes("<!DOCTYPE")) {
          errorHint = "بوابة الدفع (Fatora) معطلة حالياً أو المسار غير صحيح (404/500).";
        }
        return res.status(500).json({ 
          error: errorHint,
          status: response.status,
          details: responseText.substring(0, 100) 
        });
      }
      
      // Fatora returns checkout_url inside result object on success
      if (data.status === "success" || data.status === true || data.status === 1 || data.result?.checkout_url || data.checkout_url) {
        const checkoutUrl = data.result?.checkout_url || data.checkout_url;
        if (checkoutUrl) {
          console.log("Fatora success, redirecting to:", checkoutUrl);
          res.json({ checkout_url: checkoutUrl });
        } else {
          res.status(400).json({ error: "تم إنشاء الدفع ولكن لم يتم استلام رابط التوجيه", details: data });
        }
      } else {
        console.error("Fatora error response:", JSON.stringify(data, null, 2));
        res.status(400).json({ error: data.message || data.error || "فشل في إنشاء عملية الدفع. تأكد من صحة المفتاح." });
      }
    } catch (err: any) {
      console.error("Fatora Exception:", err);
      res.status(500).json({ error: "حدث خطأ أثناء الاتصال ببوابة الدفع: " + err.message });
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
