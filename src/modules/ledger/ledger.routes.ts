import { Router } from "express";
import { getLedgerEntries, verifyDoubleEntry } from "./ledger.controller";
import { authenticate, authorize } from "../../middleware";

const router = Router();

router.get(
  "/verify/:transactionId",
  authenticate,
  authorize("user", "employer", "admin"),
  verifyDoubleEntry,
);

router.get(
  "/:accountId",
  authenticate,
  authorize("user", "employer"),
  getLedgerEntries,
);

export default router;
