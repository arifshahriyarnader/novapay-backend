import dotenv from "dotenv";
dotenv.config();

export const appConfig = {
  port: process.env.PORT || 5001,
  databaseURL: process.env.DATABASE_URL || "",
 
};