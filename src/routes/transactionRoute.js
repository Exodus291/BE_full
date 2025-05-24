import express from 'express';
import { createTransaction, getAllTransactions } from '../controllers/transactionController.js';
import { body } from 'express-validator';
import { authenticateToken, authorizeRole } from '../middlewares/authMiddleware.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

router.use(authenticateToken);

const createTransactionValidationRules = [
    body('userId').isInt().withMessage('User ID harus berupa angka.'),
    body('items').isArray({ min: 1 }).withMessage('Minimal satu item diperlukan dalam transaksi.'),
    body('items.*.menuId').isInt().withMessage('Setiap menu ID dalam item harus berupa angka.'),
    body('items.*.quantity').isInt({ gt: 0 }).withMessage('Kuantitas setiap item harus angka positif.'),
    body('paymentMethod').optional().isString().trim(),
    body('shiftId').optional().isInt().withMessage('Shift ID harus berupa angka.'),
];


// Staff and Owner can create and view transactions
router.post('/', authorizeRole([ROLES.OWNER, ROLES.STAFF]), createTransactionValidationRules, createTransaction);
router.get('/', authorizeRole([ROLES.OWNER, ROLES.STAFF]), getAllTransactions);

export default router;