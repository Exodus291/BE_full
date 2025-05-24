import express from 'express';
import { getAdminDashboardData } from '../controllers/authController.js';
import { authenticateToken, authorizeRole } from '../middlewares/authMiddleware.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

// Semua rute di sini akan diawali dengan /admin (didefinisikan di app.js)
router.get('/dashboard', authenticateToken, authorizeRole([ROLES.OWNER]), getAdminDashboardData);

export default router;