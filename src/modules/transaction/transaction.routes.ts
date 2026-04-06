import { Router } from "express";
import {
  getTransaction,
  getTransactionHistory,
  reverseTransaction,
  transfer,
} from "./transaction.controller";
import { authenticate, authorize, validate } from "../../middleware";
import { transferSchema } from "./transaction.validator";

const router = Router();

router.post(
  "/transfer",
  authenticate,
  authorize("user", "employer"),
  validate(transferSchema),
  transfer,
);
router.get(
  "/history",
  authenticate,
  authorize("user", "employer"),
  getTransactionHistory,
);
router.get("/:id", authenticate, authorize("user", "employer"), getTransaction);

router.post(
  "/:id/reverse",
  authenticate,
  authorize("user", "employer"),
  reverseTransaction,
);

export default router;
