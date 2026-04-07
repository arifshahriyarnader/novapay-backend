import express from "express";
import cors from "cors";
import helmet from "helmet";
import { appConfig } from "./config";
import { connectDatabase } from "./database";
import apiRoutes from "./apiRoutes";
import { errorHandler, apiRateLimiter } from "./middleware";
import { startPayrollWorker } from "./modules/payroll/payroll.queue";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

connectDatabase();

app.use("/api/v1", apiRateLimiter);
app.use("/api/v1", apiRoutes);

app.use(errorHandler);

startPayrollWorker();

app.listen(appConfig.port, () => {
  console.log(`Server is running on port ${appConfig.port}`);
});
