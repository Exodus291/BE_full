import express from 'express';
import { createMenu, getAllMenus, getMenuById, updateMenu, deleteMenu, searchMenus } from '../controllers/menuController.js';
// import { body, param, query } from 'express-validator'; // Tidak lagi dibutuhkan jika semua dari validator file
import { authenticateToken, authorizeRole } from '../middlewares/authMiddleware.js';
import { ROLES } from '../config/constants.js';
import {
    menuValidationRules,
    menuUpdateValidationRules,
    idParamValidationRule,
    searchQueryValidationRules
} from '../middlewares/validators/menuValidator.js'; // Impor validator

const router = express.Router();

// Middleware authenticateToken akan diterapkan secara individual ke rute yang membutuhkannya.
// Rute GET untuk melihat menu akan dibuat publik.

//Rute get sesuai query dengan validasi
router.get('/search/items', authenticateToken, authorizeRole([ROLES.OWNER, ROLES.STAFF]), searchQueryValidationRules(), searchMenus); // Path diubah agar lebih deskriptif
// CRUD operations for menus - typically restricted to Owner
router.post('/', authenticateToken, authorizeRole([ROLES.OWNER]), menuValidationRules(), createMenu);

// Rute GET untuk menu sekarang memerlukan otentikasi dan spesifik per toko
router.get('/', authenticateToken, authorizeRole([ROLES.OWNER, ROLES.STAFF]), getAllMenus);
router.get('/:id', authenticateToken, authorizeRole([ROLES.OWNER, ROLES.STAFF]), idParamValidationRule(), getMenuById);

// Rute PUT dan DELETE tetap memerlukan otentikasi dan otorisasi
router.put('/:id', authenticateToken, authorizeRole([ROLES.OWNER]), idParamValidationRule(), menuUpdateValidationRules(), updateMenu);
router.delete('/:id', authenticateToken, authorizeRole([ROLES.OWNER]), idParamValidationRule(), deleteMenu); // Soft delete


export default router;