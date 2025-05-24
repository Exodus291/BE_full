import express from 'express';
import { startShift, getAllShifts, closeShift } from '../controllers/shiftController.js';
import { body, param } from 'express-validator';
import { authenticateToken, authorizeRole } from '../middlewares/authMiddleware.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

router.use(authenticateToken);

const startShiftValidationRules = [
    body('initialCash').optional().isFloat({ min: 0 }).withMessage('Kas awal harus angka non-negatif.'),
];

const closeShiftValidationRules = [
    param('shiftId').isInt().withMessage('ID Shift harus berupa angka.'),
    body('finalCash').notEmpty().withMessage('Kas akhir tidak boleh kosong.').isFloat({ min: 0 }).withMessage('Kas akhir harus angka non-negatif.'),
];


// Shift management typically for both staff (their own shift) and owner (overview)
router.post('/start', authorizeRole([ROLES.OWNER, ROLES.STAFF]), startShiftValidationRules, startShift);
router.get('/', authorizeRole([ROLES.OWNER, ROLES.STAFF]), getAllShifts);
router.post('/:shiftId/close', authorizeRole([ROLES.OWNER, ROLES.STAFF]), closeShiftValidationRules, closeShift);

export default router;