import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { loginUser, getUserProfile, registerOwner, registerStaffWithReferral, logoutUser, updateUserProfile, updateUserProfilePicture, updateUserBackgroundCover } from '../controllers/authController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import {
    loginValidationRules,
    registerOwnerValidationRules,
    registerStaffValidationRules,
    updateUserProfileValidationRules
} from '../middlewares/validators/authValidator.js'; // Corrected path: middlewares -> middleware


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

router.post('/login', loginValidationRules(), loginUser);
router.post('/register/owner', registerOwnerValidationRules(), registerOwner);
router.post('/register/staff', registerStaffValidationRules(), registerStaffWithReferral);
router.post('/logout', authenticateToken, logoutUser); // Rute untuk logout

router.get('/profile', authenticateToken, getUserProfile); // Contoh rute profil
router.put(
    '/profile',
    authenticateToken,
    // uploader.single('profilePicture') dihapus dari sini, karena endpoint ini hanya untuk name dan bio
    updateUserProfileValidationRules(), // Menggunakan aturan dari authValidator.js
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