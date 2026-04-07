import { Router } from "express";
import { checkQuote, lockRate } from "./fx.controller";
import { authenticate, authorize, validate } from "../../middleware";
import { lockRateSchema } from "./fx.validator";

const router = Router();

router.post(
  "/quote",
  authenticate,
  authorize("user", "employer"),
  validate(lockRateSchema),
  lockRate,
);

router.get(
  "/quote/:id",
  authenticate,
  authorize("user", "employer"),
  checkQuote,
);

export default router;
