import prisma from '../config/prismaClient.js';
import { validationResult } from 'express-validator';

// Create a new category
export const createCategory = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name } = req.body;
    const storeId = req.user.storeId; // Diambil dari token JWT pengguna yang login

    if (!storeId) {
        return res.status(403).json({ message: 'Akses ditolak', errors: [{ msg: 'Pengguna tidak terkait dengan toko manapun.' }] });
    }

    try {
        // Cek apakah kategori dengan nama yang sama sudah ada dan tidak di-soft-delete
        const existingCategory = await prisma.category.findFirst({
            where: {
                name: name,
                storeId: storeId,
                deletedAt: null, // Hanya cek kategori yang aktif
            },
        });

        if (existingCategory) {
            return res.status(409).json({ message: 'Gagal membuat kategori', errors: [{ msg: 'Kategori dengan nama ini sudah ada di toko Anda.' }] });
        }

        const newCategory = await prisma.category.create({
            data: { name, storeId },
        });
        res.status(201).json(newCategory);
    } catch (error) {
        // P2002 adalah kode error Prisma untuk unique constraint violation
        // Ini sebagai fallback jika pengecekan `existingCategory` di atas terlewat (seharusnya tidak terjadi jika logika di atas benar)
        if (error.code === 'P2002' && error.meta?.target?.includes('name') && error.meta?.target?.includes('storeId')) {
            return res.status(409).json({ message: 'Gagal membuat kategori', errors: [{ msg: 'Kategori dengan nama ini sudah ada di toko Anda (DB constraint).' }] });
        }
        console.error("Create category error:", error);
        res.status(500).json({ message: 'Gagal membuat kategori', errors: [{ msg: 'Terjadi kesalahan pada server.' }] });
    }
};

// Get all categories (excluding soft-deleted)
export const getAllCategories = async (req, res) => {
    const storeId = req.user.storeId;

    if (!storeId) {
        return res.status(403).json({ message: 'Akses ditolak', errors: [{ msg: 'Pengguna tidak terkait dengan toko manapun.' }] });
    }
    try {
        const categories = await prisma.category.findMany({
            where: {
                deletedAt: null, // Hanya ambil kategori yang tidak di-soft-delete
                storeId: storeId, // Filter berdasarkan toko pengguna
            },
            orderBy: {
                name: 'asc', // Urutkan berdasarkan nama
            },
        });
        res.json(categories);
    } catch (error) {
        console.error("Get all categories error:", error);
        res.status(500).json({ message: 'Gagal mengambil data kategori', errors: [{ msg: 'Terjadi kesalahan pada server.' }] });
    }
};

// Get a single category by ID (excluding soft-deleted)
export const getCategoryById = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const storeId = req.user.storeId;

    if (!storeId) {
        return res.status(403).json({ message: 'Akses ditolak', errors: [{ msg: 'Pengguna tidak terkait dengan toko manapun.' }] });
    }
    try {
        const category = await prisma.category.findFirst({
            where: {
                id: parseInt(id),
                deletedAt: null, // Hanya ambil jika tidak di-soft-delete
                storeId: storeId, // Pastikan kategori milik toko pengguna
            },
        });

        if (!category) {
            return res.status(404).json({ message: 'Kategori tidak ditemukan', errors: [{ msg: 'Kategori tidak ditemukan atau sudah dihapus.' }] });
        }
        res.json(category);
    } catch (error) {
        console.error("Get category by ID error:", error);
        res.status(500).json({ message: 'Gagal mengambil data kategori', errors: [{ msg: 'Terjadi kesalahan pada server.' }] });
    }
};

// Update a category
export const updateCategory = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name } = req.body;
    const storeId = req.user.storeId;

    if (!storeId) {
        return res.status(403).json({ message: 'Akses ditolak', errors: [{ msg: 'Pengguna tidak terkait dengan toko manapun.' }] });
    }

    try {
        // Pastikan kategori yang akan diupdate ada dan belum di-soft-delete
        const existingCategory = await prisma.category.findFirst({
            where: { id: parseInt(id), deletedAt: null, storeId: storeId }
        });

        if (!existingCategory) {
            return res.status(404).json({ message: 'Gagal memperbarui kategori', errors: [{ msg: 'Kategori tidak ditemukan atau sudah dihapus.' }] });
        }

        const updatedCategory = await prisma.category.update({
            where: { 
                id: parseInt(id),
                // storeId: storeId // Sebenarnya tidak perlu di where update jika sudah dicek di existingCategory
            },
            data: { name },
        });
        res.json(updatedCategory);
    } catch (error) {
        // P2002 untuk @@unique([name, storeId])
        if (error.code === 'P2002' && error.meta?.target?.includes('name') && error.meta?.target?.includes('storeId')) { 
            return res.status(409).json({ message: 'Gagal memperbarui kategori', errors: [{ msg: 'Kategori lain dengan nama ini sudah ada di toko Anda.' }] });
        }
        // P2025 jika record tidak ditemukan (seharusnya sudah ditangani oleh existingCategory)
        if (error.code === 'P2025') {
            return res.status(409).json({ message: 'Gagal memperbarui kategori', errors: [{ msg: 'Kategori lain dengan nama ini sudah ada.' }] });
        }
        console.error("Update category error:", error);
        res.status(500).json({ message: 'Gagal memperbarui kategori', errors: [{ msg: 'Terjadi kesalahan pada server.' }] });
    }
};

// Soft delete a category
export const deleteCategory = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const storeId = req.user.storeId;

    if (!storeId) {
        return res.status(403).json({ message: 'Akses ditolak', errors: [{ msg: 'Pengguna tidak terkait dengan toko manapun.' }] });
    }

    try {
        // Pastikan kategori yang akan dihapus ada dan belum di-soft-delete
        const existingCategory = await prisma.category.findFirst({
            where: { id: parseInt(id), deletedAt: null, storeId: storeId }
        });

        if (!existingCategory) {
            return res.status(404).json({ message: 'Gagal menghapus kategori', errors: [{ msg: 'Kategori tidak ditemukan atau sudah dihapus.' }] });
        }

        await prisma.category.update({
            where: { 
                id: parseInt(id),
                // storeId: storeId // Tidak perlu di where update jika sudah dicek
            },
            data: { deletedAt: new Date() }, // Set deletedAt ke waktu sekarang
        });

        // Pertimbangan: Apa yang terjadi dengan menu yang terkait dengan kategori ini?
        // Opsi 1: Biarkan saja (menu.categoryId akan menunjuk ke kategori yang soft-deleted).
        // Opsi 2: Set menu.categoryId menjadi null.
        //         await prisma.menu.updateMany({ where: { categoryId: parseInt(id) }, data: { categoryId: null } });
        // Opsi 3: Soft delete juga semua menu di bawah kategori ini (jika aturan bisnisnya begitu).
        //         await prisma.menu.updateMany({ where: { categoryId: parseInt(id) }, data: { deletedAt: new Date() } });
        // Untuk saat ini, kita biarkan saja (Opsi 1).

        res.status(204).send(); // No Content, standar untuk operasi delete yang sukses
    } catch (error) {
        // P2025 adalah kode error Prisma jika record yang akan diupdate/delete tidak ditemukan
        // Seharusnya sudah ditangani oleh pengecekan `existingCategory` di atas.
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Gagal menghapus kategori', errors: [{ msg: 'Kategori tidak ditemukan untuk dihapus.' }] });
        }
        console.error("Delete category error:", error);
        res.status(500).json({ message: 'Gagal menghapus kategori', errors: [{ msg: 'Terjadi kesalahan pada server.' }] });
    }
};
