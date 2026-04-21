// fyncol-server/index.ts
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import rutasRoutes from './routes/rutas.routes';
import capitalRoutes from './routes/capital.routes';
import clientRoutes from './routes/client.routes';
import closureRoutes from './routes/closure.routes';
import monitoringRoutes from './routes/monitoring.routes';

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
app.use('/api/rutas', rutasRoutes);
app.use('/api/capital', capitalRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/closure', closureRoutes);
app.use('/api/monitoring', monitoringRoutes);

app.get("/", (_req: Request, res: Response) => {
  res.send("Fyncol API con Prisma 🚀 - Online");
});

app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Servidor corriendo en puerto ${port}`);
});
