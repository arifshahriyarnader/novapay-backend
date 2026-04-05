import express from "express";
import cors from "cors";
import helmet from "helmet";
import { appConfig } from "./config";
import { connectDatabase } from "./database";
import apiRoutes from "./apiRoutes";
import { errorHandler, apiRateLimiter } from "./middleware";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

connectDatabase();

app.use("/api/v1", apiRateLimiter);
app.use("/api/v1", apiRoutes);

app.use(errorHandler);

app.listen(appConfig.port, () => {
  console.log(`Server is running on port ${appConfig.port}`);
});
