import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { CityRepository } from "./server/Repositories/CityRepository";
import { CityController } from "./server/Controllers/CityController";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // Instantiate our Interface -> Repository -> Controller pattern with Dependency Injection
  const cityRepository = new CityRepository();
  const cityController = new CityController(cityRepository);

  // REST API Routes
  app.get("/api/cities", cityController.getCities);
  app.get("/api/cities/:id", cityController.getCityById);
  app.post("/api/cities", cityController.createCity);
  app.put("/api/cities/:id", cityController.updateCity);
  app.delete("/api/cities/:id", cityController.deleteCity);

  // Integrates Vite as middleware for development, and static file serving for production
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode with static file serving...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running and accessible on port http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Critical: Failed to start full-stack server:", error);
});
