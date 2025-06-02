import express from 'express';
import { authenticateToken, authorizeRole } from '../middlewares/authMiddleware.js'; // Path impor disesuaikan
import { ROLES } from '../config/constants.js';
import {
    createTransaction,
    getTransactionsForStore, // Impor controller baru
    getTransactionById,
    updateTransactionStatus
} from '../controllers/transactionController.js';
import {
    createTransactionValidationRules,
    updateTransactionStatusValidationRules,
    transactionIdParamValidationRule,
    getTransactionsQueryValidationRules // Impor aturan validasi query baru
} from '../middlewares/validators/transactionValidator.js';

const router = express.Router();

// Semua rute transaksi memerlukan autentikasi
router.use(authenticateToken);

router.get('/', authorizeRole([ROLES.OWNER, ROLES.STAFF]), getTransactionsQueryValidationRules(), getTransactionsForStore); // Rute baru untuk mendapatkan semua transaksi toko
router.post('/', authorizeRole([ROLES.OWNER, ROLES.STAFF]), createTransactionValidationRules(), createTransaction);
router.get('/:transactionId', authorizeRole([ROLES.OWNER, ROLES.STAFF]), transactionIdParamValidationRule(), getTransactionById); // Validasi param ditambahkan
router.patch('/:transactionId/status', authorizeRole([ROLES.OWNER, ROLES.STAFF]), updateTransactionStatusValidationRules(), updateTransactionStatus);

export default router;