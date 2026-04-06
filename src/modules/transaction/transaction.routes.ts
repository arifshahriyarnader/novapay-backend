import { Router } from "express";
import { transfer } from "./transaction.controller";

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

export default router;