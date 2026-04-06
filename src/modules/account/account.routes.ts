import { Router } from "express";
import { createAccount } from "./account.controller";
import { authenticate, authorize, validate } from "../../middleware";
import { createAccountSchema } from "./account.validator";

const router = Router();

router.post(
  "/create-wallet",
  authenticate,
  authorize("user", "employer"),
  validate(createAccountSchema),
  createAccount,
);

export default router;
