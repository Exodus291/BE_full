import express from 'express';
import {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory
} from '../controllers/categoryController.js';
import { body, param } from 'express-validator';
import { authenticateToken, authorizeRole } from '../middlewares/authMiddleware.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

// Aturan validasi untuk nama kategori
const categoryNameValidationRules = [
    body('name')
        .notEmpty().withMessage('Nama kategori tidak boleh kosong.')
        .isString().withMessage('Nama kategori harus berupa string.')
        .trim()
        .isLength({ min: 1, max: 100 }).withMessage('Nama kategori harus antara 1 dan 100 karakter.'),
];

// Aturan validasi untuk parameter ID
const idParamValidationRules = [
    param('id').isInt({ gt: 0 }).withMessage('ID Kategori harus berupa angka bulat positif.'),
];

// Rute untuk membuat kategori baru
// Hanya pengguna dengan peran OWNER yang bisa membuat kategori
router.post('/', authenticateToken, authorizeRole([ROLES.OWNER]), categoryNameValidationRules, createCategory);

// Rute untuk mendapatkan semua kategori (bisa diakses publik atau memerlukan otentikasi)
router.get('/', getAllCategories);

// Rute untuk mendapatkan satu kategori berdasarkan ID
router.get('/:id', idParamValidationRules, getCategoryById);

// Rute untuk memperbarui kategori
// Hanya pengguna dengan peran OWNER yang bisa memperbarui
router.put('/:id', authenticateToken, authorizeRole([ROLES.OWNER]), idParamValidationRules, categoryNameValidationRules, updateCategory);

// Rute untuk menghapus (soft delete) kategori
// Hanya pengguna dengan peran OWNER yang bisa menghapus
router.delete('/:id', authenticateToken, authorizeRole([ROLES.OWNER]), idParamValidationRules, deleteCategory);

export default router;
