import { Router } from "express";
import { authenticate, authorize } from "../../middleware";
import {
  getAllPayrollJobs,
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

router.get(
  "/payroll/jobs",
  authenticate,
  authorize("admin"),
  getAllPayrollJobs,
);
export default router;
