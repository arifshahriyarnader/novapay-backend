import { Router } from "express";
import { authenticate, authorize } from "../../middleware";
import { getAllUsers, getAuditLogs } from "./admin.controller";

const router = Router();

router.get("/users", authenticate, authorize("admin"), getAllUsers);

router.get("/audit-logs", authenticate, authorize("admin"), getAuditLogs);
export default router;
