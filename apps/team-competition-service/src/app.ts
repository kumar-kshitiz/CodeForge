import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import { env } from "./config/env";
import matchRoutes from "./routes/matches";

const app = express();
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        process.env.NODE_ENV !== "production" &&
        /^http:\/\/localhost(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      if (origin === env.frontendUrl) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "128kb" }));
app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "team-competition" }));
app.use("/api/matches", matchRoutes);
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const candidate = error as { message?: string; statusCode?: number; issues?: unknown };
  res.status(candidate.statusCode ?? (candidate.issues ? 400 : 500)).json({
    error: candidate.message ?? "Unexpected team competition error",
  });
});

export default app;
