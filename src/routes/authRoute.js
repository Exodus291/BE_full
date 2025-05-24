import express from 'express';
import { body } from 'express-validator';
import { loginUser, getUserProfile, registerOwner, registerStaffWithReferral } from '../controllers/authController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

const loginValidationRules = [
    body('email').isEmail().withMessage('Format email tidak valid.'),
    body('password').notEmpty().withMessage('Password tidak boleh kosong.'),
];

const ownerRegisterValidationRules = [
    body('email').isEmail().withMessage('Format email tidak valid.'),
    body('password').isLength({ min: 6 }).withMessage('Password minimal 6 karakter.'),
    body('name').notEmpty().withMessage('Nama tidak boleh kosong.'),
];

const staffRegisterValidationRules = [
    body('email').isEmail().withMessage('Format email tidak valid.'),
    body('password').isLength({ min: 6 }).withMessage('Password minimal 6 karakter.'),
    body('name').notEmpty().withMessage('Nama tidak boleh kosong.'),
    body('referralCode').notEmpty().withMessage('Kode referral tidak boleh kosong.'),
];

router.post('/login', loginValidationRules, loginUser);
router.post('/register/owner', ownerRegisterValidationRules, registerOwner);
router.post('/register/staff', staffRegisterValidationRules, registerStaffWithReferral);

router.get('/profile', authenticateToken, getUserProfile); // Contoh rute profil

export default router;