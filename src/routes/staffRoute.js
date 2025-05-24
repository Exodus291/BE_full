import express from 'express';
import { getStaffTasksData } from '../controllers/authController.js';
import { authenticateToken, authorizeRole } from '../middlewares/authMiddleware.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

// Semua rute di sini akan diawali dengan /staff (didefinisikan di app.js)
router.get('/tasks', authenticateToken, authorizeRole([ROLES.OWNER, ROLES.STAFF]), getStaffTasksData);

export default router;