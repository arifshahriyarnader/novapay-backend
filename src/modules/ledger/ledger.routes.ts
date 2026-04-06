import { Router } from "express";
import { getLedgerEntries } from "./ledger.controller";
import { authenticate, authorize } from "../../middleware";

const router = Router();

router.get(
  "/:accountId",
  authenticate,
  authorize("user", "employer"),
  getLedgerEntries,
);

export default router;
