import { Router } from "express";
import { lockRate } from "./fx.controller";
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

export default router;
