// fyncol-server/index.ts
import dotenv from "dotenv";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";

dotenv.config();

const app = express();

// Render inyecta PORT. Si no existe (local), usa 3000.
const port = Number(process.env.PORT) || 3000;

// Importante cuando estás detrás de un proxy (Render)
app.set("trust proxy", 1);

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

app.get("/", (_req, res) => {
  res.send("Fyncol API con Prisma 🚀 - Online");
});

// IMPORTANTÍSIMO: escuchar en 0.0.0.0 para que Render detecte el puerto
app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Servidor corriendo en puerto ${port}`);
});
