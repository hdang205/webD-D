import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import authRoutes from "./src/server/routes/authRoutes.js";
import categoryRoutes from "./src/server/routes/categoryRoutes.js";
import productRoutes from "./src/server/routes/productRoutes.js";
import customerRoutes from "./src/server/routes/customerRoutes.js";
import supplierRoutes from "./src/server/routes/supplierRoutes.js";
import employeeRoutes from "./src/server/routes/employeeRoutes.js";
import purchaseRoutes from "./src/server/routes/purchaseRoutes.js";
import salesRoutes from "./src/server/routes/salesRoutes.js";
import inventoryRoutes from "./src/server/routes/inventoryRoutes.js";
import dashboardRoutes from "./src/server/routes/dashboardRoutes.js";

dotenv.config();

// Đảm bảo đường dẫn làm việc là canonical realpath (tránh lỗi Windows junction)
try {
  const realCwd = fs.realpathSync(process.cwd());
  if (realCwd !== process.cwd()) {
    process.chdir(realCwd);
  }
} catch {
  // ignore
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '10mb' }));

  // Initialize Gemini API client lazily when requested
  const getAiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Chưa cấu hình GEMINI_API_KEY trong môi trường hoặc Secrets.");
    }
    return new GoogleGenAI({ apiKey });
  };

  // API Route: AI Accounting Assistant & Auto-Journal Entry Suggester
  app.post("/api/ai-assistant", async (req, res) => {
    try {
      const { prompt, type, contextData } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Vui lòng nhập nội dung yêu cầu." });
      }

      const ai = getAiClient();

      let systemInstruction = `Bạn là Trợ lý Kế toán Trưởng & Cố vấn Quản lý Cửa Hàng Thời Trang Chuyên Nghiệp tại Việt Nam (áp dụng Thông tư 133/2016/TT-BTC và 200/2014/TT-BTC).
Nhiệm vụ của bạn là giải đáp thắc mắc về bán lẻ thời trang, tư vấn quản lý tồn kho theo mẫu mã/size/màu, tính biên lợi nhuận thời trang, công nợ xưởng may/khách VIP, nghiệp vụ kế toán thu chi sổ quỹ, định khoản Nợ/Có và phân tích sức khỏe tài chính cửa hàng thời trang.
Trả lời bằng tiếng Việt chuyên nghiệp, ngắn gọn, chính xác, trực quan, dùng bảng biểu nếu cần định khoản hoặc phân tích số liệu.`;

      if (type === 'suggest_entry') {
        systemInstruction += `
Nhiệm vụ cụ thể: Hãy phân tích mô tả giao dịch hoặc thông tin hóa đơn được cung cấp và trả về cấu trúc định khoản đề xuất dạng JSON chuẩn:
{
  "description": "Tên nghiệp vụ tóm tắt",
  "entries": [
    { "accountCode": "TK Nợ", "accountName": "Tên tài khoản Nợ", "type": "DEBIT", "amountRatio": 1.0 },
    { "accountCode": "TK Có", "accountName": "Tên tài khoản Có", "type": "CREDIT", "amountRatio": 1.0 }
  ],
  "vatRate": 10,
  "explanation": "Giải thích ngắn gọn căn cứ hạch toán theo Thông tư 200/133"
}`;
      }

      const userContent = contextData 
        ? `Nội dung yêu cầu: ${prompt}\n\nDữ liệu bối cảnh tài chính hiện tại của doanh nghiệp:\n${JSON.stringify(contextData, null, 2)}`
        : prompt;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: userContent,
        config: {
          systemInstruction,
          temperature: 0.2,
        },
      });

      const responseText = response.text || "Không nhận được phản hồi từ AI.";
      return res.json({ result: responseText });
    } catch (error: any) {
      console.error("Lỗi AI Assistant API:", error);
      return res.status(500).json({ 
        error: error.message || "Có lỗi xảy ra khi xử lý yêu cầu AI." 
      });
    }
  });

  // Mount Authentication & Master Data CRUD API routes
  app.use("/api/auth", authRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/customers", customerRoutes);
  app.use("/api/suppliers", supplierRoutes);
  app.use("/api/employees", employeeRoutes);
  app.use("/api/purchases", purchaseRoutes);
  app.use("/api/sales", salesRoutes);
  app.use("/api/inventory", inventoryRoutes);
  app.use("/api/dashboard", dashboardRoutes);

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", app: "D&D Fashion ERP Enterprise Management", database: "connected" });
  });

  app.get("/api/health/auth", (_req, res) => {
    res.json({ status: "ok", auth: "active", engine: "JWT + Bcrypt" });
  });

  // Chặn tất cả các endpoint /api/* không tồn tại để luôn trả về JSON thay vì HTML từ Vite
  app.all("/api/*", (req, res) => {
    res.status(404).json({
      success: false,
      message: `API endpoint không tồn tại: ${req.method} ${req.originalUrl}`
    });
  });

  // Global error handler - Đảm bảo luôn trả về JSON nếu có ngoại lệ
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Lỗi Express:", err);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi máy chủ."
    });
  });

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server D&D Fashion ERP đang chạy tại: http://localhost:${PORT}`);
  });
}

startServer();
