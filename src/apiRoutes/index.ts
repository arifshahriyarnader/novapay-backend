import {Router} from 'express';
import authRoutes from '../modules/auth/auth.routes';
import accountRoutes from '../modules/account/account.routes';
import transactionRoutes from '../modules/transaction/transaction.routes';


const router = Router();
router.use('/auth', authRoutes);
router.use('/accounts', accountRoutes)
router.use('/transactions', transactionRoutes);

export default router;