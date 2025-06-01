import { body, param } from 'express-validator';

export const startShiftValidationRules = () => [
    body('initialCash') // Menggunakan 'initialCash' sesuai dengan controller
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Kas awal harus berupa angka non-negatif.'),
];

export const closeShiftValidationRules = () => [
    param('shiftId').isInt().withMessage('ID Shift harus berupa angka.'),
    body('finalCash') // Menggunakan 'finalCash' sesuai dengan controller
        .notEmpty().withMessage('Kas akhir tidak boleh kosong.')
        .isFloat({ min: 0 })
        .withMessage('Kas akhir harus berupa angka non-negatif.'),
    // Anda bisa menambahkan validasi untuk 'notes' jika diperlukan, misalnya:
    // body('notes').optional().isString().trim().escape().isLength({ max: 500 }).withMessage('Catatan maksimal 500 karakter.'),
];

// Jika Anda masih memerlukan validasi parameter ID shift secara terpisah (misalnya untuk GET /shifts/:shiftId)
// Anda bisa membuat aturan seperti ini:
export const shiftIdParamValidationRule = () => [
    param('shiftId').isInt({ min: 1 }).withMessage('Parameter ID Shift tidak valid.'),
];
