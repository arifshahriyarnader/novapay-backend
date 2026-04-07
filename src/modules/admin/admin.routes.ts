import { Router } from "express";
import { authenticate, authorize } from "../../middleware";
import { getAllUsers } from "./admin.controller";

const router = Router();

router.get("/users", authenticate, authorize("admin"), getAllUsers);

export default router;
