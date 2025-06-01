import express from 'express';
import {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory
} from '../controllers/categoryController.js';
// import { body, param } from 'express-validator'; // Tidak lagi dibutuhkan jika semua dari validator file
import { authenticateToken, authorizeRole } from '../middlewares/authMiddleware.js';
import { ROLES } from '../config/constants.js';
import {
    categoryNameValidationRules,
    idParamValidationRules
} from '../middlewares/validators/categoryValidator.js'; // Impor validator

const router = express.Router();

// Rute untuk membuat kategori baru
// Hanya pengguna dengan peran OWNER yang bisa membuat kategori
router.post('/', authenticateToken, authorizeRole([ROLES.OWNER]), categoryNameValidationRules(), createCategory);

// Rute untuk mendapatkan semua kategori (memerlukan otentikasi dan spesifik per toko)
router.get('/', authenticateToken, authorizeRole([ROLES.OWNER, ROLES.STAFF]), getAllCategories);

// Rute untuk mendapatkan satu kategori berdasarkan ID (memerlukan otentikasi dan spesifik per toko)
router.get('/:id', authenticateToken, authorizeRole([ROLES.OWNER, ROLES.STAFF]), idParamValidationRules(), getCategoryById);

// Rute untuk memperbarui kategori
// Hanya pengguna dengan peran OWNER yang bisa memperbarui
router.put('/:id', authenticateToken, authorizeRole([ROLES.OWNER]), idParamValidationRules(), categoryNameValidationRules(), updateCategory);

// Rute untuk menghapus (soft delete) kategori
// Hanya pengguna dengan peran OWNER yang bisa menghapus
router.delete('/:id', authenticateToken, authorizeRole([ROLES.OWNER]), idParamValidationRules(), deleteCategory);

export default router;
