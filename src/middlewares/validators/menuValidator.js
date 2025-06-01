import { body, param, query } from 'express-validator';

export const menuValidationRules = () => [
    body('name').notEmpty().withMessage('Nama menu tidak boleh kosong.').isString().trim(),
    body('price').notEmpty().withMessage('Harga tidak boleh kosong.').isFloat({ gt: 0 }).withMessage('Harga harus angka positif.'),
    body('categoryId').optional({ checkFalsy: true }).isInt().withMessage('ID Kategori harus angka.'), // checkFalsy: true agar 0 atau string kosong dianggap tidak ada
    // body('imageUrl').optional().isURL().withMessage('Format URL gambar tidak valid.'), // Jika Anda menerima URL, bukan upload file
];

export const menuUpdateValidationRules = () => [
    // Untuk update, semua field opsional, tapi jika ada, harus valid
    body('name').optional().isString().trim(),
    body('price').optional().isFloat({ gt: 0 }).withMessage('Harga harus angka positif.'),
    body('categoryId').optional({ checkFalsy: true }).isInt().withMessage('ID Kategori harus angka.'),
    // body('imageUrl').optional().isURL().withMessage('Format URL gambar tidak valid.'), // Jika Anda menerima URL
];

export const idParamValidationRule = () => [
    param('id').isInt().withMessage('ID Menu harus berupa angka.'),
];

export const searchQueryValidationRules = () => [
    query('q')
        .notEmpty().withMessage('Parameter query pencarian (q) tidak boleh kosong.')
        .isString().withMessage('Parameter query pencarian (q) harus berupa string.')
        .trim()
        .isLength({ min: 1 }).withMessage('Parameter query pencarian (q) minimal 1 karakter.'),
];