// fyncol-server/index.ts

import dotenv from "dotenv";
import express, {
  Request,
  Response,
} from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import rutasRoutes from "./routes/rutas.routes";
import capitalRoutes from "./routes/capital.routes";
import clientRoutes from "./routes/client.routes";
import closureRoutes from "./routes/closure.routes";
import monitoringRoutes from "./routes/monitoring.routes";
import loanRequestRoutes from "./routes/loan-request.routes";

import { startCronJobs } from "./utils/cron.utils";
import { ejecutarDiagnosticoRed } from "./utils/network-diagnostic";

dotenv.config();

/*
 * Diagnóstico TEMPORAL.
 *
 * No bloquea el inicio del servidor y no expone
 * credenciales de DATABASE_URL.
 */
void ejecutarDiagnosticoRed();

const app = express();

const port =
  Number(process.env.PORT) || 3000;

app.set("trust proxy", 1);

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/users",
  userRoutes
);

app.use(
  "/api/rutas",
  rutasRoutes
);

app.use(
  "/api/capital",
  capitalRoutes
);

app.use(
  "/api/clients",
  clientRoutes
);

app.use(
  "/api/closure",
  closureRoutes
);

app.use(
  "/api/monitoring",
  monitoringRoutes
);

app.use(
  "/api/loan-requests",
  loanRequestRoutes
);

startCronJobs();

app.get(
  "/",
  (
    _req: Request,
    res: Response
  ) => {
    res.send(
      "Fyncol API con Prisma 🚀 - Online"
    );
  }
);

app.listen(
  port,
  "0.0.0.0",
  () => {
    console.log(
      `🚀 Servidor corriendo en puerto ${port}`
    );
  }
);