import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import prisma from '../config/prismaClient.js';
import { ROLES } from '../config/constants.js';

const JWT_SECRET = process.env.JWT_SECRET;

// Helper function to generate a random referral code
function generateReferralCode(length = 8) {
    return Math.random().toString(36).substring(2, 2 + length).toUpperCase();
}

// Common select clause for user profile data to ensure consistency
const userProfileSelect = {
    id: true,
    email: true,
    name: true,
    role: true,
    bio: true,
    profilePictureUrl: true,
    backgroundProfilePictureUrl: true,
    referralCode: true,
    referredByCode: true,
    createdAt: true,
    updatedAt: true,
    storeId: true, // Added for multi-store
    store: {        // Added for multi-store: includes details of the store the user belongs to
        select: { id: true, name: true }
    }
};

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
            include: { store: { select: { id: true, name: true } } } // Include store info
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
            storeId: user.storeId, // Use storeId from the user record
            storeName: user.store ? user.store.name : null, // Get storeName from the related store object
            referralCode: user.referralCode, // User's own referral code
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

    const { email, password, name, storeName } = req.body; // 'store' from body is now 'storeName'

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ message: 'Registrasi gagal', errors: [{ msg: 'Email sudah terdaftar.' }] });
        }
        if (!storeName || storeName.trim() === '') {
            return res.status(400).json({ message: 'Registrasi gagal', errors: [{ msg: 'Nama toko diperlukan.' }] });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const ownerReferralCode = generateReferralCode();

        // Create User and their new Store in a transaction
        // This assumes User model has `ownedStore Store? @relation("OwnedStore")`
        // and Store model has `owner User @relation("OwnedStore", fields: [ownerId], references: [id])`
        // and `ownerId Int @unique`
        const createdOwnerAndStore = await prisma.user.create({
            data: {
                email,
                passwordHash: hashedPassword,
                name,
                role: ROLES.OWNER,
                referralCode: ownerReferralCode,
                // Create and connect the store this owner owns and belongs to
                ownedStore: { // Relation field on User model for the store they own
                    create: {
                        name: storeName,
                    }
                }
            },
            include: {
                ownedStore: { select: { id: true, name: true } }, // Get the created store's ID and name
            }
        });

        // Now, explicitly set the user's `storeId` to link them to the store they just created
        // This `storeId` is for the general "StoreMembership" relation
        const finalOwnerUser = await prisma.user.update({
            where: { id: createdOwnerAndStore.id },
            data: {
                storeId: createdOwnerAndStore.ownedStore.id
            },
            select: userProfileSelect // Use the common select for response consistency
        });

        res.status(201).json({ message: 'Registrasi Owner dan Toko berhasil', user: finalOwnerUser });

    } catch (error) {
        console.error("Register Owner error:", error);
        if (error.code === 'P2002') { // Unique constraint violation
            const target = error.meta?.target;
            if (target && (target.includes('referralCode') || (typeof target === 'string' && target.endsWith('_referralCode_key')))) {
                return res.status(500).json({ message: 'Registrasi gagal', errors: [{ msg: 'Gagal membuat kode referral unik untuk pengguna, silakan coba lagi.' }] });
            } else if (target && (target.includes('name') || (typeof target === 'string' && target.endsWith('_name_key'))) && error.message.toLowerCase().includes('store')) { // Heuristic for store name
                return res.status(409).json({ message: 'Registrasi gagal', errors: [{ msg: 'Nama toko sudah digunakan.' }] });
            }
            return res.status(409).json({ message: 'Registrasi gagal', errors: [{ msg: 'Data yang dimasukkan sudah ada atau tidak unik.' }] });
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
        const referringOwner = await prisma.user.findUnique({
            where: { referralCode: ownerReferralCode },
            select: { id: true, role: true, storeId: true } // Select storeId of the owner
        });
        if (!referringOwner || referringOwner.role !== ROLES.OWNER || !referringOwner.storeId) {
            return res.status(400).json({ message: 'Registrasi gagal', errors: [{ msg: 'Kode referral tidak valid, bukan milik Owner, atau Owner tidak memiliki toko terdaftar.' }] });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ message: 'Registrasi gagal', errors: [{ msg: 'Email sudah terdaftar.' }] });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        // const staffReferralCode = generateReferralCode(); // Staff tidak lagi memiliki kode referral sendiri

        const newStaff = await prisma.user.create({
            data: { 
                email, 
                passwordHash: hashedPassword, 
                name, 
                role: ROLES.STAFF, 
                referredByCode: ownerReferralCode, 
                // referralCode: staffReferralCode, // Hapus field ini untuk staff
                storeId: referringOwner.storeId, // Assign staff to the referring owner's store
            },
            select: userProfileSelect // Use the common select for response consistency
        });

        // Setelah staff berhasil dibuat, update kode referral owner
        let ownerReferralCodeUpdated = false;
        let attempts = 0;
        const maxAttempts = 5; // Batas percobaan untuk menghasilkan kode unik

        while (!ownerReferralCodeUpdated && attempts < maxAttempts) {
            const newOwnerReferralCode = generateReferralCode();
            try {
                await prisma.user.update({
                    where: { id: referringOwner.id },
                    data: { referralCode: newOwnerReferralCode },
                });
                ownerReferralCodeUpdated = true;
                console.log(`Referral code for owner ${referringOwner.id} updated to ${newOwnerReferralCode} after staff registration.`);
            } catch (updateError) {
                if (updateError.code === 'P2002' && updateError.meta?.target?.includes('referralCode')) {
                    // Pelanggaran batasan unik untuk referralCode, coba lagi dengan kode baru
                    console.warn(`Generated new referral code ${newOwnerReferralCode} for owner ${referringOwner.id} already exists. Retrying...`);
                    attempts++;
                } else {
                    // Error lain saat update, log dan hentikan percobaan update kode referral owner
                    console.error(`Error updating referral code for owner ${referringOwner.id}:`, updateError);
                    break; // Keluar dari loop jika error bukan karena duplikasi kode
                }
            }
        }

        if (!ownerReferralCodeUpdated && attempts >= maxAttempts) {
            console.error(`Failed to update owner ${referringOwner.id} with a new unique referral code after ${maxAttempts} attempts. Staff registration was still successful.`);
        }

        res.status(201).json({ message: 'Registrasi Staff berhasil', user: newStaff });
    } catch (error) {
        console.error("Register Staff error:", error);
        if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
            // Seharusnya sudah ditangani oleh pengecekan existingUser, tapi sebagai fallback
            return res.status(409).json({ message: 'Registrasi gagal', errors: [{ msg: 'Email sudah terdaftar.' }] });
        // } // Komentari atau hapus blok ini karena staff tidak lagi memiliki referralCode yang unik
        // if (error.code === 'P2002' && error.meta?.target?.includes('referralCode')) {
            // return res.status(500).json({ message: 'Registrasi gagal', errors: [{ msg: 'Gagal membuat kode referral unik untuk staff, silakan coba lagi.' }] });
        }
        res.status(500).json({ message: 'Registrasi gagal', errors: [{ msg: 'Terjadi kesalahan pada server.' }] });
    }
};

export const getUserProfile = async (req, res) => {
    const userId = req.user.id; // Diambil dari token setelah autentikasi

    try {
        const userProfile = await prisma.user.findUnique({
            where: { id: userId },
            select: userProfileSelect, // Use the common select clause
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
            select: userProfileSelect, // Use the common select clause
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
            select: userProfileSelect, // Use the common select clause
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
            select: userProfileSelect, // Use the common select clause
        });
        res.json({ message: 'Gambar background profil berhasil diperbarui.', user: updatedUser });
    } catch (error) {
        console.error("Update background cover error:", error);
        res.status(500).json({ message: 'Gagal memperbarui gambar background profil.', errors: [{ msg: 'Terjadi kesalahan pada server.' }] });
    }
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