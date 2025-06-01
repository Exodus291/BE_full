import express from 'express';
import { createMenu, getAllMenus, getMenuById, updateMenu, deleteMenu, searchMenus } from '../controllers/menuController.js';
import { body, param, query } from 'express-validator';
import { authenticateToken, authorizeRole } from '../middlewares/authMiddleware.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

// Middleware authenticateToken akan diterapkan secara individual ke rute yang membutuhkannya.
// Rute GET untuk melihat menu akan dibuat publik.

const menuValidationRules = [
    body('name').notEmpty().withMessage('Nama menu tidak boleh kosong.').isString().trim(),
    body('price').notEmpty().withMessage('Harga tidak boleh kosong.').isFloat({ gt: 0 }).withMessage('Harga harus angka positif.'),
    body('categoryId').optional().isInt().withMessage('ID Kategori harus angka.'),
    body('imageUrl').optional().isURL().withMessage('Format URL gambar tidak valid.'),
];

const menuUpdateValidationRules = [
    // Untuk update, semua field opsional, tapi jika ada, harus valid
    body('name').optional().isString().trim(),
    body('price').optional().isFloat({ gt: 0 }).withMessage('Harga harus angka positif.'),
    body('categoryId').optional().isInt().withMessage('ID Kategori harus angka.'),
    body('imageUrl').optional().isURL().withMessage('Format URL gambar tidak valid.'),
];

const idParamValidationRule = param('id').isInt().withMessage('ID Menu harus berupa angka.');

// Aturan validasi untuk query pencarian
const searchQueryValidationRules = [
    query('q')
        .notEmpty().withMessage('Parameter query pencarian (q) tidak boleh kosong.')
        .isString().withMessage('Parameter query pencarian (q) harus berupa string.')
        .trim()
        .isLength({ min: 1 }).withMessage('Parameter query pencarian (q) minimal 1 karakter.'),
];

// CRUD operations for menus - typically restricted to Owner
router.post('/', authenticateToken, authorizeRole([ROLES.OWNER]), menuValidationRules, createMenu);

// Rute GET untuk menu sekarang publik (tidak memerlukan token)
router.get('/', getAllMenus);
router.get('/:id', idParamValidationRule, getMenuById);

// Rute PUT dan DELETE tetap memerlukan otentikasi dan otorisasi
router.put('/:id', authenticateToken, authorizeRole([ROLES.OWNER]), idParamValidationRule, menuUpdateValidationRules, updateMenu);
router.delete('/:id', authenticateToken, authorizeRole([ROLES.OWNER]), idParamValidationRule, deleteMenu); // Soft delete

//Rute get sesuai query dengan validasi
router.get('/search', searchQueryValidationRules, searchMenus);

export default router;