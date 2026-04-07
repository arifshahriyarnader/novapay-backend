import { Router } from "express";
import { authenticate, authorize } from "../../middleware";
import {
  getAllTransactions,
  getAllUsers,
  getAuditLogs,
  getLedgerHealth,
} from "./admin.controller";

const router = Router();

router.get("/users", authenticate, authorize("admin"), getAllUsers);

router.get("/audit-logs", authenticate, authorize("admin"), getAuditLogs);

router.get(
  "/transactions",
  authenticate,
  authorize("admin"),
  getAllTransactions,
);

router.get("/ledger/health", authenticate, authorize("admin"), getLedgerHealth);
export default router;
