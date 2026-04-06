import { Router } from "express";
import { createAccount, getAccountBalance, getMyAccounts } from "./account.controller";
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

router.get(
  '/:id/balance',
  authenticate,
  authorize('user', 'employer'),
  getAccountBalance
);

export default router;
