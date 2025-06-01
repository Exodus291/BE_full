import { body } from 'express-validator';

export const registerOwnerValidationRules = () => {
    return [
        body('email')
            .isEmail().withMessage('Format email tidak valid.')
            .normalizeEmail(),
        body('password')
            .isLength({ min: 6 }).withMessage('Password minimal harus 6 karakter.'),
        body('name')
            .notEmpty().withMessage('Nama tidak boleh kosong.')
            .trim()
            .escape(),
        body('storeName')
            .notEmpty().withMessage('Nama toko tidak boleh kosong.')
            .trim()
            .escape()
            .isLength({ min: 3 }).withMessage('Nama toko minimal harus 3 karakter.'),
    ];
};

export const registerStaffValidationRules = () => {
    return [
        body('email')
            .isEmail().withMessage('Format email tidak valid.')
            .normalizeEmail(),
        body('password')
            .isLength({ min: 6 }).withMessage('Password minimal harus 6 karakter.'),
        body('name')
            .notEmpty().withMessage('Nama tidak boleh kosong.')
            .trim()
            .escape(),
        body('referralCode')
            .notEmpty().withMessage('Kode referral tidak boleh kosong.')
            .isLength({ min: 6, max: 10 }).withMessage('Format kode referral tidak valid.') // Sesuaikan panjang min/max jika perlu
            .isAlphanumeric().withMessage('Kode referral hanya boleh berisi huruf dan angka.')
            .toUpperCase(),
    ];
};

export const loginValidationRules = () => {
    return [
        body('email')
            .isEmail().withMessage('Format email tidak valid.')
            .normalizeEmail(),
        body('password')
            .notEmpty().withMessage('Password tidak boleh kosong.'),
    ];
};

export const updateUserProfileValidationRules = () => {
    return [
        body('name')
            .optional()
            .notEmpty().withMessage('Nama tidak boleh kosong jika diisi.')
            .trim()
            .escape(),
        body('bio')
            .optional()
            .trim()
            .escape()
            .isLength({ max: 500 }).withMessage('Bio tidak boleh lebih dari 500 karakter.'),
        // Validasi untuk profilePictureUrl dan backgroundProfilePictureUrl
        // biasanya ditangani oleh middleware upload file (seperti Multer)
        // dan logika controller, bukan express-validator untuk field string URL langsung dari body.
        // Jika Anda mengharapkan URL sebagai string, Anda bisa menambahkan:
        // body('profilePictureUrl').optional().isURL().withMessage('URL gambar profil tidak valid.'),
        // body('backgroundProfilePictureUrl').optional().isURL().withMessage('URL gambar background tidak valid.'),
    ];
};