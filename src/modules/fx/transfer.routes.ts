import { Router } from "express";
import { internationalTransfer } from "../fx/fx.controller";
import { authenticate, authorize, validate } from "../../middleware";
import { internationalTransferSchema } from "../fx/fx.validator";

const router = Router();

router.post(
  "/international",
  authenticate,
  authorize("user", "employer"),
  validate(internationalTransferSchema),
  internationalTransfer,
);

export default router;
