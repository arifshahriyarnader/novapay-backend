import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import accountRoutes from "../modules/account/account.routes";
import transactionRoutes from "../modules/transaction/transaction.routes";
import ledgerRoutes from "../modules/ledger/ledger.routes";
import fxRoutes from "../modules/fx/fx.routes";
import transferRoutes from "../modules/fx/transfer.routes";
import payrollRoutes from "../modules/payroll/payroll.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/accounts", accountRoutes);
router.use("/transactions", transactionRoutes);
router.use("/ledger", ledgerRoutes);
router.use("/fx", fxRoutes);
router.use("/transfers", transferRoutes);
router.use("/payroll", payrollRoutes);

export default router;
