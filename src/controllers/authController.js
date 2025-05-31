import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import prisma from '../config/prismaClient.js';
import { ROLES } from '../config/constants.js';

const JWT_SECRET = process.env.JWT_SECRET ;

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
            store: user.store,
            referralCode: user.referralCode,
            referredByCode: user.referredByCode, // Tambahkan jika ingin ada di token
        };

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1d' });

        // Mengatur token sebagai HTTP-only cookie
        res.cookie('token', token, {
            httpOnly: true, // Cookie tidak dapat diakses oleh JavaScript sisi klien
            secure: process.env.NODE_ENV === 'production', // Kirim hanya melalui HTTPS di produksi
            sameSite: 'strict', // Mencegah serangan CSRF
            maxAge: 24 * 60 * 60 * 1000 // 1 hari, sama dengan expiresIn token
        });

        res.json({
            message: 'Login berhasil',
            // Token tidak lagi dikirim di body jika menggunakan httpOnly cookie
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

    const { email, password, name, store } = req.body;

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
                store,
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
        // Jika staff tidak dimaksudkan memiliki referral code sendiri, kita bisa set ke null
        // const staffReferralCode = generateReferralCode(); 

        const newStaff = await prisma.user.create({
            data: { 
                email, 
                passwordHash: hashedPassword, 
                name, role: ROLES.STAFF, 
                referredByCode: ownerReferralCode, 
                referralCode: null, // Atau tidak menyertakan field ini jika schema mengizinkan (String? berarti boleh null)
                store: referringOwner.store },
        });
        const { passwordHash, ...userWithoutPassword } = newStaff;
        res.status(201).json({ message: 'Registrasi Staff berhasil', user: userWithoutPassword });
    } catch (error) {
        console.error("Register Staff error:", error);
        res.status(500).json({ message: 'Registrasi gagal', errors: [{ msg: 'Terjadi kesalahan pada server.' }] });
    }
};

export const getUserProfile = async (req, res) => {
    const userId = req.user.id; // Diambil dari token setelah autentikasi

    try {
        const userProfile = await prisma.user.findUnique({
            where: { id: userId },
            select: { // Pilih field yang ingin dikembalikan, hindari passwordHash
                id: true,
                email: true,
                name: true,
                role: true,
                store: true,
                referralCode: true,
                referredByCode: true, 
                bio: true,
                profilePictureUrl: true,
                backgroundProfilePictureUrl: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!userProfile) {
            // Seharusnya tidak terjadi jika token valid dan pengguna ada
            return res.status(404).json({ message: 'Profil pengguna tidak ditemukan.' });
        }

        res.json({
            message: `Selamat datang di profil Anda, ${userProfile.name}!`,
            user: userProfile,
        });
    } catch (error) {
        console.error("Get user profile error:", error);
        res.status(500).json({ message: 'Gagal mengambil profil pengguna.', errors: [{ msg: 'Terjadi kesalahan pada server.' }] });
    }
};

export const updateUserProfile = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const { name, bio } = req.body; // profilePictureUrl tidak lagi diambil langsung dari body jika menggunakan file upload

    const dataToUpdate = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (bio !== undefined) dataToUpdate.bio = bio;

    // Sekarang fungsi ini hanya mengupdate field teks.
    // Jika tidak ada field teks yang diberikan, kembalikan error.
    if (Object.keys(dataToUpdate).length === 0) {
        return res.status(400).json({ message: 'Tidak ada data teks untuk diperbarui.', errors: [{ msg: 'Tidak ada field teks (nama/bio) yang diberikan untuk pembaruan.' }] });
    }

    try {
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: dataToUpdate,
            select: { // Pilih field yang ingin dikembalikan
                id: true, email: true, name: true, role: true, store: true,
                bio: true, profilePictureUrl: true, backgroundProfilePictureUrl: true,
                referralCode: true, referredByCode: true,
                createdAt: true, updatedAt: true
            },
        });
        res.json({ message: 'Profil berhasil diperbarui.', user: updatedUser });
    } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({ message: 'Gagal memperbarui profil.', errors: [{ msg: 'Terjadi kesalahan pada server.' }] });
    }
};

export const updateUserProfilePicture = async (req, res) => {
    const userId = req.user.id;
    const dataToUpdate = {};

    // Cek file gambar profil yang diunggah (hasil dari multer.single('profilePicture'))
    if (req.file && req.file.fieldname === 'profilePicture') {
        // combinedStorage akan menempatkannya di 'public/uploads/profile_pictures/'
        dataToUpdate.profilePictureUrl = `/uploads/profile_pictures/${req.file.filename}`;
    } else {
        return res.status(400).json({ message: 'Tidak ada file gambar profil yang diunggah.', errors: [{ msg: 'File gambar profil diperlukan.' }] });
    }

    try {
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: dataToUpdate,
            select: { // Pilih field yang ingin dikembalikan, sama seperti getUserProfile
                id: true, email: true, name: true, role: true, store: true,
                bio: true, profilePictureUrl: true, backgroundProfilePictureUrl: true,
                referralCode: true, referredByCode: true,
                createdAt: true, updatedAt: true
            },
        });
        res.json({ message: 'Gambar profil berhasil diperbarui.', user: updatedUser });
    } catch (error) {
        console.error("Update profile picture error:", error);
        res.status(500).json({ message: 'Gagal memperbarui gambar profil.', errors: [{ msg: 'Terjadi kesalahan pada server.' }] });
    }
};



export const updateUserBackgroundCover = async (req, res) => {
    const userId = req.user.id;
    const dataToUpdate = {};

    // Cek file background cover yang diunggah (hasil dari multer.single('backgroundProfilePicture'))
    // Pastikan fieldname di multer route adalah 'backgroundProfilePicture'
    if (req.file && req.file.fieldname === 'backgroundProfilePicture') {
        // combinedStorage akan menempatkannya di 'public/uploads/background_profile_pictures/'
        dataToUpdate.backgroundProfilePictureUrl = `/uploads/background_profile_pictures/${req.file.filename}`;
    } else {
        return res.status(400).json({ message: 'Tidak ada file gambar background yang diunggah.', errors: [{ msg: 'File gambar background diperlukan.' }] });
    }

    try {
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: dataToUpdate,
            select: { // Pilih field yang ingin dikembalikan, sama seperti getUserProfile
                id: true, email: true, name: true, role: true, store: true,
                bio: true, profilePictureUrl: true, backgroundProfilePictureUrl: true,
                referralCode: true, referredByCode: true,
                createdAt: true, updatedAt: true
            },
        });
        res.json({ message: 'Gambar background profil berhasil diperbarui.', user: updatedUser });
    } catch (error) {
        console.error("Update background cover error:", error);
        res.status(500).json({ message: 'Gagal memperbarui gambar background profil.', errors: [{ msg: 'Terjadi kesalahan pada server.' }] });
    }
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

export const logoutUser = (req, res) => {
    // Opsi cookie harus cocok dengan yang digunakan saat mengatur cookie
    // terutama path dan domain jika disetel (default path adalah '/')
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    };

    // Hapus cookie 'token'
    res.clearCookie('token', cookieOptions);

    res.status(200).json({ message: 'Logout berhasil' });
};