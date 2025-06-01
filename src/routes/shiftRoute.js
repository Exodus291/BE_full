import express from 'express';
import { startShift, getAllShifts, closeShift } from '../controllers/shiftController.js';
// import { body, param } from 'express-validator'; // Tidak lagi dibutuhkan jika semua dari validator file
import { authenticateToken, authorizeRole } from '../middlewares/authMiddleware.js';
import { ROLES } from '../config/constants.js';
import {
    startShiftValidationRules,
    closeShiftValidationRules,
    // shiftIdParamValidationRule // Uncomment jika Anda membuat rute GET /:shiftId
} from '../middlewares/validators/shiftValidator.js'; // Impor validator

const router = express.Router();

router.use(authenticateToken);

// Shift management typically for both staff (their own shift) and owner (overview)
router.post('/start', authorizeRole([ROLES.OWNER, ROLES.STAFF]), startShiftValidationRules(), startShift);
router.get('/', authorizeRole([ROLES.OWNER, ROLES.STAFF]), getAllShifts);
router.post('/:shiftId/close', authorizeRole([ROLES.OWNER, ROLES.STAFF]), closeShiftValidationRules(), closeShift);

export default router;