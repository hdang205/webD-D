import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
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
import debtRoutes from "./src/server/routes/debtRoutes.js";

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
  app.use("/api/debts", debtRoutes);

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
