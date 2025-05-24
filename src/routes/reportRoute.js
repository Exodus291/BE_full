import express from 'express';
import { getSalesReport } from '../controllers/reportController.js';
import { authenticateToken, authorizeRole } from '../middlewares/authMiddleware.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/sales', authorizeRole([ROLES.OWNER]), getSalesReport); // Reports typically for Owner

export default router;