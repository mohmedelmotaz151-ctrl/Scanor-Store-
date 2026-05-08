import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, "db.json");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash",
  systemInstruction: "You are Scanor Support AI. You help users with PUBG UC shipping questions. Scanor Store offers fast delivery (seconds), secure payment (Mada, Apple Pay, STC Pay, Visa), and best prices (Official store price + 2% profit). Currencies supported: SAR and SDG. If a user asks about order status, tell them to use the 'Track Order' page with their Order ID. Be polite and professional in Arabic."
});

// Initialize dummy DB if not exists
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({
    orders: [],
    packages: [
      { id: "uc_60", amount: 60, price_sar: 3.80, price_sdg: 2280, bonus: 0, image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&q=80" },
      { id: "uc_300", amount: 300, price_sar: 19.15, price_sdg: 11490, bonus: 25, image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&q=80" },
      { id: "uc_600", amount: 600, price_sar: 38.25, price_sdg: 22950, bonus: 60, image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&q=80" },
      { id: "uc_1500", amount: 1500, price_sar: 95.65, price_sdg: 57390, bonus: 300, image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&q=80" },
      { id: "uc_3000", amount: 3000, price_sar: 191.25, price_sdg: 114750, bonus: 850, image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&q=80" },
      { id: "uc_6000", amount: 6000, price_sar: 382.50, price_sdg: 229500, bonus: 2100, image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&q=80" },
    ],
    users: [],
    coupons: [
      { code: "SCANOR10", discount: 0.1 }
    ],
    support_chats: [],
    agents: [
      { id: "agent_1", name: "المعتز", email: "admin@scanor.com" },
      { id: "agent_2", name: "سارة (الدعم الفني)", email: "tech@scanor.com" }
    ]
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

  app.use(express.json());

  // --- API Routes ---

  // Mock OTP Store
  const otps = new Map<string, { code: string, expires: number }>();

  app.post("/api/auth/send-otp", (req, res) => {
    const { target } = req.body; // email or phone
    if (!target) return res.status(400).json({ error: "Target is required" });
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otps.set(target, { code, expires: Date.now() + 5 * 60 * 1000 });
    
    console.log(`[OTP] Sent to ${target}: ${code}`);
    res.json({ message: "OTP sent successfully (Check console in dev mode)" });
  });

  app.post("/api/auth/verify-otp", (req, res) => {
    const { target, code } = req.body;
    const stored = otps.get(target);
    
    if (stored && stored.code === code && stored.expires > Date.now()) {
      otps.delete(target);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: "Invalid or expired OTP" });
    }
  });

  // Support System Endpoints
  app.get("/api/admin/chats", (req, res) => {
    const db = readDB();
    res.json(db.support_chats);
  });

  app.get("/api/chats/:email", (req, res) => {
    const { email } = req.params;
    const db = readDB();
    let chat = db.support_chats.find((c: any) => c.userEmail === email);
    
    if (!chat) {
      chat = {
        id: "chat_" + Math.random().toString(36).substr(2, 9),
        userEmail: email,
        status: "active", // active (ai), waiting (for agent), talking (with agent)
        assignedTo: null,
        messages: []
      };
      db.support_chats.push(chat);
      writeDB(db);
    }
    res.json(chat);
  });

  app.post("/api/chats/:email/messages", (req, res) => {
    const { email } = req.params;
    const { role, text } = req.body; // role: user, agent, ai
    const db = readDB();
    const chat = db.support_chats.find((c: any) => c.userEmail === email);
    
    if (!chat) return res.status(404).json({ error: "Chat not found" });
    
    const msg = {
      role,
      text,
      timestamp: new Date().toISOString()
    };
    
    chat.messages.push(msg);
    writeDB(db);
    res.json(msg);
  });

  app.patch("/api/chats/:email/status", (req, res) => {
    const { email } = req.params;
    const { status, assignedTo } = req.body;
    const db = readDB();
    const chat = db.support_chats.find((c: any) => c.userEmail === email);
    
    if (!chat) return res.status(404).json({ error: "Chat not found" });
    
    if (status) chat.status = status;
    if (assignedTo !== undefined) chat.assignedTo = assignedTo;
    
    writeDB(db);
    res.json(chat);
  });

  app.get("/api/admin/agents", (req, res) => {
    const db = readDB();
    res.json(db.agents || []);
  });

  app.get("/api/admin/user-orders/:email", (req, res) => {
    const { email } = req.params;
    const db = readDB();
    const userOrders = db.orders.filter((o: any) => o.email === email);
    res.json(userOrders);
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
      res.status(500).json({ error: "Failed to connect to Scanor AI" });
    }
  });

  // Get all packages
  app.get("/api/packages", (req, res) => {
    const db = readDB();
    res.json(db.packages);
  });

  // Create an order
  app.post("/api/orders", (req, res) => {
    const { playerId, packageId, paymentMethod, email, currency, price } = req.body;
    
    if (!playerId || !packageId || !paymentMethod || !email) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const db = readDB();
    const pkg = db.packages.find((p: any) => p.id === packageId);
    
    if (!pkg) {
      return res.status(404).json({ error: "Package not found" });
    }

    const newOrder = {
      id: "ORD-" + Math.random().toString(36).substr(2, 9).toUpperCase(),
      playerId,
      packageId,
      packageName: `${pkg.amount} UC`,
      price: price || (currency === 'SDG' ? pkg.price_sdg : pkg.price_sar),
      currency: currency || 'SAR',
      status: "pending",
      paymentMethod,
      email,
      createdAt: new Date().toISOString()
    };

    db.orders.push(newOrder);
    writeDB(db);

    res.json(newOrder);
  });

  // Get order status
  app.get("/api/orders/:id", (req, res) => {
    const db = readDB();
    const order = db.orders.find((o: any) => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  });

  // Admin: Get all orders
  app.get("/api/admin/orders", (req, res) => {
    const db = readDB();
    res.json(db.orders);
  });

  // Admin: Update order status
  app.patch("/api/admin/orders/:id", (req, res) => {
    const { status } = req.body;
    const db = readDB();
    const index = db.orders.findIndex((o: any) => o.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Order not found" });
    
    db.orders[index].status = status;
    writeDB(db);
    res.json(db.orders[index]);
  });

  // Admin: Dashboard stats
  app.get("/api/admin/stats", (req, res) => {
    const db = readDB();
    const totalEarnings = db.orders
      .filter((o: any) => o.status === "completed")
      .reduce((sum: number, o: any) => sum + o.price, 0);
    
    res.json({
      totalOrders: db.orders.length,
      pendingOrders: db.orders.filter((o: any) => o.status === "pending").length,
      completedOrders: db.orders.filter((o: any) => o.status === "completed").length,
      totalEarnings
    });
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
    console.log(`Scanor STORE Server running on http://localhost:${PORT}`);
  });
}

startServer();
