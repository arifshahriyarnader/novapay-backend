import {Pool} from "pg";
import {appConfig} from "../config";

export const databasePool = new Pool({
    connectionString: appConfig.databaseURL,
})