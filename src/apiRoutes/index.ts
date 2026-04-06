import {Router} from 'express';
import authRoutes from '../modules/auth/auth.routes';
import accountRoutes from '../modules/account/account.routes';


const router = Router();
router.use('/auth', authRoutes);
router.use('/accounts', accountRoutes)

export default router;