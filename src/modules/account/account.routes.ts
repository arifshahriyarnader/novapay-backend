import { Router } from "express";
import { createAccount, getMyAccounts } from "./account.controller";
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

router.get(
  '/my-wallets',
  authenticate,
  authorize('user', 'employer'),
  getMyAccounts
);

export default router;
