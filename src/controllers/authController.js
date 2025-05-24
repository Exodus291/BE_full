import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import prisma from '../config/prismaClient.js';
import { ROLES } from '../config/constants.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-very-strong-secret-key';

// Helper function to generate a random referral code
function generateReferralCode(length = 8) {
    return Math.random().toString(36).substring(2, 2 + length).toUpperCase();
}

export const loginUser = async (req, res) => {
    // Validasi input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Pemeriksaan manual sudah tidak diperlukan karena ditangani express-validator
    // if (!email || !password) { ... }

    try {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return res.status(401).json({ message: 'Login gagal', errors: [{ msg: 'Email atau password salah.' }] });
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Login gagal', errors: [{ msg: 'Email atau password salah.' }] });
        }

        const tokenPayload = {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
        };

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' });

        res.json({
            message: 'Login berhasil',
            token,
            user: tokenPayload,
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server', errors: [{ msg: 'Internal server error.' }] });
    }
};

export const registerOwner = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name } = req.body;

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ message: 'Registrasi gagal', errors: [{ msg: 'Email sudah terdaftar.' }] });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const referralCode = generateReferralCode();

        const newUser = await prisma.user.create({
            data: {
                email,
                passwordHash: hashedPassword,
                name,
                role: ROLES.OWNER,
                referralCode,
            },
        });

        // Tidak mengembalikan passwordHash
        const { passwordHash, ...userWithoutPassword } = newUser;
        res.status(201).json({ message: 'Registrasi Owner berhasil', user: userWithoutPassword });

    } catch (error) {
        console.error("Register Owner error:", error);
        if (error.code === 'P2002' && error.meta?.target?.includes('referralCode')) {
            // Jarang terjadi, tapi handle jika referral code duplikat
            return res.status(500).json({ message: 'Registrasi gagal', errors: [{ msg: 'Gagal membuat kode referral unik, silakan coba lagi.' }] });
        }
        res.status(500).json({ message: 'Registrasi gagal', errors: [{ msg: 'Terjadi kesalahan pada server.' }] });
    }
};

export const registerStaffWithReferral = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, referralCode: ownerReferralCode } = req.body;

    try {
        const referringOwner = await prisma.user.findUnique({ where: { referralCode: ownerReferralCode } });
        if (!referringOwner || referringOwner.role !== ROLES.OWNER) {
            return res.status(400).json({ message: 'Registrasi gagal', errors: [{ msg: 'Kode referral tidak valid atau bukan milik Owner.' }] });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ message: 'Registrasi gagal', errors: [{ msg: 'Email sudah terdaftar.' }] });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        // Staff juga bisa punya referral code sendiri jika diinginkan, atau bisa null/kosong
        const staffReferralCode = generateReferralCode();

        const newStaff = await prisma.user.create({
            data: { email, passwordHash: hashedPassword, name, role: ROLES.STAFF, referredByCode: ownerReferralCode, referralCode: staffReferralCode },
        });
        const { passwordHash, ...userWithoutPassword } = newStaff;
        res.status(201).json({ message: 'Registrasi Staff berhasil', user: userWithoutPassword });
    } catch (error) {
        console.error("Register Staff error:", error);
        res.status(500).json({ message: 'Registrasi gagal', errors: [{ msg: 'Terjadi kesalahan pada server.' }] });
    }
};

export const getUserProfile = (req, res) => {
    // req.user diisi oleh middleware authenticateToken
    res.json({
        message: `Selamat datang di profil Anda, ${req.user.name}!`,
        user: req.user,
    });
};

export const getAdminDashboardData = (req, res) => {
    res.json({
        message: 'Selamat datang di Dashboard Admin, Owner!',
        data: 'Informasi rahasia khusus owner.',
    });
};

export const getStaffTasksData = (req, res) => {
    res.json({
        message: `Halo ${req.user.name}, ini adalah daftar tugas Anda.`,
        tasks: ['Selesaikan laporan', 'Hubungi klien', 'Perbarui sistem'],
    });
};