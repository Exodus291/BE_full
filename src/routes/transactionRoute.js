import express from 'express';
import { createTransaction, getAllTransactions } from '../controllers/transactionController.js';
// import { body } from 'express-validator'; // Tidak lagi dibutuhkan jika semua dari validator file
import { authenticateToken, authorizeRole } from '../middlewares/authMiddleware.js';
import { ROLES } from '../config/constants.js';
import {
    createTransactionValidationRules
} from '../middlewares/validators/transactionValidator.js'; // Path diperbaiki: middlewares -> middleware

const router = express.Router();

router.use(authenticateToken);

// Staff and Owner can create and view transactions
router.post('/', authorizeRole([ROLES.OWNER, ROLES.STAFF]), createTransactionValidationRules(), createTransaction);
router.get('/', authorizeRole([ROLES.OWNER, ROLES.STAFF]), getAllTransactions);

export default router;