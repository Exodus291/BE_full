import express from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { loginUser, getUserProfile, registerOwner, registerStaffWithReferral, logoutUser, updateUserProfile, updateUserProfilePicture, updateUserBackgroundCover } from '../controllers/authController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Konfigurasi Multer untuk penyimpanan file gabungan (profile dan background)
const combinedStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadPath;
        if (file.fieldname === "profilePicture") {
            uploadPath = 'public/uploads/profile_pictures/';
        } else if (file.fieldname === "backgroundProfilePicture") {
            uploadPath = 'public/uploads/background_profile_pictures/';
        } else {
            // Fallback atau direktori default jika fieldname tidak dikenali, atau bisa juga error
            uploadPath = 'public/uploads/others/';
        }
        // Membuat direktori jika belum ada
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Pastikan req.user ada dan memiliki id (dari authenticateToken middleware)
        const userId = req.user ? req.user.id : 'unknown_user';
        let prefix = '';
        if (file.fieldname === "backgroundProfilePicture") {
            prefix = '-bg-';
        }
        cb(null, userId + prefix + Date.now() + path.extname(file.originalname)); // Nama file unik
    }
});
// Menggunakan satu instance multer dengan storage yang sama untuk berbagai keperluan upload
const uploader = multer({ storage: combinedStorage });

const loginValidationRules = [
    body('email').isEmail().withMessage('Format email tidak valid.'),
    body('password').notEmpty().withMessage('Password tidak boleh kosong.'),
];

const ownerRegisterValidationRules = [
    body('email').isEmail().withMessage('Format email tidak valid.'),
    body('password').isLength({ min: 6 }).withMessage('Password minimal 6 karakter.'),
    body('name').notEmpty().withMessage('Nama tidak boleh kosong.'),
    body('store').notEmpty().withMessage('Nama toko tidak boleh kosong.').isString().trim(),
];

const staffRegisterValidationRules = [
    body('email').isEmail().withMessage('Format email tidak valid.'),
    body('password').isLength({ min: 6 }).withMessage('Password minimal 6 karakter.'),
    body('name').notEmpty().withMessage('Nama tidak boleh kosong.'),
    body('referralCode').notEmpty().withMessage('Kode referral tidak boleh kosong.'),
];

const updateProfileValidationRules = [
    body('name').optional().notEmpty().withMessage('Nama tidak boleh kosong jika diisi.').isString().trim(),
    body('bio').optional().isString().trim().isLength({ max: 500 }).withMessage('Bio maksimal 500 karakter.'),
    // Validasi untuk profilePictureUrl dari body sekarang dihilangkan karena akan dihandle oleh file upload.
    // Jika Anda masih ingin mengizinkan URL eksternal, validasi ini bisa dipertahankan dengan logika tambahan di controller.
    // Untuk saat ini, kita fokus pada upload file.
    // body('profilePictureUrl').optional({ checkFalsy: true }).isURL().withMessage('Format URL gambar profil tidak valid.'),
];

router.post('/login', loginValidationRules, loginUser);
router.post('/register/owner', ownerRegisterValidationRules, registerOwner);
router.post('/register/staff', staffRegisterValidationRules, registerStaffWithReferral);
router.post('/logout', authenticateToken, logoutUser); // Rute untuk logout


router.get('/profile', authenticateToken, getUserProfile); // Contoh rute profil
router.put(
    '/profile',
    authenticateToken,
    // uploader.single('profilePicture') dihapus dari sini, karena endpoint ini hanya untuk name dan bio
    updateProfileValidationRules,
    updateUserProfile
);

router.put(
    '/profile/picture', // Endpoint baru untuk update profile picture
    authenticateToken,
    uploader.single('profilePicture'), // Hanya untuk profilePicture
    // Tidak ada updateProfileValidationRules di sini karena hanya file yang diunggah.
    updateUserProfilePicture
);

router.put(
    '/profile/background-cover',
    authenticateToken,
    uploader.single('backgroundProfilePicture'), // Hanya untuk backgroundProfilePicture
    // Tidak ada updateProfileValidationRules di sini karena hanya file yang diunggah.
    // Jika ada field teks lain yang dikirim bersamaan, tambahkan validasi yang sesuai.
    updateUserBackgroundCover
);


export default router;