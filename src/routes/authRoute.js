import express from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { loginUser, getUserProfile, registerOwner, registerStaffWithReferral, logoutUser, updateUserProfile } from '../controllers/authController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Konfigurasi Multer untuk penyimpanan file
const profilePictureStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = 'public/uploads/profile_pictures/';
        // Membuat direktori jika belum ada
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        cb(null, req.user.id + '-' + Date.now() + path.extname(file.originalname)); // Nama file unik
    }
});
const uploadProfilePicture = multer({ storage: profilePictureStorage });

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
router.put('/profile', authenticateToken, uploadProfilePicture.single('profilePicture'), updateProfileValidationRules, updateUserProfile); // Rute untuk update profil dengan upload gambar

export default router;