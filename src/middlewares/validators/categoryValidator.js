import { body, param } from 'express-validator';

export const categoryNameValidationRules = () => [
    body('name')
        .notEmpty().withMessage('Nama kategori tidak boleh kosong.')
        .isString().withMessage('Nama kategori harus berupa string.')
        .trim()
        .isLength({ min: 1, max: 100 }).withMessage('Nama kategori harus antara 1 dan 100 karakter.'),
];

export const idParamValidationRules = () => [
    param('id').isInt({ gt: 0 }).withMessage('ID Kategori harus berupa angka bulat positif.'),
];

// Jika ada aturan validasi lain untuk kategori, tambahkan di sini
// Misalnya, untuk update, mungkin ada aturan yang sedikit berbeda atau gabungan.
// Untuk saat ini, kita gunakan aturan yang sama untuk create dan update name.