import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { corsOptions } from "./config/cors.js";

import healthRoutes from "./routes/health.routes.js";

import { notFoundMiddleware } from "./middlewares/notFound.middleware.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";

const app = express();

app.use(helmet());
app.use(cors(corsOptions));
app.use(morgan("dev"));

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.use("/api/health", healthRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;