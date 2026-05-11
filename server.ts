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
  systemInstruction: "أنت خبير في لعبة الوست السودانية. تساعد اللاعبين في فهم قوانين اللعبة، شرح معنى 'تبويش'، 'جلد'، و'أتو'. أنت تتحدث باللهجة السودانية المحببة والودودة. إذا سألك أحد عن اللعبة، شجعه بمصطلحات سودانية مثل 'يا باشا' و'حريف'. أنت تعطي نصائح احترافية مثل 'سحب الحكم بدري' و'المحافظة على الآسات'."
});

// Initialize dummy DB
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({
    stats: [],
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

  app.use(express.json());

  // --- API Routes ---
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", game: "Sudanese Whist" });
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
