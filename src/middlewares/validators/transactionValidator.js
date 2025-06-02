import { body, param, query } from 'express-validator';
import { TransactionStatus } from '@prisma/client'; // Impor enum dari Prisma Client

const allowedTransactionStatuses = Object.values(TransactionStatus);

export const createTransactionValidationRules = () => [
    body('totalAmount')
        .isDecimal().withMessage('Total amount harus berupa angka desimal.')
        .custom(value => parseFloat(value) > 0).withMessage('Total amount harus lebih besar dari 0.'),
    body('paymentMethod')
        .optional({ nullable: true })
        .isString().withMessage('Metode pembayaran harus berupa string.'),
    body('shiftId')
        .optional({ nullable: true })
        .isInt({ gt: 0 }).withMessage('Shift ID tidak valid.'),
    // Validasi untuk status jika dikirim, jika tidak, akan menggunakan default dari skema
    body('status')
        .optional()
        .isIn(allowedTransactionStatuses)
        .withMessage(`Status harus salah satu dari: ${allowedTransactionStatuses.join(', ')}`),
    body('transactionItems')
        .isArray({ min: 1 }).withMessage('Minimal harus ada satu item transaksi.')
        .custom(items => items.every(item =>
            typeof item.menuId === 'number' && item.menuId > 0 &&
            typeof item.quantity === 'number' && item.quantity > 0 &&
            (typeof item.priceAtTransaction === 'number' || typeof item.priceAtTransaction === 'string') && // Izinkan string untuk Decimal
            (item.customerName === undefined || typeof item.customerName === 'string') && // customerName opsional dan harus string jika ada
            (item.customerNote === undefined || typeof item.customerNote === 'string')    // customerNote opsional dan harus string jika ada
        )).withMessage('Setiap item transaksi harus memiliki menuId, quantity, priceAtTransaction yang valid, dan customerName/customerNote (jika ada) harus berupa string.'),
];

export const updateTransactionStatusValidationRules = () => [
    param('transactionId')
        .isUUID().withMessage('Format ID Transaksi tidak valid.'),
    body('status')
        .notEmpty().withMessage('Status tidak boleh kosong.')
        .isIn(allowedTransactionStatuses)
        .withMessage(`Status harus salah satu dari: ${allowedTransactionStatuses.join(', ')}`),
];

export const transactionIdParamValidationRule = () => [
    param('transactionId').isUUID().withMessage('Format ID Transaksi harus UUID.'),
];

export const getTransactionsQueryValidationRules = () => [
    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Page harus berupa angka bulat positif minimal 1.'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Limit harus berupa angka bulat positif antara 1 dan 100.'),
];
// Anda bisa menambahkan validasi lain sesuai kebutuhan