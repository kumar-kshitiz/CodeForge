import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

interface AppError extends Error {
  statusCode?: number;
}

export function errorMiddleware(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      details: err.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  ) {
    res
      .status(409)
      .json({ error: "A record with the same unique value already exists" });
    return;
  }

  const statusCode = err.statusCode ?? 500;
  const message = statusCode < 500 ? err.message : "Internal Server Error";

  if (statusCode >= 500) {
    console.error("[error]", err);
    try {
      require("fs").appendFileSync(
        "/tmp/api_error.log",
        new Date().toISOString() +
          "\\n" +
          String(err.stack || err.message) +
          "\\n\\n",
      );
    } catch (e) {}
  }

  res.status(statusCode).json({ error: message });
}
