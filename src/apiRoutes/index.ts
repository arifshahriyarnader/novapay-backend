import {Router} from 'express';
import authRoutes from '../modules/auth/auth.routes';
import accountRoutes from '../modules/account/account.routes';
import transactionRoutes from '../modules/transaction/transaction.routes';
import ledgerRoutes from '../modules/ledger/ledger.routes';
import fxRoutes from '../modules/fx/fx.routes';


const router = Router();
router.use('/auth', authRoutes);
router.use('/accounts', accountRoutes)
router.use('/transactions', transactionRoutes);
router.use('/ledger', ledgerRoutes);
router.use('/fx', fxRoutes)

export default router;