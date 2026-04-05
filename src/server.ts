import express from "express";
import cors from "cors";
import { appConfig } from "./config";
import { connectDatabase } from "./database";

const app = express();

app.use(cors());
app.use(express.json());

connectDatabase()

app.listen(appConfig.port, () => {
    console.log(`Server is running on port ${appConfig.port}`);
})