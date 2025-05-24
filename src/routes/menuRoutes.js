import express from 'express';
import { createMenu, getAllMenus, getMenuById, updateMenu, deleteMenu } from '../controllers/menuController.js';
import { body, param } from 'express-validator';
import { authenticateToken, authorizeRole } from '../middlewares/authMiddleware.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

// All menu routes require authentication
router.use(authenticateToken);

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

// CRUD operations for menus - typically restricted to Owner
router.post('/', authorizeRole([ROLES.OWNER]), menuValidationRules, createMenu);
router.get('/', authorizeRole([ROLES.OWNER, ROLES.STAFF]), getAllMenus); // Staff might need to view menus
router.get('/:id', authorizeRole([ROLES.OWNER, ROLES.STAFF]), idParamValidationRule, getMenuById);
router.put('/:id', authorizeRole([ROLES.OWNER]), idParamValidationRule, menuUpdateValidationRules, updateMenu);
router.delete('/:id', authorizeRole([ROLES.OWNER]), idParamValidationRule, deleteMenu); // Soft delete

export default router;