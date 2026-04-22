import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Get Demand Data
  app.get("/api/data", (req, res) => {
    const stores = ["ST_001", "ST_002", "ST_003"];
    const products = ["PRD_001", "PRD_002", "PRD_003", "PRD_004", "PRD_005"];
    const historyDays = 90;
    const data = [];

    const now = new Date();
    for (let d = historyDays; d >= 0; d--) {
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      
      stores.forEach(store => {
        products.forEach(product => {
          const base = 100 + (Math.random() * 50);
          const dow = date.getDay();
          const dayFactor = (dow === 0 || dow === 6) ? 1.5 : 1.0;
          const sales = Math.floor(base * dayFactor + (Math.sin(d / 10) * 20));

          data.push({
            date: date.toISOString().split('T')[0],
            storeId: store,
            productId: product,
            sales: Math.max(0, sales),
            isPromo: Math.random() > 0.9,
          });
        });
      });
    }

    res.json(data);
  });

  // API Route: Get Forecast + Decision Intelligence
  app.get("/api/forecast", (req, res) => {
    const horizon = 30;
    const forecast = [];
    const now = new Date();

    // Simulation of current inventory state
    const currentStock = Math.floor(Math.random() * 400) + 100;
    const leadTimeDays = 3;
    const safetyStockMultiplier = 1.2;

    let totalPredictedFirst3Days = 0;

    for (let d = 1; d <= horizon; d++) {
      const date = new Date(now);
      date.setDate(date.getDate() + d);
      
      const dow = date.getDay();
      const dayFactor = (dow === 0 || dow === 6) ? 1.5 : 1.0;
      const base = 120;
      const predicted = Math.floor(base * dayFactor + (Math.sin(d / 10) * 15));
      
      if (d <= leadTimeDays) totalPredictedFirst3Days += predicted;

      forecast.push({
        date: date.toISOString().split('T')[0],
        predicted,
        upper: Math.floor((predicted + 20) * 1.15),
        lower: Math.floor((predicted - 20) * 0.85),
      });
    }

    // Decision Logic: Inventory Intelligence
    const reorderPoint = totalPredictedFirst3Days * safetyStockMultiplier;
    const needsRestock = currentStock < reorderPoint;
    const recommendedQty = needsRestock ? Math.ceil((reorderPoint * 3) - currentStock) : 0;

    res.json({
      forecast,
      inventory: {
        currentStock,
        reorderPoint: Math.ceil(reorderPoint),
        needsRestock,
        recommendedQty,
        leadTime: leadTimeDays
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
