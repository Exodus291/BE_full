import jwt from 'jsonwebtoken';
import { ROLES } from '../config/constants.js'; // Pastikan path ini benar

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-very-strong-secret-key';

export function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) {
        return res.status(401).json({ message: 'Unauthorized: Token tidak disediakan' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Unauthorized: Token kedaluwarsa' });
            }
            return res.status(403).json({ message: 'Forbidden: Token tidak valid' });
        }
        req.user = user; // Simpan data pengguna dari token ke request
        next();
    });
}

export function authorizeRole(allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Akses ditolak: Peran tidak diizinkan' });
        }
        next();
    };
}