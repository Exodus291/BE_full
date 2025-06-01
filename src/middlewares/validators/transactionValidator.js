import { body, param } from 'express-validator';

export const createTransactionValidationRules = () => [
    body('items')
        .isArray({ min: 1 }).withMessage('Minimal harus ada 1 item dalam transaksi.')
        .custom((items) => {
            // Validasi lebih lanjut untuk setiap item
            // Setiap item harus punya menuId (integer) dan quantity (integer > 0)
            return items.every(item => 
                item.menuId && Number.isInteger(item.menuId) &&
                item.quantity && Number.isInteger(item.quantity) && item.quantity > 0
            );
        }).withMessage('Setiap item transaksi harus memiliki menuId dan quantity yang valid (angka bulat positif).'),
    body('paymentMethod')
        .optional() // Metode pembayaran bisa jadi opsional tergantung logika bisnis
        .isString().withMessage('Metode pembayaran harus berupa string.')
        .trim()
        .escape(),
    body('shiftId')
        .optional()
        .isInt().withMessage('Shift ID harus berupa angka.'),
];

// Jika Anda memerlukan validasi untuk parameter ID transaksi (misalnya untuk GET /transactions/:id)
export const idParamValidationRule = () => [
    param('id').isInt({ min: 1 }).withMessage('Parameter ID transaksi tidak valid.'),
];
