// fyncol-server/index.ts
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3000;

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

app.get("/", (_req: Request, res: Response) => {
  res.send("Fyncol API con Prisma 🚀 - Online");
});

app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Servidor corriendo en puerto ${port}`);
});
